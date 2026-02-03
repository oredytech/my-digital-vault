import { useState } from "react";
import { LayoutTemplate, Star, MessageSquare, ThumbsUp, Users, ShoppingCart, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  questions: {
    question_text: string;
    question_type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "number";
    options?: string[];
    is_required: boolean;
  }[];
}

const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: "customer-satisfaction",
    name: "Satisfaction Client",
    description: "Mesurez la satisfaction de vos clients avec vos produits ou services",
    icon: <Star className="w-5 h-5" />,
    category: "Satisfaction",
    questions: [
      {
        question_text: "Comment évaluez-vous notre service dans son ensemble ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Quelle est la probabilité que vous recommandiez nos services à un ami ou collègue ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Qu'est-ce qui vous a le plus satisfait dans votre expérience ?",
        question_type: "radio",
        options: ["La qualité du produit/service", "Le service client", "Le rapport qualité-prix", "La facilité d'utilisation", "Autre"],
        is_required: false,
      },
      {
        question_text: "Y a-t-il des aspects que nous pourrions améliorer ?",
        question_type: "textarea",
        is_required: false,
      },
      {
        question_text: "Comment avez-vous connu nos services ?",
        question_type: "radio",
        options: ["Recommandation", "Recherche en ligne", "Réseaux sociaux", "Publicité", "Autre"],
        is_required: false,
      },
    ],
  },
  {
    id: "nps",
    name: "NPS (Net Promoter Score)",
    description: "Évaluez la fidélité de vos clients avec le score NPS",
    icon: <ThumbsUp className="w-5 h-5" />,
    category: "Fidélité",
    questions: [
      {
        question_text: "Sur une échelle de 1 à 5, quelle est la probabilité que vous recommandiez notre entreprise à un ami ou collègue ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Quelle est la principale raison de votre note ?",
        question_type: "textarea",
        is_required: true,
      },
      {
        question_text: "Que pourrions-nous faire pour améliorer votre expérience ?",
        question_type: "textarea",
        is_required: false,
      },
      {
        question_text: "Quels aspects de notre service appréciez-vous le plus ?",
        question_type: "checkbox",
        options: ["Qualité du produit", "Service client", "Prix", "Rapidité", "Innovation"],
        is_required: false,
      },
    ],
  },
  {
    id: "product-feedback",
    name: "Feedback Produit",
    description: "Recueillez les avis de vos utilisateurs sur votre produit",
    icon: <MessageSquare className="w-5 h-5" />,
    category: "Produit",
    questions: [
      {
        question_text: "Comment évaluez-vous la qualité globale de notre produit ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Le produit répond-il à vos attentes ?",
        question_type: "radio",
        options: ["Dépasse mes attentes", "Correspond à mes attentes", "Légèrement en dessous", "Ne correspond pas"],
        is_required: true,
      },
      {
        question_text: "Quelles fonctionnalités utilisez-vous le plus ?",
        question_type: "checkbox",
        options: ["Fonctionnalité A", "Fonctionnalité B", "Fonctionnalité C", "Fonctionnalité D"],
        is_required: false,
      },
      {
        question_text: "Quelles fonctionnalités aimeriez-vous voir ajoutées ?",
        question_type: "textarea",
        is_required: false,
      },
      {
        question_text: "Avez-vous rencontré des problèmes avec le produit ?",
        question_type: "radio",
        options: ["Non, aucun problème", "Quelques problèmes mineurs", "Des problèmes fréquents", "Des problèmes majeurs"],
        is_required: true,
      },
      {
        question_text: "Si vous avez rencontré des problèmes, pouvez-vous les décrire ?",
        question_type: "textarea",
        is_required: false,
      },
    ],
  },
  {
    id: "employee-satisfaction",
    name: "Satisfaction des Employés",
    description: "Évaluez le bien-être et la satisfaction de vos employés",
    icon: <Users className="w-5 h-5" />,
    category: "RH",
    questions: [
      {
        question_text: "Comment évaluez-vous votre satisfaction au travail ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Vous sentez-vous valorisé dans votre travail ?",
        question_type: "radio",
        options: ["Tout à fait", "Plutôt oui", "Plutôt non", "Pas du tout"],
        is_required: true,
      },
      {
        question_text: "Comment évaluez-vous la communication au sein de l'équipe ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Avez-vous les outils et ressources nécessaires pour bien faire votre travail ?",
        question_type: "radio",
        options: ["Oui, complètement", "En grande partie", "Partiellement", "Non"],
        is_required: true,
      },
      {
        question_text: "Quels aspects de votre travail appréciez-vous le plus ?",
        question_type: "checkbox",
        options: ["L'équipe", "Les projets", "L'environnement de travail", "La flexibilité", "La rémunération", "Les opportunités de croissance"],
        is_required: false,
      },
      {
        question_text: "Avez-vous des suggestions pour améliorer notre environnement de travail ?",
        question_type: "textarea",
        is_required: false,
      },
    ],
  },
  {
    id: "event-feedback",
    name: "Feedback Événement",
    description: "Recueillez les avis des participants après un événement",
    icon: <Briefcase className="w-5 h-5" />,
    category: "Événement",
    questions: [
      {
        question_text: "Comment évaluez-vous l'événement dans son ensemble ?",
        question_type: "rating",
        is_required: true,
      },
      {
        question_text: "Le contenu de l'événement était-il pertinent pour vous ?",
        question_type: "radio",
        options: ["Très pertinent", "Assez pertinent", "Peu pertinent", "Pas pertinent"],
        is_required: true,
      },
      {
        question_text: "Quels aspects de l'événement avez-vous le plus apprécié ?",
        question_type: "checkbox",
        options: ["Les présentations", "Le networking", "L'organisation", "Le lieu", "La restauration"],
        is_required: false,
      },
      {
        question_text: "L'événement a-t-il répondu à vos attentes ?",
        question_type: "radio",
        options: ["A dépassé mes attentes", "A répondu à mes attentes", "Partiellement", "Non"],
        is_required: true,
      },
      {
        question_text: "Participeriez-vous à un prochain événement ?",
        question_type: "radio",
        options: ["Oui, certainement", "Probablement", "Peut-être", "Non"],
        is_required: true,
      },
      {
        question_text: "Avez-vous des suggestions pour améliorer nos futurs événements ?",
        question_type: "textarea",
        is_required: false,
      },
    ],
  },
  {
    id: "market-research",
    name: "Étude de Marché",
    description: "Comprenez les besoins et préférences de votre marché cible",
    icon: <ShoppingCart className="w-5 h-5" />,
    category: "Marketing",
    questions: [
      {
        question_text: "Quelle est votre tranche d'âge ?",
        question_type: "radio",
        options: ["18-24 ans", "25-34 ans", "35-44 ans", "45-54 ans", "55+ ans"],
        is_required: true,
      },
      {
        question_text: "Quelle est votre situation professionnelle ?",
        question_type: "radio",
        options: ["Étudiant", "Employé", "Indépendant", "Dirigeant", "Retraité", "Autre"],
        is_required: true,
      },
      {
        question_text: "Comment avez-vous entendu parler de notre produit/service ?",
        question_type: "radio",
        options: ["Réseaux sociaux", "Moteur de recherche", "Recommandation", "Publicité", "Autre"],
        is_required: true,
      },
      {
        question_text: "Quels critères sont les plus importants pour vous lors d'un achat ?",
        question_type: "checkbox",
        options: ["Prix", "Qualité", "Marque", "Avis clients", "Service après-vente", "Délai de livraison"],
        is_required: true,
      },
      {
        question_text: "Quel budget seriez-vous prêt à consacrer à ce type de produit/service ?",
        question_type: "radio",
        options: ["Moins de 50€", "50-100€", "100-200€", "200-500€", "Plus de 500€"],
        is_required: false,
      },
      {
        question_text: "Qu'est-ce qui vous motiverait à essayer un nouveau produit/service ?",
        question_type: "textarea",
        is_required: false,
      },
    ],
  },
];

interface SurveyTemplatesProps {
  onSelectTemplate: (template: SurveyTemplate) => void;
}

export function SurveyTemplates({ onSelectTemplate }: SurveyTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(SURVEY_TEMPLATES.map(t => t.category))];
  const filteredTemplates = selectedCategory
    ? SURVEY_TEMPLATES.filter(t => t.category === selectedCategory)
    : SURVEY_TEMPLATES;

  const handleSelect = (template: SurveyTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LayoutTemplate className="w-4 h-4" />
          <span className="hidden sm:inline">Utiliser un template</span>
          <span className="sm:hidden">Template</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary" />
            Templates d'enquêtes
          </DialogTitle>
        </DialogHeader>

        {/* Categories filter */}
        <div className="flex flex-wrap gap-2 py-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Tous
          </Badge>
          {categories.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-3">
            {filteredTemplates.map(template => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => handleSelect(template)}
              >
                <CardHeader className="pb-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        {template.icon}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs mt-1 line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {template.questions.length} questions
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export { SURVEY_TEMPLATES };
