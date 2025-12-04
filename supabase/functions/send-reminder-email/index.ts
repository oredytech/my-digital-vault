import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderEmailRequest {
  reminderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { reminderId }: ReminderEmailRequest = await req.json();

    console.log("Fetching reminder with id:", reminderId);

    // Get reminder details (without join)
    const { data: reminder, error: reminderError } = await supabaseClient
      .from("reminders")
      .select("*")
      .eq("id", reminderId)
      .single();

    if (reminderError) {
      console.error("Error fetching reminder:", reminderError);
      throw reminderError;
    }

    console.log("Reminder fetched:", reminder);

    // If related to an account, fetch account details separately
    let accountData = null;
    if (reminder.related_type === "account" && reminder.related_id) {
      const { data: account, error: accountError } = await supabaseClient
        .from("accounts")
        .select("name, email, phone")
        .eq("id", reminder.related_id)
        .single();

      if (!accountError && account) {
        accountData = account;
        console.log("Account fetched:", accountData);
      }
    }

    // Get the user's email from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("User error:", userError);
      throw new Error("User not found");
    }

    console.log("Sending email to:", user.email);

    const emailResponse = await resend.emails.send({
      from: "VaultKeep <onboarding@resend.dev>",
      to: [user.email || ""],
      subject: `⚠️ Rappel urgent: ${reminder.title}`,
      html: `
        <div style="font-family: 'Manrope', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #e2e8f0;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #06b6d4; font-size: 28px; margin-bottom: 10px;">🔒 VaultKeep</h1>
            <p style="color: #94a3b8; font-size: 14px;">Votre gestionnaire personnel sécurisé</p>
          </div>
          
          <div style="background-color: #1e293b; border-radius: 12px; padding: 25px; border-left: 4px solid #06b6d4;">
            <h2 style="color: #f1f5f9; font-size: 20px; margin-top: 0;">⚠️ Rappel urgent</h2>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 15px 0;">
              <strong style="color: #06b6d4;">${reminder.title}</strong>
            </p>
            
            ${reminder.description ? `
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 15px 0;">
                ${reminder.description}
              </p>
            ` : ''}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
              <p style="color: #94a3b8; font-size: 13px; margin: 5px 0;">
                📅 Date du rappel: <strong style="color: #e2e8f0;">${new Date(reminder.remind_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</strong>
              </p>
              
              ${accountData ? `
                <div style="margin-top: 15px; padding: 15px; background-color: #0f172a; border-radius: 8px;">
                  <p style="color: #06b6d4; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Compte associé:</p>
                  <p style="color: #e2e8f0; font-size: 14px; margin: 5px 0;">
                    📌 ${accountData.name}
                  </p>
                  ${accountData.email ? `
                    <p style="color: #94a3b8; font-size: 13px; margin: 5px 0;">
                      ✉️ ${accountData.email}
                    </p>
                  ` : ''}
                  ${accountData.phone ? `
                    <p style="color: #94a3b8; font-size: 13px; margin: 5px 0;">
                      📱 ${accountData.phone}
                    </p>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
              Ce rappel a été généré automatiquement par VaultKeep.<br/>
              Connectez-vous à votre compte pour gérer vos rappels.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reminder-email function:", error);
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
