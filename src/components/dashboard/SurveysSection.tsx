import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Eye, BarChart3, Copy, ExternalLink, ToggleLeft, ToggleRight, Sparkles, ClipboardList } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3"><ClipboardList className="w-7 h-7 text-primary" />Enquêtes</h1>
          <p className="text-muted-foreground mt-1">Créez et gérez vos questionnaires</p>
        </div>
        <Button onClick={() => { setSelectedSurvey(null); setShowBuilder(true); }}><Plus className="w-4 h-4 mr-2" />Nouvelle enquête</Button>
      </div>

      {surveys.length === 0 ? (
        <Card className="bg-muted/20 border-dashed"><CardContent className="flex flex-col items-center justify-center py-16">
          <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune enquête</h3>
          <Button onClick={() => setShowBuilder(true)}><Sparkles className="w-4 h-4 mr-2" />Créer une enquête</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {surveys.map((survey) => (
            <Card key={survey.id} className="bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{survey.title}</h3>
                      <Badge variant={survey.is_published ? "default" : "secondary"}>{survey.is_published ? "Publiée" : "Brouillon"}</Badge>
                    </div>
                    {survey.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{survey.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Créée le {new Date(survey.created_at).toLocaleDateString("fr-FR")}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{responseCounts[survey.id] || 0} réponse(s)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {survey.is_published && survey.share_code && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleCopyLink(survey)}><Copy className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/survey/${survey.share_code}`, "_blank")}><ExternalLink className="w-4 h-4" /></Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleTogglePublish(survey)}>{survey.is_published ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}</Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setShowBuilder(true); }}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setShowTaker(true); }}><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setShowDashboard(true); }}><BarChart3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(survey.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showBuilder} onOpenChange={setShowBuilder}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedSurvey ? "Modifier l'enquête" : "Nouvelle enquête"}</DialogTitle></DialogHeader><SurveyBuilder survey={selectedSurvey} onSave={() => { setShowBuilder(false); loadSurveys(); }} onCancel={() => setShowBuilder(false)} /></DialogContent></Dialog>
      <Dialog open={showTaker} onOpenChange={setShowTaker}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Aperçu: {selectedSurvey?.title}</DialogTitle></DialogHeader>{selectedSurvey && <SurveyTaker surveyId={selectedSurvey.id} onComplete={() => { setShowTaker(false); loadSurveys(); }} />}</DialogContent></Dialog>
      <Dialog open={showResults} onOpenChange={setShowResults}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Résultats: {selectedSurvey?.title}</DialogTitle></DialogHeader>{selectedSurvey && <SurveyResults surveyId={selectedSurvey.id} />}</DialogContent></Dialog>
      <Dialog open={showDashboard} onOpenChange={setShowDashboard}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Tableau de bord: {selectedSurvey?.title}</DialogTitle></DialogHeader>{selectedSurvey && <SurveyDashboard survey={selectedSurvey} onViewResults={() => { setShowDashboard(false); setShowResults(true); }} />}</DialogContent></Dialog>
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette enquête?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-destructive">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
