import { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Lightbulb,
  Shield,
  Clock,
  Zap
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";

interface Suggestion {
  id: string;
  type: "security" | "productivity" | "reminder" | "insight";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
}

const typeConfig = {
  security: {
    icon: Shield,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  productivity: {
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  reminder: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  insight: {
    icon: Lightbulb,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
};

const priorityColors = {
  high: "border-destructive",
  medium: "border-yellow-500",
  low: "border-muted",
};

export function SmartSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { getData, pendingCount, isOnline } = useLocalDatabase();

  useEffect(() => {
    const generateSuggestions = async () => {
      const newSuggestions: Suggestion[] = [];

      // Check for pending sync
      if (pendingCount > 0 && isOnline) {
        newSuggestions.push({
          id: "sync-pending",
          type: "productivity",
          priority: "medium",
          title: "Synchronisation en attente",
          description: `${pendingCount} modification(s) en attente de synchronisation.`,
          actionLabel: "Synchroniser",
        });
      }

      // Check for accounts without passwords
      const accounts = await getData<any>("accounts");
      const accountsWithoutPassword = accounts.filter(
        (a: any) => !a.password_encrypted
      );
      if (accountsWithoutPassword.length > 0) {
        newSuggestions.push({
          id: "accounts-no-password",
          type: "security",
          priority: "high",
          title: "Comptes sans mot de passe",
          description: `${accountsWithoutPassword.length} compte(s) n'ont pas de mot de passe enregistré.`,
          actionLabel: "Voir les comptes",
        });
      }

      // Check for old accounts (created more than 6 months ago)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const oldAccounts = accounts.filter(
        (a: any) => new Date(a.created_at) < sixMonthsAgo
      );
      if (oldAccounts.length > 0) {
        newSuggestions.push({
          id: "old-accounts",
          type: "security",
          priority: "medium",
          title: "Vérifiez vos anciens comptes",
          description: `${oldAccounts.length} compte(s) ont plus de 6 mois. Pensez à mettre à jour les mots de passe.`,
        });
      }

      // Check for upcoming reminders
      const reminders = await getData<any>("reminders");
      const upcomingReminders = reminders.filter((r: any) => {
        const remindAt = new Date(r.remind_at);
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return remindAt > now && remindAt < threeDays && !r.is_completed;
      });
      if (upcomingReminders.length > 0) {
        newSuggestions.push({
          id: "upcoming-reminders",
          type: "reminder",
          priority: "medium",
          title: "Rappels à venir",
          description: `${upcomingReminders.length} rappel(s) prévu(s) dans les 3 prochains jours.`,
          actionLabel: "Voir les rappels",
        });
      }

      // Check for ideas without AI suggestions
      const ideas = await getData<any>("ideas");
      const ideasWithoutAI = ideas.filter((i: any) => !i.ai_suggestions);
      if (ideasWithoutAI.length > 0) {
        newSuggestions.push({
          id: "ideas-no-ai",
          type: "insight",
          priority: "low",
          title: "Enrichissez vos idées avec l'IA",
          description: `${ideasWithoutAI.length} idée(s) peuvent être enrichies avec des suggestions IA.`,
          actionLabel: "Voir les idées",
        });
      }

      // Productivity insight
      const links = await getData<any>("links");
      const categories = await getData<any>("categories");
      
      if (links.length > 10 && categories.length === 0) {
        newSuggestions.push({
          id: "organize-links",
          type: "productivity",
          priority: "low",
          title: "Organisez vos liens",
          description: "Vous avez beaucoup de liens. Créez des catégories pour mieux les organiser.",
          actionLabel: "Créer une catégorie",
        });
      }

      // Statistics insight
      const totalItems = accounts.length + links.length + ideas.length;
      if (totalItems > 50) {
        newSuggestions.push({
          id: "power-user",
          type: "insight",
          priority: "low",
          title: "Utilisateur expérimenté!",
          description: `Vous gérez ${totalItems} éléments. Pensez à faire une sauvegarde régulière.`,
        });
      }

      // Filter out dismissed suggestions
      setSuggestions(
        newSuggestions.filter((s) => !dismissed.has(s.id))
      );
    };

    generateSuggestions();
  }, [getData, pendingCount, isOnline, dismissed]);

  const dismissSuggestion = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          Suggestions intelligentes
        </CardTitle>
        <CardDescription>
          Optimisez votre utilisation de VaultKeep
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 4).map((suggestion) => {
          const config = typeConfig[suggestion.type];
          const Icon = config.icon;
          
          return (
            <div
              key={suggestion.id}
              className={cn(
                "p-3 rounded-lg border-l-4 bg-card/50 backdrop-blur transition-all hover:bg-card",
                priorityColors[suggestion.priority]
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    {suggestion.priority === "high" && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Important
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {suggestion.actionLabel && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                        {suggestion.actionLabel}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground ml-auto"
                      onClick={() => dismissSuggestion(suggestion.id)}
                    >
                      Ignorer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}