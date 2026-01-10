import { useState, useEffect } from "react";
import { Plus, ClipboardList, Share2, BarChart3, Eye, Trash2, Edit, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { toast } from "sonner";
import { SurveyBuilder } from "./SurveyBuilder";
import { SurveyTaker } from "./SurveyTaker";
import { SurveyResults } from "./SurveyResults";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  question_type: string;
  options?: any;
  question_order: number;
  is_required: boolean;
}

export function SurveysSection() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTaker, setShowTaker] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { getData, insertData, updateData, deleteData } = useLocalDatabase();

  const loadSurveys = async () => {
    try {
      const data = await getData<Survey>("surveys");
      setSurveys(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error("Error loading surveys:", error);
      toast.error("Erreur lors du chargement des enquêtes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setShowBuilder(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setShowBuilder(true);
  };

  const handleTakeSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setShowTaker(true);
  };

  const handleViewResults = (survey: Survey) => {
    setSelectedSurvey(survey);
    setShowResults(true);
  };

  const handleDeleteSurvey = async (survey: Survey) => {
    try {
      await deleteData("surveys", survey.id);
      setSurveys(prev => prev.filter(s => s.id !== survey.id));
      toast.success("Enquête supprimée");
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleTogglePublish = async (survey: Survey) => {
    try {
      const shareCode = survey.is_published ? null : crypto.randomUUID().substring(0, 8);
      await updateData("surveys", survey.id, { 
        is_published: !survey.is_published,
        share_code: shareCode
      });
      setSurveys(prev => prev.map(s => 
        s.id === survey.id 
          ? { ...s, is_published: !s.is_published, share_code: shareCode || undefined }
          : s
      ));
      toast.success(survey.is_published ? "Enquête dépubliée" : "Enquête publiée");
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleCopyShareCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${code}`);
    setCopiedCode(code);
    toast.success("Lien copié dans le presse-papier");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSurveyCreated = () => {
    setShowBuilder(false);
    loadSurveys();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Enquêtes</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Créez et gérez vos questionnaires d'enquête</p>
        </div>
        <Button onClick={handleCreateSurvey} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle enquête
        </Button>
      </div>

      {surveys.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Aucune enquête créée</p>
            <Button onClick={handleCreateSurvey} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Créer une enquête
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="bg-card/50 backdrop-blur-sm border-border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{survey.title}</CardTitle>
                    {survey.description && (
                      <CardDescription className="line-clamp-2 text-xs sm:text-sm mt-1">
                        {survey.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={survey.is_published ? "default" : "secondary"} className="shrink-0">
                    {survey.is_published ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-xs text-muted-foreground">
                  Créé le {new Date(survey.created_at).toLocaleDateString('fr-FR')}
                </p>
                {survey.is_published && survey.share_code && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {survey.share_code}
                    </code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleCopyShareCode(survey.share_code!)}
                      className="h-7 w-7 p-0"
                    >
                      {copiedCode === survey.share_code ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handleEditSurvey(survey)} className="flex-1 min-w-0">
                  <Edit className="w-3 h-3 mr-1" />
                  <span className="truncate">Éditer</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleTakeSurvey(survey)} className="flex-1 min-w-0">
                  <Eye className="w-3 h-3 mr-1" />
                  <span className="truncate">Tester</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleViewResults(survey)} className="flex-1 min-w-0">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  <span className="truncate">Résultats</span>
                </Button>
                <Button 
                  size="sm" 
                  variant={survey.is_published ? "secondary" : "default"}
                  onClick={() => handleTogglePublish(survey)}
                  className="flex-1 min-w-0"
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  <span className="truncate">{survey.is_published ? "Dépublier" : "Publier"}</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="w-8 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer l'enquête ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Toutes les questions et réponses seront supprimées.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteSurvey(survey)}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Survey Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? "Modifier l'enquête" : "Nouvelle enquête"}</DialogTitle>
            <DialogDescription>
              {editingSurvey ? "Modifiez les questions de votre enquête" : "Créez un nouveau questionnaire d'enquête"}
            </DialogDescription>
          </DialogHeader>
          <SurveyBuilder 
            survey={editingSurvey} 
            onSave={handleSurveyCreated}
            onCancel={() => setShowBuilder(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Survey Taker Dialog */}
      <Dialog open={showTaker} onOpenChange={setShowTaker}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSurvey?.title}</DialogTitle>
            <DialogDescription>{selectedSurvey?.description}</DialogDescription>
          </DialogHeader>
          {selectedSurvey && (
            <SurveyTaker 
              surveyId={selectedSurvey.id}
              onComplete={() => {
                setShowTaker(false);
                toast.success("Réponse enregistrée !");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Survey Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Résultats - {selectedSurvey?.title}</DialogTitle>
            <DialogDescription>Visualisez les réponses collectées</DialogDescription>
          </DialogHeader>
          {selectedSurvey && (
            <SurveyResults surveyId={selectedSurvey.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
