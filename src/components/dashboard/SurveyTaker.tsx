import { useState, useEffect } from "react";
import { Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "number";
  options?: string[];
  question_order: number;
  is_required: boolean;
}

interface SurveyTakerProps {
  surveyId: string;
  onComplete: () => void;
}

export function SurveyTaker({ surveyId, onComplete }: SurveyTakerProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { getData, insertData } = useLocalDatabase();

  useEffect(() => {
    loadQuestions();
  }, [surveyId]);

  const loadQuestions = async () => {
    try {
      const allQuestions = await getData<SurveyQuestion>("survey_questions");
      const surveyQuestions = allQuestions
        .filter(q => q.survey_id === surveyId)
        .sort((a, b) => a.question_order - b.question_order);
      setQuestions(surveyQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Erreur lors du chargement des questions");
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
      await insertData("survey_responses", {
        survey_id: surveyId,
        respondent_id: `anon_${Date.now()}`,
        answers,
      });
      onComplete();
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aucune question dans cette enquête</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <Card key={question.id} className="bg-muted/20">
          <CardContent className="pt-4">
            <Label className="text-sm sm:text-base font-medium">
              {index + 1}. {question.question_text}
              {question.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>

            <div className="mt-3">
              {question.question_type === "text" && (
                <Input
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="Votre réponse..."
                />
              )}

              {question.question_type === "textarea" && (
                <Textarea
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="Votre réponse..."
                  rows={3}
                />
              )}

              {question.question_type === "number" && (
                <Input
                  type="number"
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="0"
                  className="max-w-32"
                />
              )}

              {question.question_type === "radio" && question.options && (
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => updateAnswer(question.id, value)}
                  className="space-y-2"
                >
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} />
                      <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.question_type === "checkbox" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${optIndex}`}
                        checked={(answers[question.id] || []).includes(option)}
                        onCheckedChange={(checked) => handleCheckboxChange(question.id, option, !!checked)}
                      />
                      <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {question.question_type === "rating" && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => updateAnswer(question.id, rating)}
                      className={cn(
                        "p-1 transition-colors",
                        (answers[question.id] || 0) >= rating
                          ? "text-yellow-500"
                          : "text-muted-foreground hover:text-yellow-400"
                      )}
                    >
                      <Star
                        className="w-6 h-6 sm:w-8 sm:h-8"
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

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Envoi...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer mes réponses
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
