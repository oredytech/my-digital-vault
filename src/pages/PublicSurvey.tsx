import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, Star, CheckCircle, AlertCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Survey {
  id: string;
  title: string;
  description?: string;
  is_published: boolean;
  share_code: string;
}

interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "number";
  options?: string[];
  question_order: number;
  is_required: boolean;
}

const PublicSurvey = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareCode) {
      loadSurvey();
    }
  }, [shareCode]);

  const loadSurvey = async () => {
    try {
      console.log("Loading survey with share code:", shareCode);
      
      // Fetch survey by share code - using anon key, RLS should allow this for published surveys
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("id, title, description, is_published, share_code")
        .eq("share_code", shareCode)
        .eq("is_published", true)
        .maybeSingle();

      console.log("Survey data:", surveyData, "Error:", surveyError);

      if (surveyError) {
        console.error("Survey fetch error:", surveyError);
        setError("Erreur lors du chargement de l'enquête.");
        setLoading(false);
        return;
      }

      if (!surveyData) {
        setError("Cette enquête n'existe pas ou n'est plus disponible.");
        setLoading(false);
        return;
      }

      setSurvey(surveyData);

      // Fetch questions - RLS allows reading questions for published surveys
      const { data: questionsData, error: questionsError } = await supabase
        .from("survey_questions")
        .select("id, survey_id, question_text, question_type, options, question_order, is_required")
        .eq("survey_id", surveyData.id)
        .order("question_order", { ascending: true });

      console.log("Questions data:", questionsData, "Error:", questionsError);

      if (questionsError) {
        console.error("Error loading questions:", questionsError);
        setError("Erreur lors du chargement des questions.");
        setLoading(false);
        return;
      }

      if (!questionsData || questionsData.length === 0) {
        setError("Cette enquête ne contient aucune question.");
        setLoading(false);
        return;
      }

      // Cast options from Json to string[] for each question
      const typedQuestions: SurveyQuestion[] = questionsData.map((q) => ({
        id: q.id,
        survey_id: q.survey_id,
        question_text: q.question_text,
        question_type: q.question_type as SurveyQuestion["question_type"],
        options: q.options as string[] | undefined,
        question_order: q.question_order,
        is_required: q.is_required ?? false,
      }));

      setQuestions(typedQuestions);
    } catch (err) {
      console.error("Error:", err);
      setError("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const current = answers[questionId] || [];
    if (checked) {
      updateAnswer(questionId, [...current, option]);
    } else {
      updateAnswer(questionId, current.filter((o: string) => o !== option));
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate required questions
    for (const question of questions) {
      if (question.is_required) {
        const answer = answers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          toast.error(`Veuillez répondre à la question: "${question.question_text}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("survey_responses").insert({
        survey_id: survey.id,
        respondent_id: `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        answers,
      });

      if (insertError) {
        console.error("Error submitting:", insertError);
        toast.error("Erreur lors de l'envoi de vos réponses");
        return;
      }

      // Send notification (don't await - fire and forget)
      supabase
        .from("survey_responses")
        .select("id")
        .eq("survey_id", survey.id)
        .then(({ data: countData }) => {
          const responseCount = countData?.length || 1;
          supabase.functions.invoke("survey-response-notification", {
            body: { survey_id: survey.id, response_count: responseCount }
          }).catch(err => console.log("Notification skipped:", err));
        });

      setSubmitted(true);
      toast.success("Merci pour votre participation!");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement de l'enquête...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enquête non disponible</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Merci!</h2>
            <p className="text-muted-foreground mb-6">
              Vos réponses ont été enregistrées avec succès.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Survey Header */}
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader className="text-center px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl leading-tight">{survey?.title}</CardTitle>
            {survey?.description && (
              <CardDescription className="text-sm sm:text-base mt-2 max-w-lg mx-auto">{survey.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Questions */}
        {questions.map((question, index) => (
          <Card key={question.id} className="bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 pb-5 sm:pb-6">
              <Label className="text-sm sm:text-base font-medium flex items-start gap-2 mb-4">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="flex-1 leading-relaxed">
                  {question.question_text}
                  {question.is_required && <span className="text-destructive ml-1">*</span>}
                </span>
              </Label>

              <div className="mt-4 pl-0 sm:pl-8">
                {question.question_type === "text" && (
                  <Input
                    value={answers[question.id] || ""}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Votre réponse..."
                    className="bg-background/50 text-base"
                  />
                )}

                {question.question_type === "textarea" && (
                  <Textarea
                    value={answers[question.id] || ""}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Votre réponse..."
                    rows={4}
                    className="bg-background/50 text-base resize-none"
                  />
                )}

                {question.question_type === "number" && (
                  <Input
                    type="number"
                    value={answers[question.id] || ""}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="0"
                    className="max-w-32 bg-background/50 text-base"
                  />
                )}

                {question.question_type === "radio" && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(value) => updateAnswer(question.id, value)}
                    className="space-y-2 sm:space-y-3"
                  >
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 hover:bg-background/50 transition-colors cursor-pointer"
                      >
                        <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} />
                        <Label
                          htmlFor={`${question.id}-${optIndex}`}
                          className="font-normal cursor-pointer flex-1 text-sm sm:text-base"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === "checkbox" && question.options && (
                  <div className="space-y-2 sm:space-y-3">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 hover:bg-background/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`${question.id}-${optIndex}`}
                          checked={(answers[question.id] || []).includes(option)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(question.id, option, !!checked)
                          }
                        />
                        <Label
                          htmlFor={`${question.id}-${optIndex}`}
                          className="font-normal cursor-pointer flex-1 text-sm sm:text-base"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {question.question_type === "rating" && (
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 p-3 sm:p-4 bg-background/30 rounded-lg w-fit">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => updateAnswer(question.id, rating)}
                        className={cn(
                          "p-1 transition-all transform hover:scale-110 active:scale-95",
                          (answers[question.id] || 0) >= rating
                            ? "text-yellow-500"
                            : "text-muted-foreground hover:text-yellow-400"
                        )}
                      >
                        <Star
                          className="w-7 h-7 sm:w-10 sm:h-10"
                          fill={(answers[question.id] || 0) >= rating ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Submit Button */}
        <div className="flex justify-center pt-2 sm:pt-4 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="w-full sm:w-auto px-8 shadow-lg text-base"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Envoyer mes réponses
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicSurvey;
