import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp, Lightbulb, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";

import { supabase } from "@/integrations/supabase/client";

interface DigestData {
  summary: string;
  tips: string[];
  priorities: string[];
  encouragement: string;
}

export function AIProductivityDigest() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const { getData, isInitialized } = useLocalDatabase();

  useEffect(() => {
    // Load cached digest
    const cached = localStorage.getItem("vk-daily-digest");
    const cachedDate = localStorage.getItem("vk-daily-digest-date");
    if (cached && cachedDate) {
      const today = new Date().toDateString();
      if (cachedDate === today) {
        try {
          setDigest(JSON.parse(cached));
          setLastGenerated(cachedDate);
        } catch { /* ignore */ }
      }
    }
  }, []);

  const generateDigest = async () => {
    if (!isInitialized) return;
    setLoading(true);

    try {
      const [accounts, links, ideas, notes, reminders] = await Promise.all([
        getData("accounts"),
        getData("links"),
        getData("ideas"),
        getData("notes"),
        getData("reminders"),
      ]);

      const activeReminders = (reminders as any[]).filter((r: any) => !r.is_completed);
      const recentIdeas = (ideas as any[]).filter((i: any) => {
        const d = new Date(i.created_at);
        const week = new Date();
        week.setDate(week.getDate() - 7);
        return d > week;
      });

      const context = `
L'utilisateur a:
- ${accounts.length} comptes enregistrés
- ${links.length} liens sauvegardés
- ${ideas.length} idées (${recentIdeas.length} cette semaine)
- ${(notes as any[]).length} notes
- ${activeReminders.length} rappels actifs
${activeReminders.length > 0 ? `\nRappels en attente:\n${activeReminders.slice(0, 5).map((r: any) => `- ${(r as any).title} (${new Date((r as any).remind_at).toLocaleDateString("fr-FR")})`).join("\n")}` : ""}
${recentIdeas.length > 0 ? `\nIdées récentes:\n${recentIdeas.slice(0, 3).map((i: any) => `- ${(i as any).title}`).join("\n")}` : ""}
      `.trim();

      const { data, error } = await supabase.functions.invoke("ai-daily-digest", {
        body: { context },
      });

      if (error) throw error;

      const digestData = data as DigestData;
      setDigest(digestData);
      const today = new Date().toDateString();
      setLastGenerated(today);
      localStorage.setItem("vk-daily-digest", JSON.stringify(digestData));
      localStorage.setItem("vk-daily-digest-date", today);
    } catch (error) {
      console.error("Error generating digest:", error);
      // Fallback digest
      setDigest({
        summary: "Votre coffre-fort est actif ! Continuez à organiser vos données pour rester productif.",
        tips: ["Vérifiez vos rappels du jour", "Ajoutez des mots de passe manquants à vos comptes"],
        priorities: ["Traiter les rappels en retard"],
        encouragement: "Chaque action compte vers une vie numérique mieux organisée ! 🚀",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-3 sm:p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Digest IA quotidien
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastGenerated && (
              <Badge variant="outline" className="text-[10px]">
                Aujourd'hui
              </Badge>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          {!digest && !loading && (
            <div className="text-center py-4 space-y-3">
              <Sparkles className="w-8 h-8 text-primary mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground">
                Obtenez un résumé personnalisé de votre activité et des suggestions intelligentes
              </p>
              <Button onClick={generateDigest} size="sm" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Générer mon digest
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analyse en cours...</span>
            </div>
          )}

          {digest && !loading && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-foreground leading-relaxed">{digest.summary}</p>
              </div>

              {/* Priorities */}
              {digest.priorities.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Priorités du jour
                  </p>
                  {digest.priorities.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground bg-amber-500/5 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {digest.tips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-primary flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Suggestions
                  </p>
                  {digest.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Encouragement */}
              <p className="text-xs text-center text-muted-foreground italic">{digest.encouragement}</p>

              {/* Refresh */}
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={generateDigest}>
                <RefreshCw className="w-3 h-3" />
                Régénérer
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
