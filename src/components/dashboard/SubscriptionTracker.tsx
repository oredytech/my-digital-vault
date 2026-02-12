import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, DollarSign, Calendar } from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";


interface Account {
  id: string;
  name: string;
  duration_months: number | null;
  created_at: string;
  notes: string | null;
  website_url: string | null;
}

interface Subscription {
  account: Account;
  monthlyCost: number;
  expiresAt: Date | null;
  isActive: boolean;
}

function extractCostFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  // Try to find cost patterns like "15€/mois", "9.99€", "$19.99/month", "prix: 25€"
  const patterns = [
    /(\d+[.,]\d{1,2})\s*€/i,
    /(\d+)\s*€/i,
    /€\s*(\d+[.,]\d{1,2})/i,
    /(\d+[.,]\d{1,2})\s*\$/i,
    /prix\s*:?\s*(\d+[.,]\d{1,2})/i,
    /coût\s*:?\s*(\d+[.,]\d{1,2})/i,
    /cost\s*:?\s*(\d+[.,]\d{1,2})/i,
    /(\d+[.,]\d{1,2})\s*\/\s*mois/i,
    /(\d+[.,]\d{1,2})\s*\/\s*month/i,
    /(\d+[.,]\d{1,2})\s*\/\s*an/i,
  ];
  
  for (const pattern of patterns) {
    const match = notes.match(pattern);
    if (match) {
      const cost = parseFloat(match[1].replace(",", "."));
      // If it's per year, convert to monthly
      if (notes.match(/\/\s*an/i)) return cost / 12;
      return cost;
    }
  }
  return null;
}

export function SubscriptionTracker() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expanded, setExpanded] = useState(true);
  const { getData, isInitialized } = useLocalDatabase();

  useEffect(() => {
    if (isInitialized) loadSubscriptions();
  }, [isInitialized]);

  const loadSubscriptions = async () => {
    const accounts = await getData<Account>("accounts");
    
    // Accounts with duration_months are likely subscriptions
    const subs: Subscription[] = accounts
      .filter((a) => a.duration_months)
      .map((acc) => {
        const created = new Date(acc.created_at);
        const expires = new Date(created);
        expires.setMonth(expires.getMonth() + (acc.duration_months || 0));
        const isActive = expires > new Date();
        const monthlyCost = extractCostFromNotes(acc.notes) || 0;

        return { account: acc, monthlyCost, expiresAt: expires, isActive };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0);
      });

    setSubscriptions(subs);
  };

  const activeSubs = subscriptions.filter((s) => s.isActive);
  const totalMonthlyCost = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);
  const totalYearlyCost = totalMonthlyCost * 12;
  const expiringSoon = activeSubs.filter((s) => {
    if (!s.expiresAt) return false;
    const monthAway = new Date();
    monthAway.setMonth(monthAway.getMonth() + 1);
    return s.expiresAt < monthAway;
  });

  if (subscriptions.length === 0) return null;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-3 sm:p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Abonnements & Services
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {activeSubs.length} actif{activeSubs.length > 1 ? "s" : ""}
            </Badge>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          {/* Cost summary */}
          {totalMonthlyCost > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-primary/10 rounded-xl p-3 text-center">
                <DollarSign className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{totalMonthlyCost.toFixed(2)}€</p>
                <p className="text-[10px] text-muted-foreground">par mois</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{totalYearlyCost.toFixed(0)}€</p>
                <p className="text-[10px] text-muted-foreground">par an</p>
              </div>
            </div>
          )}

          {totalMonthlyCost === 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">
                💡 Ajoutez le coût dans les notes de vos comptes (ex: "15€/mois") pour suivre vos dépenses
              </p>
            </div>
          )}

          {/* Expiring soon */}
          {expiringSoon.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Expirent bientôt
              </p>
              {expiringSoon.map((sub) => (
                <div key={sub.account.id} className="flex items-center justify-between bg-amber-500/10 rounded-lg px-3 py-2 text-xs">
                  <span className="font-medium text-foreground truncate">{sub.account.name}</span>
                  <span className="text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2">
                    {sub.expiresAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Subscription list */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {activeSubs.map((sub) => {
              const daysLeft = sub.expiresAt
                ? Math.max(0, Math.ceil((sub.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 0;
              const totalDays = sub.account.duration_months ? sub.account.duration_months * 30 : 1;
              const progress = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));

              return (
                <div key={sub.account.id} className="bg-muted/30 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate">{sub.account.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {sub.monthlyCost > 0 && (
                        <span className="text-muted-foreground">{sub.monthlyCost}€/m</span>
                      )}
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {daysLeft}j
                      </span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
