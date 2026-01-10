import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, questionCount = 5 } = await req.json();

    if (!topic || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Le sujet de l'enquête est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert en création d'enquêtes et questionnaires. Tu génères des questions pertinentes, claires et professionnelles en français.

Tu dois générer des questions variées en utilisant différents types:
- "text": Question ouverte courte
- "textarea": Question ouverte longue
- "radio": Choix unique parmi plusieurs options
- "checkbox": Choix multiple parmi plusieurs options
- "rating": Évaluation de 1 à 5 étoiles
- "number": Réponse numérique

Pour les types "radio" et "checkbox", tu DOIS fournir un tableau d'options (3-5 options pertinentes).`;

    const userPrompt = `Génère exactement ${questionCount} questions pour une enquête sur le sujet suivant: "${topic}"

Les questions doivent être variées et couvrir différents aspects du sujet.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_survey_questions",
              description: "Génère une liste de questions pour une enquête",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Titre suggéré pour l'enquête"
                  },
                  description: {
                    type: "string",
                    description: "Description courte de l'enquête"
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: {
                          type: "string",
                          description: "Le texte de la question"
                        },
                        question_type: {
                          type: "string",
                          enum: ["text", "textarea", "radio", "checkbox", "rating", "number"],
                          description: "Le type de question"
                        },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Options pour radio/checkbox (obligatoire pour ces types)"
                        },
                        is_required: {
                          type: "boolean",
                          description: "Si la question est obligatoire"
                        }
                      },
                      required: ["question_text", "question_type", "is_required"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["title", "description", "questions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_survey_questions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_survey_questions") {
      throw new Error("Format de réponse IA invalide");
    }

    const surveyData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(surveyData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-survey error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
