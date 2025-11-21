import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: number;
  consultation_fee: number;
  rating: number | null;
  total_reviews: number | null;
  hospital_id: string;
  photo: string | null;
  availability_status: string | null;
  about?: string | null;
  education?: string | null;
  languages?: string[] | null;
}

interface UseDoctorsOptions {
  searchText?: string;
  specialization?: string;
  hospitalId?: string;
}

export const useDoctors = (options: UseDoctorsOptions = {}) => {
  return useQuery({
    queryKey: ["doctors", options],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_doctors", {
        search_text: options.searchText || null,
        specialization_filter: options.specialization || null,
        hospital_id_filter: options.hospitalId || null,
        limit_count: 20,
        offset_count: 0,
      });

      if (error) throw error;
      return data as Doctor[];
    },
  });
};

export const useDoctorById = (id: string | undefined) => {
  return useQuery({
    queryKey: ["doctor", id],
    queryFn: async () => {
      if (!id) throw new Error("Doctor ID is required");

      const { data, error } = await supabase
        .from("doctors")
        .select("*, hospitals(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useDoctorsByHospital = (hospitalId: string | undefined) => {
  return useQuery({
    queryKey: ["doctors", "hospital", hospitalId],
    queryFn: async () => {
      if (!hospitalId) throw new Error("Hospital ID is required");

      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("hospital_id", hospitalId)
        .neq("availability_status", "inactive");

      if (error) throw error;
      return data;
    },
    enabled: !!hospitalId,
  });
};
