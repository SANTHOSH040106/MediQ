import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";

export interface DoctorSuggestion {
  id: string;
  name: string;
  specialization: string;
  hospital_id: string;
  hospital_name?: string;
  photo: string | null;
  type: "doctor";
}

export interface HospitalSuggestion {
  id: string;
  name: string;
  city: string;
  address: string;
  type: "hospital";
}

export type SearchSuggestion = DoctorSuggestion | HospitalSuggestion;

interface UseSearchSuggestionsOptions {
  query: string;
  enabled?: boolean;
  debounceMs?: number;
}

export const useSearchSuggestions = ({
  query,
  enabled = true,
  debounceMs = 300,
}: UseSearchSuggestionsOptions) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const shouldFetch = enabled && debouncedQuery.trim().length >= 2;

  // Fetch doctors
  const doctorsQuery = useQuery({
    queryKey: ["search-suggestions", "doctors", debouncedQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_doctors", {
        search_text: debouncedQuery,
        limit_count: 5,
        offset_count: 0,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: shouldFetch,
    staleTime: 30000,
  });

  // Fetch hospitals
  const hospitalsQuery = useQuery({
    queryKey: ["search-suggestions", "hospitals", debouncedQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_hospitals", {
        search_text: debouncedQuery,
        limit_count: 4,
        offset_count: 0,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: shouldFetch,
    staleTime: 30000,
  });

  // Combine and format suggestions
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const doctors: DoctorSuggestion[] = (doctorsQuery.data || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      hospital_id: doc.hospital_id,
      photo: doc.photo,
      type: "doctor" as const,
    }));

    const hospitals: HospitalSuggestion[] = (hospitalsQuery.data || []).map((hosp: any) => ({
      id: hosp.id,
      name: hosp.name,
      city: hosp.city,
      address: hosp.address,
      type: "hospital" as const,
    }));

    // Interleave results: doctors first, then hospitals
    return [...doctors, ...hospitals].slice(0, 8);
  }, [doctorsQuery.data, hospitalsQuery.data]);

  const isLoading = shouldFetch && (doctorsQuery.isLoading || hospitalsQuery.isLoading);
  const isEmpty = shouldFetch && !isLoading && suggestions.length === 0;

  return {
    suggestions,
    isLoading,
    isEmpty,
    query: debouncedQuery,
  };
};
