import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  survey_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuration Supabase manquante");
    }

    if (!lovableApiKey) {
      throw new Error("Clé API Lovable manquante");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { survey_id }: AnalysisRequest = await req.json();

    // Fetch survey details
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", survey_id)
      .single();

    if (surveyError || !survey) {
      throw new Error("Enquête non trouvée");
    }

    // Fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", survey_id)
      .order("question_order", { ascending: true });

    if (questionsError) {
      throw new Error("Erreur lors du chargement des questions");
    }

    // Fetch responses
    const { data: responses, error: responsesError } = await supabase
      .from("survey_responses")
      .select("*")
      .eq("survey_id", survey_id);

    if (responsesError) {
      throw new Error("Erreur lors du chargement des réponses");
    }

    if (!responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Aucune réponse disponible pour l'analyse",
          analysis: null 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare data for AI analysis
    const analysisData = {
      survey: {
        title: survey.title,
        description: survey.description,
        total_responses: responses.length,
      },
      questions: questions?.map(q => ({
        text: q.question_text,
        type: q.question_type,
        options: q.options,
      })),
      responses_summary: prepareResponsesSummary(questions || [], responses),
    };

    // Call Lovable AI for analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en analyse de données d'enquêtes. Analyse les données fournies et génère un rapport complet en français. 
            
Le rapport doit inclure:
1. **Résumé exécutif** - Vue d'ensemble des résultats clés
2. **Analyse par question** - Insights détaillés pour chaque question
3. **Tendances et patterns** - Observations sur les tendances générales
4. **Points forts** - Les aspects positifs identifiés
5. **Points d'amélioration** - Les domaines nécessitant attention
6. **Recommandations** - Actions concrètes suggérées
7. **Conclusion** - Synthèse finale

Utilise des statistiques et pourcentages quand possible. Sois précis et actionnable.`
          },
          {
            role: "user",
            content: `Analyse les données de cette enquête et génère un rapport complet:\n\n${JSON.stringify(analysisData, null, 2)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Limite de requêtes atteinte. Veuillez réessayer plus tard.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Crédits insuffisants pour l'analyse IA.");
      }
      throw new Error("Erreur lors de l'analyse IA");
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Analyse non disponible";

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        statistics: generateStatistics(questions || [], responses),
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in analyze-survey:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function prepareResponsesSummary(questions: any[], responses: any[]) {
  const summary: Record<string, any> = {};

  questions.forEach(q => {
    const questionResponses = responses.map(r => r.answers[q.id]).filter(a => a !== undefined && a !== null);
    
    if (q.question_type === "rating" || q.question_type === "number") {
      const numResponses = questionResponses.map(Number).filter(n => !isNaN(n));
      summary[q.question_text] = {
        type: q.question_type,
        count: numResponses.length,
        average: numResponses.length > 0 ? (numResponses.reduce((a, b) => a + b, 0) / numResponses.length).toFixed(2) : 0,
        min: numResponses.length > 0 ? Math.min(...numResponses) : 0,
        max: numResponses.length > 0 ? Math.max(...numResponses) : 0,
      };
    } else if (q.question_type === "radio" || q.question_type === "checkbox") {
      const counts: Record<string, number> = {};
      questionResponses.forEach(r => {
        if (Array.isArray(r)) {
          r.forEach(option => { counts[option] = (counts[option] || 0) + 1; });
        } else {
          counts[r] = (counts[r] || 0) + 1;
        }
      });
      summary[q.question_text] = {
        type: q.question_type,
        distribution: counts,
        total_responses: questionResponses.length,
      };
    } else {
      summary[q.question_text] = {
        type: q.question_type,
        sample_responses: questionResponses.slice(0, 5),
        total_responses: questionResponses.length,
      };
    }
  });

  return summary;
}

function generateStatistics(questions: any[], responses: any[]) {
  return {
    total_responses: responses.length,
    total_questions: questions.length,
    completion_rate: calculateCompletionRate(questions, responses),
    response_rate_by_question: questions.map(q => ({
      question: q.question_text,
      response_count: responses.filter(r => r.answers[q.id] !== undefined).length,
      response_rate: ((responses.filter(r => r.answers[q.id] !== undefined).length / responses.length) * 100).toFixed(1),
    })),
  };
}

function calculateCompletionRate(questions: any[], responses: any[]) {
  if (responses.length === 0 || questions.length === 0) return 0;
  
  const totalPossible = responses.length * questions.length;
  const totalAnswered = responses.reduce((acc, r) => {
    return acc + Object.keys(r.answers).filter(k => r.answers[k] !== undefined && r.answers[k] !== "").length;
  }, 0);
  
  return ((totalAnswered / totalPossible) * 100).toFixed(1);
}

serve(handler);
