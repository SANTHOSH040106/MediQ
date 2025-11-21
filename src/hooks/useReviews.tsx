import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Review {
  id: string;
  user_id: string;
  doctor_id: string | null;
  hospital_id: string | null;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}

export const useReviewsByDoctor = (doctorId: string | undefined) => {
  return useQuery({
    queryKey: ["reviews", "doctor", doctorId],
    queryFn: async () => {
      if (!doctorId) throw new Error("Doctor ID is required");

      const { data, error } = await supabase
        .from("reviews_ratings")
        .select("*, profiles(full_name)")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!doctorId,
  });
};

export const useReviewsByHospital = (hospitalId: string | undefined) => {
  return useQuery({
    queryKey: ["reviews", "hospital", hospitalId],
    queryFn: async () => {
      if (!hospitalId) throw new Error("Hospital ID is required");

      const { data, error } = await supabase
        .from("reviews_ratings")
        .select("*, profiles(full_name)")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!hospitalId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewData: {
      doctor_id?: string;
      hospital_id?: string;
      rating: number;
      review?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reviews_ratings")
        .insert({
          ...reviewData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["reviews", variables.doctor_id ? "doctor" : "hospital"] 
      });
      toast.success("Review submitted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to submit review: " + error.message);
    },
  });
};
