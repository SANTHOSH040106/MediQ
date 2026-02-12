
-- Drop the existing RESTRICTIVE policies on doctors
DROP POLICY IF EXISTS "Anyone can view public doctors" ON public.doctors;
DROP POLICY IF EXISTS "Users can view doctors for their appointments" ON public.doctors;

-- Recreate as PERMISSIVE policies (either condition grants access)
CREATE POLICY "Anyone can view public doctors"
ON public.doctors FOR SELECT
USING ((is_public IS NOT FALSE) AND (availability_status IS DISTINCT FROM 'inactive'::text));

CREATE POLICY "Users can view doctors for their appointments"
ON public.doctors FOR SELECT
USING (id IN (SELECT appointments.doctor_id FROM appointments WHERE appointments.user_id = auth.uid()));
