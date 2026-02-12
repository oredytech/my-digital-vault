import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant de productivité personnel pour l'application VaultKeep. 
Tu génères un digest quotidien bref et actionnable en français.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) avec cette structure:
{
  "summary": "Résumé de 1-2 phrases sur l'état du coffre-fort de l'utilisateur",
  "tips": ["conseil 1", "conseil 2"],
  "priorities": ["priorité 1"],
  "encouragement": "message motivant court"
}

Sois concis, pratique et bienveillant. Maximum 2 tips et 2 priorités.`,
          },
          {
            role: "user",
            content: `Voici l'état actuel de mon coffre-fort:\n\n${context}\n\nGénère mon digest du jour.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }

    const digest = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        summary: "Votre coffre-fort est actif. Continuez à organiser vos données !",
        tips: ["Vérifiez vos rappels du jour", "Complétez les informations manquantes de vos comptes"],
        priorities: ["Traiter les rappels en attente"],
        encouragement: "Chaque petit pas compte ! 🚀",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
