-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can manage questions of own surveys" ON public.survey_questions;
DROP POLICY IF EXISTS "Anyone can submit responses to published surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Survey owners can view responses" ON public.survey_responses;

-- Policy for survey owners to manage their questions (INSERT, UPDATE, DELETE)
CREATE POLICY "Survey owners can manage questions"
ON public.survey_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_questions.survey_id
    AND surveys.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_questions.survey_id
    AND surveys.user_id = auth.uid()
  )
);

-- Policy for anyone to read questions of published surveys (for public survey taking)
CREATE POLICY "Anyone can read questions of published surveys"
ON public.survey_questions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_questions.survey_id
    AND surveys.is_published = true
  )
);

-- Policy for survey owners to view all responses to their surveys
CREATE POLICY "Survey owners can view responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_responses.survey_id
    AND surveys.user_id = auth.uid()
  )
);

-- Policy for anyone (including anonymous) to submit responses to published surveys
CREATE POLICY "Anyone can submit responses to published surveys"
ON public.survey_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_responses.survey_id
    AND surveys.is_published = true
  )
);

-- Add policy to allow reading published surveys publicly (for share code lookup)
CREATE POLICY "Anyone can view published surveys by share code"
ON public.surveys
FOR SELECT
TO anon, authenticated
USING (is_published = true AND share_code IS NOT NULL);