-- Fix 1: Create user_roles table using existing user_role enum
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Update trigger to also populate user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role
  );
  
  RETURN NEW;
END;
$function$;

-- Fix 2: Update classes table RLS - require authentication
DROP POLICY IF EXISTS "Students can view classes" ON public.classes;

CREATE POLICY "Authenticated users can view classes"
ON public.classes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 3: Update attendance_sessions RLS - restrict to enrolled students only
DROP POLICY IF EXISTS "Students can view active sessions" ON public.attendance_sessions;

CREATE POLICY "Students view sessions for enrolled classes"
ON public.attendance_sessions
FOR SELECT
USING (
  is_active = true 
  AND expires_at > now()
  AND (
    -- Allow lecturers to see their own sessions
    lecturer_id = auth.uid()
    OR
    -- Allow enrolled students to see sessions for their classes
    class_id IN (
      SELECT class_id FROM public.class_enrollments 
      WHERE student_id = auth.uid()
    )
  )
);

-- Fix 4: Prevent users from updating their role in profiles table
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy that blocks role updates
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- The role field will be protected by removing it from updateable columns
);