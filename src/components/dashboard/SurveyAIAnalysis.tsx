import { useState } from "react";
import { Brain, Loader2, FileText, TrendingUp, AlertCircle, CheckCircle, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SurveyAIAnalysisProps {
  surveyId: string;
  surveyTitle: string;
}

interface AnalysisResult {
  analysis: string;
  statistics: {
    total_responses: number;
    total_questions: number;
    completion_rate: string;
    response_rate_by_question: Array<{
      question: string;
      response_count: number;
      response_rate: string;
    }>;
  };
  generated_at: string;
}

export function SurveyAIAnalysis({ surveyId, surveyTitle }: SurveyAIAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-survey", {
        body: { survey_id: surveyId }
      });

      if (fnError) {
        console.error("Analysis error:", fnError);
        setError(fnError.message || "Erreur lors de l'analyse");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setResult(data);
      toast.success("Analyse terminée avec succès");
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Erreur inattendue");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportReport = () => {
    if (!result) return;

    const reportContent = `# Rapport d'analyse - ${surveyTitle}
Généré le: ${new Date(result.generated_at).toLocaleString('fr-FR')}

## Statistiques
- Réponses totales: ${result.statistics.total_responses}
- Questions: ${result.statistics.total_questions}
- Taux de complétion: ${result.statistics.completion_rate}%

## Analyse IA

${result.analysis}
`;

    const blob = new Blob([reportContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${surveyTitle.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Rapport téléchargé");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-violet-500/20">
                <Brain className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Analyse IA des réponses</h3>
                <p className="text-sm text-muted-foreground">
                  Obtenez des insights détaillés grâce à l'intelligence artificielle
                </p>
              </div>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="shrink-0"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : result ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Ré-analyser
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Lancer l'analyse
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Statistics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {result.statistics.total_responses}
                </p>
                <p className="text-xs text-muted-foreground">Réponses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {result.statistics.total_questions}
                </p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {result.statistics.completion_rate}%
                </p>
                <p className="text-xs text-muted-foreground">Complétion</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Analysé
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(result.generated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Report */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Rapport d'analyse
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>
              <CardDescription>
                Insights générés par l'IA basés sur les réponses collectées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {result.analysis.split('\n').map((paragraph, index) => {
                    if (paragraph.startsWith('##')) {
                      return (
                        <h3 key={index} className="text-lg font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          {paragraph.replace('##', '').trim()}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('#')) {
                      return (
                        <h2 key={index} className="text-xl font-bold text-foreground mt-6 mb-4">
                          {paragraph.replace('#', '').trim()}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith('-') || paragraph.startsWith('*')) {
                      return (
                        <li key={index} className="text-muted-foreground ml-4">
                          {paragraph.replace(/^[-*]\s*/, '').trim()}
                        </li>
                      );
                    }
                    if (paragraph.trim()) {
                      return (
                        <p key={index} className="text-muted-foreground leading-relaxed mb-3">
                          {paragraph}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Response Rates by Question */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Taux de réponse par question</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.statistics.response_rate_by_question.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[70%]">
                        {item.question}
                      </span>
                      <span className="font-medium">{item.response_rate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${item.response_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
