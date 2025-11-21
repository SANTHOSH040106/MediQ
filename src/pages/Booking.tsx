import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { useDoctorById } from "@/hooks/useDoctors";
import { useAvailableSlots } from "@/hooks/useTimeSlots";
import { useCreateAppointment } from "@/hooks/useAppointments";

const Booking = () => {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctor");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("consultation");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const { data: doctorData, isLoading: doctorLoading } = useDoctorById(doctorId || undefined);
  const { data: availableSlots = [], isLoading: slotsLoading } = useAvailableSlots(
    doctorId || undefined,
    selectedDate?.toISOString().split('T')[0]
  );
  const createAppointment = useCreateAppointment();

  const doctor = doctorData;
  const hospital = doctorData?.hospitals;
  const loading = doctorLoading;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleBooking = async () => {
    if (!user || !doctor || !hospital) {
      navigate("/auth");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({
        title: "Incomplete Information",
        description: "Please select both date and time",
        variant: "destructive",
      });
      return;
    }

    createAppointment.mutate(
      {
        doctor_id: doctorId!,
        hospital_id: hospital.id,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: selectedTime,
        appointment_type: appointmentType,
        special_instructions: specialInstructions,
      },
      {
        onSuccess: () => navigate("/appointments"),
      }
    );
  };

  if (loading || authLoading || !user) {
    return (
      <MainLayout>
        <div className="container py-6">
          <div className="text-center">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!doctor || !hospital) {
    return (
      <MainLayout>
        <div className="container py-6">
          <div className="text-center">Doctor not found</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Book Appointment</h1>

        {/* Doctor Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {doctor.photo && (
                <img
                  src={doctor.photo}
                  alt={doctor.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{doctor.name}</h3>
                <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                <p className="text-sm text-muted-foreground">{hospital.name}</p>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>₹{doctor.consultation_fee}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <div className="text-center py-4">Loading available slots...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {selectedDate ? "No slots available for selected date" : "Please select a date first"}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.slot_time}
                    variant={selectedTime === slot.slot_time ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedTime(slot.slot_time)}
                    disabled={slot.is_booked}
                  >
                    {slot.slot_time}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointment Type */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appointment Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={appointmentType} onValueChange={setAppointmentType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="consultation" id="consultation" />
                <Label htmlFor="consultation">New Consultation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="follow-up" id="follow-up" />
                <Label htmlFor="follow-up">Follow-up</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="emergency" id="emergency" />
                <Label htmlFor="emergency">Emergency</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Special Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any special requirements or symptoms you'd like to mention..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleBooking}
            disabled={createAppointment.isPending || !selectedDate || !selectedTime}
          >
            {createAppointment.isPending ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Booking;