import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      appointmentData 
    } = await req.json();

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      throw new Error('Razorpay secret not configured');
    }

    console.log('Verifying Razorpay payment:', razorpay_payment_id);

    // Verify signature
    const crypto = await import("https://deno.land/std@0.177.0/crypto/mod.ts");
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const msgData = encoder.encode(text);
    
    const key = await crypto.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.crypto.subtle.sign("HMAC", key, msgData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Payment signature verification failed');
      throw new Error('Payment verification failed');
    }

    console.log('Payment verified successfully');

    // Get next token number
    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc('get_next_token_number', {
        p_doctor_id: appointmentData.doctor_id,
        p_date: appointmentData.appointment_date,
      });

    if (tokenError) {
      console.error('Error getting token number:', tokenError);
      throw tokenError;
    }

    const tokenNumber = tokenData || 1;

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        user_id: user.id,
        doctor_id: appointmentData.doctor_id,
        hospital_id: appointmentData.hospital_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        appointment_type: appointmentData.appointment_type,
        special_instructions: appointmentData.special_instructions,
        token_number: tokenNumber,
        status: 'confirmed',
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw appointmentError;
    }

    console.log('Appointment created successfully:', appointment.id);

    // Record payment in payments table using service role client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        user_id: user.id,
        appointment_id: appointment.id,
        amount: appointmentData.consultation_fee || 0,
        currency: 'INR',
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        status: 'completed',
        payment_method: 'razorpay',
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      // Don't throw - appointment is already created
    } else {
      console.log('Payment recorded successfully');
    }

    // Send notification
    try {
      await supabaseClient.functions.invoke('send-notification', {
        body: {
          userId: user.id,
          type: 'appointment_confirmation',
          appointmentId: appointment.id,
        },
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment,
        payment_id: razorpay_payment_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-razorpay-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});