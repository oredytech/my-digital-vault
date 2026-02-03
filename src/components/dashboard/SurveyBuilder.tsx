import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Save, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { supabase } from "@/integrations/supabase/client";
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

interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "number";
  options?: string[];
  question_order: number;
  is_required: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface SurveyTemplate {
  name: string;
  description: string;
  questions: {
    question_text: string;
    question_type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "number";
    options?: string[];
    is_required: boolean;
  }[];
}

interface SurveyBuilderProps {
  survey?: Survey | null;
  template?: SurveyTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

const questionTypes = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "radio", label: "Choix unique" },
  { value: "checkbox", label: "Choix multiple" },
  { value: "rating", label: "Évaluation (1-5)" },
  { value: "number", label: "Nombre" },
];

export function SurveyBuilder({ survey, template, onSave, onCancel }: SurveyBuilderProps) {
  const [title, setTitle] = useState(survey?.title || template?.name || "");
  const [description, setDescription] = useState(survey?.description || template?.description || "");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const { insertData, updateData, getData, deleteData } = useLocalDatabase();

  useEffect(() => {
    if (survey) {
      loadQuestions();
    } else if (template && template.questions.length > 0) {
      // Load questions from template
      const templateQuestions: SurveyQuestion[] = template.questions.map((q, idx) => ({
        id: crypto.randomUUID(),
        survey_id: "",
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        question_order: idx,
        is_required: q.is_required,
        isNew: true,
      }));
      setQuestions(templateQuestions);
    } else {
      // Add a default question for new surveys
      setQuestions([{
        id: crypto.randomUUID(),
        survey_id: "",
        question_text: "",
        question_type: "text",
        question_order: 0,
        is_required: false,
        isNew: true,
      }]);
    }
  }, [survey, template]);

  const loadQuestions = async () => {
    if (!survey) return;
    try {
      const allQuestions = await getData<SurveyQuestion>("survey_questions");
      const surveyQuestions = allQuestions
        .filter(q => q.survey_id === survey.id)
        .sort((a, b) => a.question_order - b.question_order);
      setQuestions(surveyQuestions.length > 0 ? surveyQuestions : [{
        id: crypto.randomUUID(),
        survey_id: survey.id,
        question_text: "",
        question_type: "text",
        question_order: 0,
        is_required: false,
        isNew: true,
      }]);
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      survey_id: survey?.id || "",
      question_text: "",
      question_type: "text",
      question_order: questions.length,
      is_required: false,
      isNew: true,
    }]);
  };

  const removeQuestion = (index: number) => {
    const question = questions[index];
    if (question.isNew) {
      setQuestions(questions.filter((_, i) => i !== index));
    } else {
      setQuestions(questions.map((q, i) => i === index ? { ...q, isDeleted: true } : q));
    }
  };

  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const question = questions[questionIndex];
    const options = [...(question.options || [])];
    options[optionIndex] = value;
    updateQuestion(questionIndex, { options });
  };

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    updateQuestion(questionIndex, { options: [...(question.options || []), ""] });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    const options = (question.options || []).filter((_, i) => i !== optionIndex);
    updateQuestion(questionIndex, { options });
  };

  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      toast.error("Veuillez entrer un sujet pour l'enquête");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { topic: aiTopic, questionCount: aiQuestionCount }
      });

      if (error) {
        console.error("AI generation error:", error);
        if (error.message?.includes("429")) {
          toast.error("Limite de requêtes atteinte, réessayez plus tard.");
        } else if (error.message?.includes("402")) {
          toast.error("Crédits insuffisants pour la génération IA.");
        } else {
          toast.error("Erreur lors de la génération IA");
        }
        return;
      }

      if (data) {
        // Apply generated data
        setTitle(data.title || aiTopic);
        setDescription(data.description || "");
        
        const generatedQuestions: SurveyQuestion[] = (data.questions || []).map((q: any, index: number) => ({
          id: crypto.randomUUID(),
          survey_id: survey?.id || "",
          question_text: q.question_text,
          question_type: q.question_type as SurveyQuestion["question_type"],
          options: q.options,
          question_order: index,
          is_required: q.is_required || false,
          isNew: true,
        }));

        if (generatedQuestions.length > 0) {
          setQuestions(generatedQuestions);
          toast.success(`${generatedQuestions.length} questions générées par l'IA`);
        } else {
          toast.error("Aucune question générée");
        }
      }

      setShowAIDialog(false);
      setAiTopic("");
    } catch (error) {
      console.error("Error generating survey:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Veuillez entrer un titre pour l'enquête");
      return;
    }

    const validQuestions = questions.filter(q => !q.isDeleted && q.question_text.trim());
    if (validQuestions.length === 0) {
      toast.error("Ajoutez au moins une question");
      return;
    }

    setSaving(true);
    try {
      let surveyId = survey?.id;

      if (survey) {
        // Update existing survey
        await updateData("surveys", survey.id, { title, description });
      } else {
        // Create new survey
        const newSurvey = await insertData("surveys", { title, description, is_published: false });
        surveyId = newSurvey?.id;
      }

      if (!surveyId) throw new Error("Failed to save survey");

      // Handle questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        if (question.isDeleted && !question.isNew) {
          await deleteData("survey_questions", question.id, true);
        } else if (!question.isDeleted && question.question_text.trim()) {
          const questionData = {
            survey_id: surveyId,
            question_text: question.question_text,
            question_type: question.question_type,
            options: question.options,
            question_order: i,
            is_required: question.is_required,
          };

          if (question.isNew) {
            await insertData("survey_questions", questionData);
          } else {
            await updateData("survey_questions", question.id, questionData);
          }
        }
      }

      toast.success(survey ? "Enquête modifiée" : "Enquête créée");
      onSave();
    } catch (error) {
      console.error("Error saving survey:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const visibleQuestions = questions.filter(q => !q.isDeleted);

  return (
    <div className="space-y-6">
      {/* AI Generation Button */}
      {!survey && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Générer avec l'IA</p>
                  <p className="text-xs text-muted-foreground">Créez des questions automatiquement à partir d'un sujet</p>
                </div>
              </div>
              <Button onClick={() => setShowAIDialog(true)} variant="outline" size="sm" className="shrink-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Générer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Survey Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Titre de l'enquête *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Satisfaction client"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez l'objectif de cette enquête..."
            className="mt-1"
            rows={2}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Questions ({visibleQuestions.length})</Label>
          <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {visibleQuestions.map((question, visibleIndex) => {
          const realIndex = questions.findIndex(q => q.id === question.id);
          return (
            <Card key={question.id} className="bg-muted/30">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={question.question_text}
                        onChange={(e) => updateQuestion(realIndex, { question_text: e.target.value })}
                        placeholder={`Question ${visibleIndex + 1}`}
                        className="flex-1"
                      />
                      <Select
                        value={question.question_type}
                        onValueChange={(value) => updateQuestion(realIndex, { 
                          question_type: value as SurveyQuestion["question_type"],
                          options: (value === "radio" || value === "checkbox") ? ["Option 1", "Option 2"] : undefined
                        })}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options for radio/checkbox */}
                    {(question.question_type === "radio" || question.question_type === "checkbox") && (
                      <div className="space-y-2 pl-4 border-l-2 border-border">
                        {(question.options || []).map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateQuestionOption(realIndex, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1}`}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeOption(realIndex, optIndex)}
                              className="shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => addOption(realIndex)}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Ajouter une option
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={question.is_required}
                          onCheckedChange={(checked) => updateQuestion(realIndex, { is_required: checked })}
                        />
                        <Label className="text-sm">Obligatoire</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion(realIndex)}
                    className="text-destructive shrink-0"
                    disabled={visibleQuestions.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Générer avec l'IA
            </DialogTitle>
            <DialogDescription>
              Décrivez le sujet de votre enquête et l'IA créera des questions pertinentes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ai-topic">Sujet de l'enquête *</Label>
              <Input
                id="ai-topic"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ex: Satisfaction des employés, Feedback produit..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ai-count">Nombre de questions</Label>
              <Select
                value={aiQuestionCount.toString()}
                onValueChange={(v) => setAiQuestionCount(parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 7, 10].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} questions</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)} disabled={generating}>
              Annuler
            </Button>
            <Button onClick={handleGenerateWithAI} disabled={generating || !aiTopic.trim()}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
