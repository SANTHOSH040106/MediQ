import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Appointment {
  id: string;
  user_id: string;
  doctor_id: string;
  hospital_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: string;
  token_number: number | null;
  queue_position: number | null;
  special_instructions: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useAppointments = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["appointments", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      const { data, error } = await supabase
        .from("appointments")
        .select("*, doctors(*), hospitals(*)")
        .eq("user_id", userId)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useAppointmentById = (id: string | undefined) => {
  return useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      if (!id) throw new Error("Appointment ID is required");

      const { data, error } = await supabase
        .from("appointments")
        .select("*, doctors(*), hospitals(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentData: {
      doctor_id: string;
      hospital_id: string;
      appointment_date: string;
      appointment_time: string;
      appointment_type: string;
      special_instructions?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get next token number
      const { data: tokenData } = await supabase.rpc("get_next_token_number", {
        p_doctor_id: appointmentData.doctor_id,
        p_date: appointmentData.appointment_date,
      });

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          ...appointmentData,
          user_id: user.id,
          token_number: tokenData || 1,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked successfully!");
    },
    onError: (error) => {
      toast.error("Failed to book appointment: " + error.message);
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment cancelled successfully!");
    },
    onError: (error) => {
      toast.error("Failed to cancel appointment: " + error.message);
    },
  });
};
