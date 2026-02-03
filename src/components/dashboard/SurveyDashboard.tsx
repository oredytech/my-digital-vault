import { useState, useEffect } from "react";
import { BarChart3, Users, Clock, TrendingUp, Calendar, FileText, Star, RefreshCw, ExternalLink, Copy, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { SurveyAIAnalysis } from "./SurveyAIAnalysis";
import { SurveyPDFExport } from "./SurveyPDFExport";
import { toast } from "sonner";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

interface Survey {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_published: boolean;
  share_code?: string;
  created_at: string;
  updated_at: string;
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

interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id: string;
  answers: Record<string, any>;
  created_at: string;
}

interface SurveyDashboardProps {
  survey: Survey;
  onViewResults: () => void;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function SurveyDashboard({ survey, onViewResults }: SurveyDashboardProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getData } = useLocalDatabase();

  useEffect(() => {
    loadData();
  }, [survey.id]);

  const loadData = async () => {
    try {
      const allQuestions = await getData<SurveyQuestion>("survey_questions");
      const surveyQuestions = allQuestions
        .filter(q => q.survey_id === survey.id)
        .sort((a, b) => a.question_order - b.question_order);
      setQuestions(surveyQuestions);

      const allResponses = await getData<SurveyResponse>("survey_responses");
      const surveyResponses = allResponses
        .filter(r => r.survey_id === survey.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setResponses(surveyResponses);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopyLink = () => {
    if (!survey.share_code) return;
    const link = `${window.location.origin}/survey/${survey.share_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié");
  };

  // Calculate stats
  const totalResponses = responses.length;
  const avgCompletionRate = questions.length > 0
    ? Math.round(responses.reduce((acc, r) => {
        const answered = Object.keys(r.answers).filter(k => r.answers[k] !== undefined && r.answers[k] !== "").length;
        return acc + (answered / questions.length) * 100;
      }, 0) / Math.max(totalResponses, 1))
    : 0;

  // Responses over time (last 7 days)
  const responsesOverTime = () => {
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = responses.filter(r => r.created_at.startsWith(dateStr)).length;
      data.push({
        date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        responses: count
      });
    }
    return data;
  };

  // Question types distribution
  const questionTypeData = () => {
    const types: Record<string, number> = {};
    questions.forEach(q => {
      const label = getQuestionTypeLabel(q.question_type);
      types[label] = (types[label] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: "Texte court",
      textarea: "Texte long",
      radio: "Choix unique",
      checkbox: "Choix multiple",
      rating: "Évaluation",
      number: "Nombre"
    };
    return labels[type] || type;
  };

  // Average rating for rating questions
  const averageRatings = () => {
    const ratingQuestions = questions.filter(q => q.question_type === "rating");
    return ratingQuestions.map(q => {
      const ratings = responses
        .map(r => r.answers[q.id])
        .filter(r => r !== undefined && r !== null);
      const avg = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;
      return {
        question: q.question_text.substring(0, 30) + (q.question_text.length > 30 ? "..." : ""),
        average: parseFloat(avg.toFixed(1))
      };
    });
  };

  // Recent responses
  const recentResponses = responses.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">📊 Aperçu</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs sm:text-sm">🤖 Analyse IA</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">Actualiser</span>
          </Button>
          <SurveyPDFExport 
            surveyTitle={survey.title}
            surveyDescription={survey.description}
            questions={questions}
            responses={responses}
          />
          {survey.is_published && survey.share_code && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8">
                <Copy className="w-3.5 h-3.5 sm:mr-2" />
                <span className="hidden sm:inline text-xs">Copier</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8"
                onClick={() => window.open(`/survey/${survey.share_code}`, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5 sm:mr-2" />
                <span className="hidden sm:inline text-xs">Ouvrir</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-0">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20 shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{totalResponses}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Réponses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-chart-2/20 shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-chart-2" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{questions.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-chart-3/20 shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-chart-3" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{avgCompletionRate}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Complétion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-chart-4/20 shrink-0">
                <Badge variant={survey.is_published ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                  {survey.is_published ? "Publiée" : "Brouillon"}
                </Badge>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate">Statut</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {survey.is_published ? "Active" : "Non publié"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Responses Over Time */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              Réponses (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={responsesOverTime()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="responses" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)"
                    name="Réponses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Questions */}
      {averageRatings().length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 shrink-0" />
              Moyennes des évaluations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
            <div className="h-32 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={averageRatings()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <YAxis 
                    dataKey="question" 
                    type="category" 
                    width={80} 
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="average" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Moyenne" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Responses */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            Réponses récentes
          </CardTitle>
          <CardDescription className="text-xs">Les 5 dernières soumissions</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {recentResponses.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
              Aucune réponse pour le moment
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentResponses.map((response, index) => {
                const answeredCount = Object.keys(response.answers).filter(
                  k => response.answers[k] !== undefined && response.answers[k] !== ""
                ).length;
                const completionRate = questions.length > 0 
                  ? Math.round((answeredCount / questions.length) * 100) 
                  : 0;

                return (
                  <div 
                    key={response.id}
                    className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-muted/30"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        Réponse anonyme
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {new Date(response.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-medium">{completionRate}%</p>
                      <Progress value={completionRate} className="w-12 sm:w-20 h-1 sm:h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="analysis" className="mt-0">
        <SurveyAIAnalysis surveyId={survey.id} surveyTitle={survey.title} />
      </TabsContent>
    </Tabs>
  );
}
