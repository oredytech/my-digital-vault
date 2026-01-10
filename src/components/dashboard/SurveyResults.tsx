import { useState, useEffect } from "react";
import { BarChart3, Users, Star, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { toast } from "sonner";

interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "number";
  options?: string[];
  question_order: number;
  is_required: boolean;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id: string;
  answers: Record<string, any>;
  created_at: string;
}

interface SurveyResultsProps {
  surveyId: string;
}

export function SurveyResults({ surveyId }: SurveyResultsProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { getData } = useLocalDatabase();

  useEffect(() => {
    loadData();
  }, [surveyId]);

  const loadData = async () => {
    try {
      const allQuestions = await getData<SurveyQuestion>("survey_questions");
      const surveyQuestions = allQuestions
        .filter(q => q.survey_id === surveyId)
        .sort((a, b) => a.question_order - b.question_order);
      setQuestions(surveyQuestions);

      const allResponses = await getData<SurveyResponse>("survey_responses");
      const surveyResponses = allResponses
        .filter(r => r.survey_id === surveyId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setResponses(surveyResponses);
    } catch (error) {
      console.error("Error loading results:", error);
      toast.error("Erreur lors du chargement des résultats");
    } finally {
      setLoading(false);
    }
  };

  const getOptionStats = (questionId: string, options: string[]) => {
    const counts: Record<string, number> = {};
    options.forEach(opt => counts[opt] = 0);

    responses.forEach(response => {
      const answer = response.answers[questionId];
      if (Array.isArray(answer)) {
        answer.forEach((a: string) => {
          if (counts[a] !== undefined) counts[a]++;
        });
      } else if (answer && counts[answer] !== undefined) {
        counts[answer]++;
      }
    });

    const total = responses.length;
    return options.map(opt => ({
      option: opt,
      count: counts[opt],
      percentage: total > 0 ? Math.round((counts[opt] / total) * 100) : 0,
    }));
  };

  const getRatingStats = (questionId: string) => {
    const ratings = responses
      .map(r => r.answers[questionId])
      .filter(r => r !== undefined && r !== null);
    
    if (ratings.length === 0) return { average: 0, distribution: [] };

    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const distribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: ratings.filter(r => r === rating).length,
      percentage: Math.round((ratings.filter(r => r === rating).length / ratings.length) * 100),
    }));

    return { average, distribution };
  };

  const getTextResponses = (questionId: string) => {
    return responses
      .map(r => ({ answer: r.answers[questionId], date: r.created_at }))
      .filter(r => r.answer);
  };

  const getNumberStats = (questionId: string) => {
    const numbers = responses
      .map(r => parseFloat(r.answers[questionId]))
      .filter(n => !isNaN(n));
    
    if (numbers.length === 0) return { average: 0, min: 0, max: 0 };

    return {
      average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    };
  };

  const exportResults = () => {
    const data = responses.map(response => {
      const row: Record<string, any> = {
        date: new Date(response.created_at).toLocaleString('fr-FR'),
      };
      questions.forEach(q => {
        const answer = response.answers[q.id];
        row[q.question_text] = Array.isArray(answer) ? answer.join(", ") : answer || "";
      });
      return row;
    });

    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultats_enquete_${surveyId.substring(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Résultats exportés");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">{responses.length}</span>
            <span className="text-muted-foreground text-sm">réponse(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-semibold">{questions.length}</span>
            <span className="text-muted-foreground text-sm">question(s)</span>
          </div>
        </div>
        {responses.length > 0 && (
          <Button size="sm" variant="outline" onClick={exportResults}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        )}
      </div>

      {responses.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Aucune réponse pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id} className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-medium flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                  <span>{question.question_text}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Radio/Checkbox Results */}
                {(question.question_type === "radio" || question.question_type === "checkbox") && question.options && (
                  <div className="space-y-2">
                    {getOptionStats(question.id, question.options).map(stat => (
                      <div key={stat.option} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">{stat.option}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {stat.count} ({stat.percentage}%)
                          </span>
                        </div>
                        <Progress value={stat.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Rating Results */}
                {question.question_type === "rating" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                      <span className="text-2xl font-bold">
                        {getRatingStats(question.id).average.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/ 5</span>
                    </div>
                    <div className="space-y-1">
                      {getRatingStats(question.id).distribution.reverse().map(stat => (
                        <div key={stat.rating} className="flex items-center gap-2">
                          <span className="w-4 text-sm text-muted-foreground">{stat.rating}</span>
                          <Progress value={stat.percentage} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Number Results */}
                {question.question_type === "number" && (
                  <div className="flex flex-wrap gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{getNumberStats(question.id).average.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Moyenne</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{getNumberStats(question.id).min}</p>
                      <p className="text-xs text-muted-foreground">Min</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{getNumberStats(question.id).max}</p>
                      <p className="text-xs text-muted-foreground">Max</p>
                    </div>
                  </div>
                )}

                {/* Text Results */}
                {(question.question_type === "text" || question.question_type === "textarea") && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getTextResponses(question.id).length === 0 ? (
                      <p className="text-muted-foreground text-sm">Aucune réponse</p>
                    ) : (
                      getTextResponses(question.id).map((response, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3">
                          <p className="text-sm">{response.answer}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(response.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
