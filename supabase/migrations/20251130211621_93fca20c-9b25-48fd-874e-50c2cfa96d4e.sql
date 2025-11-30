-- Add phone number and duration to accounts table
ALTER TABLE public.accounts 
ADD COLUMN phone text,
ADD COLUMN duration_months integer,
ADD COLUMN notification_sent boolean DEFAULT false;

-- Create index for faster queries on accounts needing reminders
CREATE INDEX idx_accounts_created_duration ON public.accounts(created_at, duration_months) 
WHERE duration_months IS NOT NULL;

-- Function to automatically create reminders for accounts approaching expiration
CREATE OR REPLACE FUNCTION public.create_account_expiration_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_record RECORD;
  expiration_date timestamp with time zone;
  reminder_date timestamp with time zone;
BEGIN
  FOR account_record IN 
    SELECT id, name, user_id, created_at, duration_months, email, phone
    FROM public.accounts
    WHERE duration_months IS NOT NULL 
    AND notification_sent = false
  LOOP
    -- Calculate expiration date
    expiration_date := account_record.created_at + (account_record.duration_months || ' months')::interval;
    
    -- Calculate reminder date (1 month before expiration)
    reminder_date := expiration_date - interval '1 month';
    
    -- Only create reminder if we're within 1 month of expiration
    IF now() >= reminder_date AND now() < expiration_date THEN
      -- Check if reminder doesn't already exist
      IF NOT EXISTS (
        SELECT 1 FROM public.reminders 
        WHERE related_id = account_record.id 
        AND related_type = 'account'
        AND is_completed = false
      ) THEN
        -- Create the reminder
        INSERT INTO public.reminders (
          user_id,
          related_id,
          related_type,
          title,
          description,
          remind_at
        ) VALUES (
          account_record.user_id,
          account_record.id,
          'account',
          'Expiration du compte: ' || account_record.name,
          'Le compte expire le ' || to_char(expiration_date, 'DD/MM/YYYY') || '. Email: ' || COALESCE(account_record.email, 'Non défini') || ', Téléphone: ' || COALESCE(account_record.phone, 'Non défini'),
          reminder_date
        );
        
        -- Mark notification as sent
        UPDATE public.accounts 
        SET notification_sent = true 
        WHERE id = account_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;