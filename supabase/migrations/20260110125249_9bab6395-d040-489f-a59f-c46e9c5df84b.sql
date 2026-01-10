
-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey_questions table
CREATE TABLE public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  question_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey_responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id TEXT,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for surveys
CREATE POLICY "Users can manage own surveys" 
ON public.surveys 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for survey_questions
CREATE POLICY "Users can manage questions of own surveys" 
ON public.survey_questions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = survey_questions.survey_id 
    AND surveys.user_id = auth.uid()
  )
);

-- RLS policies for survey_responses
CREATE POLICY "Anyone can submit responses to published surveys" 
ON public.survey_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = survey_responses.survey_id 
    AND surveys.is_published = true
  )
);

CREATE POLICY "Survey owners can view responses" 
ON public.survey_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = survey_responses.survey_id 
    AND surveys.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_surveys_share_code ON public.surveys(share_code);

-- Trigger for updated_at
CREATE TRIGGER update_surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
