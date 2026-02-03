import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Eye, BarChart3, Copy, ExternalLink, ToggleLeft, ToggleRight, Sparkles, ClipboardList, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { SurveyBuilder } from "./SurveyBuilder";
import { SurveyTaker } from "./SurveyTaker";
import { SurveyResults } from "./SurveyResults";
import { SurveyDashboard } from "./SurveyDashboard";
import { SurveyTemplates, SurveyTemplate } from "./SurveyTemplates";
import { toast } from "sonner";

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

interface SurveyResponse {
  id: string;
  survey_id: string;
  created_at: string;
}

export function SurveysSection() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTaker, setShowTaker] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<SurveyTemplate | null>(null);
  const { getData, updateData, deleteData } = useLocalDatabase();

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      const data = await getData<Survey>("surveys");
      const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSurveys(sorted);
      const responses = await getData<SurveyResponse>("survey_responses");
      const counts: Record<string, number> = {};
      responses.forEach(r => { counts[r.survey_id] = (counts[r.survey_id] || 0) + 1; });
      setResponseCounts(counts);
    } catch (error) {
      console.error("Error loading surveys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteData("surveys", id, true);
      setSurveys(surveys.filter(s => s.id !== id));
      toast.success("Enquête supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
    setDeleteConfirmId(null);
  };

  const handleTogglePublish = async (survey: Survey) => {
    const newPublished = !survey.is_published;
    const shareCode = newPublished ? crypto.randomUUID().substring(0, 8) : null;
    try {
      await updateData("surveys", survey.id, { is_published: newPublished, share_code: shareCode });
      setSurveys(surveys.map(s => s.id === survey.id ? { ...s, is_published: newPublished, share_code: shareCode || undefined } : s));
      toast.success(newPublished ? "Enquête publiée" : "Enquête dépubliée");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCopyLink = (survey: Survey) => {
    if (!survey.share_code) return;
    navigator.clipboard.writeText(`${window.location.origin}/survey/${survey.share_code}`);
    toast.success("Lien copié");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const handleSelectTemplate = (template: SurveyTemplate) => {
    setTemplateData(template);
    setSelectedSurvey(null);
    setShowBuilder(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <ClipboardList className="w-5 h-5 sm:w-7 sm:h-7 text-primary shrink-0" />
              <span className="truncate">Enquêtes</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Créez et gérez vos questionnaires</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SurveyTemplates onSelectTemplate={handleSelectTemplate} />
            <Button onClick={() => { setSelectedSurvey(null); setTemplateData(null); setShowBuilder(true); }} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="sm:inline">Nouvelle</span>
            </Button>
          </div>
        </div>
      </div>

      {surveys.length === 0 ? (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">Aucune enquête</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">Créez votre première enquête ou utilisez un template</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <SurveyTemplates onSelectTemplate={handleSelectTemplate} />
              <Button onClick={() => setShowBuilder(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Créer une enquête
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {surveys.map((survey) => (
            <Card key={survey.id} className="bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate max-w-[200px] sm:max-w-none">{survey.title}</h3>
                        <Badge variant={survey.is_published ? "default" : "secondary"} className="text-xs shrink-0">
                          {survey.is_published ? "Publiée" : "Brouillon"}
                        </Badge>
                      </div>
                      {survey.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1 sm:line-clamp-2">{survey.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      {new Date(survey.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {responseCounts[survey.id] || 0} réponse(s)
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap border-t pt-3 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 bg-muted/30">
                    {survey.is_published && survey.share_code && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleCopyLink(survey)} className="h-8 px-2 sm:px-3">
                          <Copy className="w-3.5 h-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline text-xs">Copier</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/survey/${survey.share_code}`, "_blank")} className="h-8 px-2 sm:px-3">
                          <ExternalLink className="w-3.5 h-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline text-xs">Ouvrir</span>
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleTogglePublish(survey)} className="h-8 px-2 sm:px-3">
                      {survey.is_published ? <ToggleRight className="w-3.5 h-3.5 sm:mr-1.5" /> : <ToggleLeft className="w-3.5 h-3.5 sm:mr-1.5" />}
                      <span className="hidden sm:inline text-xs">{survey.is_published ? "Dépublier" : "Publier"}</span>
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setTemplateData(null); setShowBuilder(true); }} className="h-8 px-2 sm:px-3">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setShowTaker(true); }} className="h-8 px-2 sm:px-3">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setShowDashboard(true); }} className="h-8 px-2 sm:px-3">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(survey.id)} className="h-8 px-2 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{selectedSurvey ? "Modifier l'enquête" : templateData ? `Nouveau: ${templateData.name}` : "Nouvelle enquête"}</DialogTitle>
          </DialogHeader>
          <SurveyBuilder 
            survey={selectedSurvey} 
            template={templateData}
            onSave={() => { setShowBuilder(false); setTemplateData(null); loadSurveys(); }} 
            onCancel={() => { setShowBuilder(false); setTemplateData(null); }} 
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showTaker} onOpenChange={setShowTaker}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Aperçu: {selectedSurvey?.title}</DialogTitle>
          </DialogHeader>
          {selectedSurvey && <SurveyTaker surveyId={selectedSurvey.id} onComplete={() => { setShowTaker(false); loadSurveys(); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Résultats: {selectedSurvey?.title}</DialogTitle>
          </DialogHeader>
          {selectedSurvey && <SurveyResults surveyId={selectedSurvey.id} />}
        </DialogContent>
      </Dialog>
      <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="truncate">Tableau de bord: {selectedSurvey?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSurvey && <SurveyDashboard survey={selectedSurvey} onViewResults={() => { setShowDashboard(false); setShowResults(true); }} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette enquête?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Toutes les réponses seront également supprimées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
