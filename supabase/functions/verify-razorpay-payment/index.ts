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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      appointmentData 
    } = await req.json();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment verification data');
    }

    if (!appointmentData || !appointmentData.doctor_id || !appointmentData.hospital_id) {
      throw new Error('Missing appointment data');
    }

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      throw new Error('Razorpay secret not configured');
    }

    // SECURITY: Require valid authentication - no fallbacks
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the JWT token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Invalid auth token:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);
    console.log('Verifying Razorpay payment:', razorpay_payment_id);

    // Verify Razorpay signature - this is the cryptographic security mechanism
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
      return new Response(
        JSON.stringify({ error: 'Payment verification failed - invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment verified successfully');

    // Use service role client for database operations
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get next token number
    const { data: tokenData, error: tokenError } = await serviceClient
      .rpc('get_next_token_number', {
        p_doctor_id: appointmentData.doctor_id,
        p_date: appointmentData.appointment_date,
      });

    if (tokenError) {
      console.error('Error getting token number:', tokenError);
      throw tokenError;
    }

    const tokenNumber = tokenData || 1;

    // Create appointment - using the verified user ID from JWT, not from request body
    const { data: appointment, error: appointmentError } = await serviceClient
      .from('appointments')
      .insert({
        user_id: userId, // Using verified user ID from JWT
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

    // Record payment in payments table
    const { error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        user_id: userId, // Using verified user ID from JWT
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

    // Get user email and doctor/hospital details for notification
    try {
      // Get user email from auth
      const { data: { user: authUser } } = await serviceClient.auth.admin.getUserById(userId);
      const userEmail = authUser?.email;

      // Get user profile for patient name
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const patientName = profile?.full_name || authUser?.email || 'Patient';

      // Get doctor and hospital details
      const { data: doctor } = await serviceClient
        .from('doctors')
        .select('name, specialization, email')
        .eq('id', appointmentData.doctor_id)
        .single();

      const { data: hospital } = await serviceClient
        .from('hospitals')
        .select('name, email')
        .eq('id', appointmentData.hospital_id)
        .single();

      const appointmentDetails = {
        doctor_name: doctor?.name || 'Doctor',
        hospital_name: hospital?.name || 'Hospital',
        patient_name: patientName,
        date: appointmentData.appointment_date,
        time: appointmentData.appointment_time,
        appointment_type: appointmentData.appointment_type || 'Consultation',
        token_number: tokenNumber,
      };

      // Send confirmation email to patient
      if (userEmail) {
        await serviceClient.functions.invoke('send-notification', {
          body: {
            user_id: userId,
            appointment_id: appointment.id,
            type: 'appointment_confirmation',
            title: 'Appointment Confirmed!',
            message: `Your appointment with ${doctor?.name || 'Doctor'} has been successfully booked for ${new Date(appointmentData.appointment_date).toLocaleDateString()} at ${appointmentData.appointment_time}.`,
            email_data: {
              recipient_email: userEmail,
              appointment_details: appointmentDetails,
            },
            is_internal_call: true, // Flag for internal service-to-service calls
          },
        });
        console.log('Confirmation email sent to patient:', userEmail);
      }

      // Send notification email to doctor
      if (doctor?.email) {
        await serviceClient.functions.invoke('send-notification', {
          body: {
            user_id: userId,
            appointment_id: appointment.id,
            type: 'new_appointment',
            title: 'New Appointment Scheduled',
            message: `A new appointment has been booked by ${patientName} for ${new Date(appointmentData.appointment_date).toLocaleDateString()} at ${appointmentData.appointment_time}.`,
            email_data: {
              recipient_email: doctor.email,
              appointment_details: appointmentDetails,
            },
            is_internal_call: true, // Flag for internal service-to-service calls
          },
        });
        console.log('Notification email sent to doctor:', doctor.email);
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't throw - appointment is already created
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
