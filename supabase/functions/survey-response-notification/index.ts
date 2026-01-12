import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  survey_id: string;
  response_count: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { survey_id, response_count }: NotificationRequest = await req.json();

    // Get survey details
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("title, user_id")
      .eq("id", survey_id)
      .single();

    if (surveyError || !survey) {
      throw new Error("Survey not found");
    }

    // Get user email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(survey.user_id);

    if (userError || !userData.user?.email) {
      console.log("No user email found, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userEmail = userData.user.email;

    const emailResponse = await resend.emails.send({
      from: "Notifications <onboarding@resend.dev>",
      to: [userEmail],
      subject: `📊 Nouvelle réponse à votre enquête "${survey.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📊 Nouvelle Réponse!</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Bonjour,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Vous avez reçu une nouvelle réponse à votre enquête <strong>"${survey.title}"</strong>.
              </p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Nombre total de réponses</p>
                <p style="color: #111827; margin: 0; font-size: 32px; font-weight: bold;">${response_count}</p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Connectez-vous à votre tableau de bord pour consulter les résultats détaillés.
              </p>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Cet email a été envoyé automatiquement par votre système d'enquêtes.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in survey-response-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
