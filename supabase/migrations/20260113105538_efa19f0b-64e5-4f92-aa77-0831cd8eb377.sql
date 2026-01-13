-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Anyone can view published surveys by share code" ON public.surveys;
DROP POLICY IF EXISTS "Users can manage own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can read questions of published surveys" ON public.survey_questions;
DROP POLICY IF EXISTS "Survey owners can manage questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Anyone can submit responses to published surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Survey owners can view responses" ON public.survey_responses;

-- Recréer les politiques comme PERMISSIVE (par défaut) pour surveys
CREATE POLICY "Anyone can view published surveys by share code" 
ON public.surveys 
FOR SELECT 
TO anon, authenticated
USING ((is_published = true) AND (share_code IS NOT NULL));

CREATE POLICY "Users can manage own surveys" 
ON public.surveys 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recréer les politiques pour survey_questions
CREATE POLICY "Anyone can read questions of published surveys" 
ON public.survey_questions 
FOR SELECT 
TO anon, authenticated
USING (EXISTS ( SELECT 1
   FROM surveys
  WHERE ((surveys.id = survey_questions.survey_id) AND (surveys.is_published = true))));

CREATE POLICY "Survey owners can manage questions" 
ON public.survey_questions 
FOR ALL 
TO authenticated
USING (EXISTS ( SELECT 1
   FROM surveys
  WHERE ((surveys.id = survey_questions.survey_id) AND (surveys.user_id = auth.uid()))))
WITH CHECK (EXISTS ( SELECT 1
   FROM surveys
  WHERE ((surveys.id = survey_questions.survey_id) AND (surveys.user_id = auth.uid()))));

-- Recréer les politiques pour survey_responses
CREATE POLICY "Anyone can submit responses to published surveys" 
ON public.survey_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (EXISTS ( SELECT 1
   FROM surveys
  WHERE ((surveys.id = survey_responses.survey_id) AND (surveys.is_published = true))));

CREATE POLICY "Survey owners can view responses" 
ON public.survey_responses 
FOR SELECT 
TO authenticated
USING (EXISTS ( SELECT 1
   FROM surveys
  WHERE ((surveys.id = survey_responses.survey_id) AND (surveys.user_id = auth.uid()))));