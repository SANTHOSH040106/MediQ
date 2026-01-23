import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Calendar, Clock, User, Building2 } from "lucide-react";
import { RatingDialog } from "@/components/ratings/RatingDialog";
import { useCreateReview } from "@/hooks/useReviews";

interface BookingData {
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  hospitalId: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  specialInstructions: string;
  consultationFee: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingData] = useState<BookingData | null>(location.state?.bookingData || null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const createReview = useCreateReview();

  const handleRatingSubmit = async (rating: number, review: string) => {
    if (!bookingData) return;
    
    try {
      await createReview.mutateAsync({
        doctor_id: bookingData.doctorId,
        hospital_id: bookingData.hospitalId,
        rating,
        review: review || undefined,
      });
      setShowRatingDialog(false);
      navigate("/appointments");
    } catch (error) {
      // Error is handled by the mutation
      console.error("Rating submission error:", error);
    }
  };

  const handleRatingDialogClose = (open: boolean) => {
    if (!open) {
      setShowRatingDialog(false);
      navigate("/appointments");
    }
  };

  useEffect(() => {
    if (!bookingData) {
      toast({
        title: "No booking data",
        description: "Please start from the booking page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [bookingData, navigate, toast]);

  const handlePayment = async () => {
    if (!user || !bookingData) return;

    setIsProcessing(true);

    try {
      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount: bookingData.consultationFee,
            currency: 'INR',
            receipt: `apt_${Date.now()}`,
            notes: {
              doctor_id: bookingData.doctorId,
              hospital_id: bookingData.hospitalId,
              user_id: user.id,
            },
          },
        }
      );

      if (orderError) throw orderError;

      const order = orderData.order;

      // Initialize Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_default',
        amount: order.amount,
        currency: order.currency,
        name: 'MediQ',
        description: `Appointment with ${bookingData.doctorName}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // Verify payment and create appointment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  appointmentData: {
                    doctor_id: bookingData.doctorId,
                    hospital_id: bookingData.hospitalId,
                    appointment_date: bookingData.appointmentDate,
                    appointment_time: bookingData.appointmentTime,
                    appointment_type: bookingData.appointmentType,
                    special_instructions: bookingData.specialInstructions,
                    consultation_fee: bookingData.consultationFee,
                  },
                },
              }
            );

            if (verifyError) throw verifyError;

            toast({
              title: "Payment Successful",
              description: "Your appointment has been confirmed",
            });

            // Show rating dialog after successful payment
            setShowRatingDialog(true);
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support with your payment ID",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#2563EB",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment",
              variant: "destructive",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to initialize payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!bookingData) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Payment</h1>

        {/* Booking Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{bookingData.doctorName}</p>
                <p className="text-sm text-muted-foreground">{bookingData.doctorSpecialization}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">{bookingData.hospitalName}</p>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">
                {new Date(bookingData.appointmentDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">{bookingData.appointmentTime}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm font-medium capitalize">{bookingData.appointmentType}</span>
            </div>

            {bookingData.specialInstructions && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Special Instructions:</p>
                <p className="text-sm">{bookingData.specialInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Consultation Fee</span>
                <span className="font-medium">₹{bookingData.consultationFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-semibold">Total Amount</span>
                <span className="text-xl font-bold text-primary">₹{bookingData.consultationFee.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isProcessing ? "Processing..." : "Pay Now"}
          </Button>
        </div>

        {/* Rating Dialog */}
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={handleRatingDialogClose}
          doctorName={bookingData.doctorName}
          onSubmit={handleRatingSubmit}
          isSubmitting={createReview.isPending}
        />
      </div>
    </MainLayout>
  );
};

export default Payment;