import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, MapPin, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";

const Appointments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchAppointments();
    }
  }, [user, authLoading]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          doctors (*),
          hospitals (*)
        `)
        .eq("user_id", user?.id)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const filterAppointments = (status: string) => {
    if (status === "all") return appointments;
    if (status === "upcoming") {
      return appointments.filter((apt) => 
        apt.status === "scheduled" || apt.status === "confirmed"
      );
    }
    return appointments.filter((apt) => apt.status === status);
  };

  const AppointmentCard = ({ appointment }: { appointment: any }) => (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => navigate(`/appointment/${appointment.id}`)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            {appointment.doctors?.photo && (
              <img
                src={appointment.doctors.photo}
                alt={appointment.doctors.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {appointment.doctors?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {appointment.doctors?.specialization}
              </p>
              <p className="text-sm text-muted-foreground">
                {appointment.hospitals?.name}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(appointment.appointment_date), "PP")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{appointment.appointment_time}</span>
          </div>
        </div>

        {appointment.token_number && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm">
              <span className="font-medium">Token: </span>
              <span className="text-primary font-semibold">
                #{appointment.token_number}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="container py-6">
          <div className="text-center">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <Button onClick={() => navigate("/search")}>
            <Plus className="h-4 w-4 mr-2" />
            Book New
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {filterAppointments("upcoming").length > 0 ? (
              filterAppointments("upcoming").map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <EmptyState message="No upcoming appointments" />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {filterAppointments("completed").length > 0 ? (
              filterAppointments("completed").map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <EmptyState message="No past appointments" />
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 mt-6">
            {filterAppointments("cancelled").length > 0 ? (
              filterAppointments("cancelled").map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <EmptyState message="No cancelled appointments" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Appointments;
