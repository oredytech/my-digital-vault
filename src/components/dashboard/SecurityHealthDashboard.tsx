import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, Lock, KeyRound, RefreshCw } from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  email: string | null;
  password_encrypted: string | null;
  website_url: string | null;
  duration_months: number | null;
  created_at: string;
}

interface SecurityIssue {
  type: "no_password" | "weak_password" | "reused_password" | "expiring_soon" | "expired" | "no_email";
  severity: "critical" | "warning" | "info";
  account: Account;
  message: string;
}

function evaluatePasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (!/(.)\1{2,}/.test(password)) score += 10;

  if (score >= 80) return { score, label: "Fort", color: "text-green-500" };
  if (score >= 50) return { score, label: "Moyen", color: "text-amber-500" };
  return { score, label: "Faible", color: "text-destructive" };
}

export function SecurityHealthDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [securityScore, setSecurityScore] = useState(100);
  const [expanded, setExpanded] = useState(true);
  const { getData, isInitialized } = useLocalDatabase();

  useEffect(() => {
    if (isInitialized) analyze();
  }, [isInitialized]);

  const analyze = async () => {
    const accs = await getData<Account>("accounts");
    setAccounts(accs);

    const foundIssues: SecurityIssue[] = [];
    const passwords = new Map<string, Account[]>();

    accs.forEach((acc) => {
      // No password
      if (!acc.password_encrypted) {
        foundIssues.push({ type: "no_password", severity: "critical", account: acc, message: `Aucun mot de passe enregistré` });
      } else {
        // Weak password
        const strength = evaluatePasswordStrength(acc.password_encrypted);
        if (strength.score < 50) {
          foundIssues.push({ type: "weak_password", severity: "warning", account: acc, message: `Mot de passe faible (${strength.label})` });
        }
        // Track for reuse detection
        const existing = passwords.get(acc.password_encrypted) || [];
        existing.push(acc);
        passwords.set(acc.password_encrypted, existing);
      }

      // No email
      if (!acc.email) {
        foundIssues.push({ type: "no_email", severity: "info", account: acc, message: `Aucun email de récupération` });
      }

      // Expiration
      if (acc.duration_months) {
        const created = new Date(acc.created_at);
        const expires = new Date(created);
        expires.setMonth(expires.getMonth() + acc.duration_months);
        const now = new Date();
        const monthAway = new Date();
        monthAway.setMonth(monthAway.getMonth() + 1);

        if (expires < now) {
          foundIssues.push({ type: "expired", severity: "critical", account: acc, message: `Compte expiré depuis le ${expires.toLocaleDateString("fr-FR")}` });
        } else if (expires < monthAway) {
          foundIssues.push({ type: "expiring_soon", severity: "warning", account: acc, message: `Expire le ${expires.toLocaleDateString("fr-FR")}` });
        }
      }
    });

    // Reused passwords
    passwords.forEach((accsWithPwd) => {
      if (accsWithPwd.length > 1) {
        accsWithPwd.forEach((acc) => {
          foundIssues.push({
            type: "reused_password",
            severity: "critical",
            account: acc,
            message: `Mot de passe réutilisé sur ${accsWithPwd.length} comptes`,
          });
        });
      }
    });

    setIssues(foundIssues);

    // Calculate score
    const totalAccounts = accs.length || 1;
    const criticals = foundIssues.filter((i) => i.severity === "critical").length;
    const warnings = foundIssues.filter((i) => i.severity === "warning").length;
    const infos = foundIssues.filter((i) => i.severity === "info").length;
    const penalty = (criticals * 15 + warnings * 8 + infos * 3);
    setSecurityScore(Math.max(0, Math.min(100, 100 - Math.round(penalty / totalAccounts * 10))));
  };

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  const scoreColor = securityScore >= 80 ? "text-green-500" : securityScore >= 50 ? "text-amber-500" : "text-destructive";
  const ScoreIcon = securityScore >= 80 ? ShieldCheck : securityScore >= 50 ? Shield : ShieldAlert;

  if (accounts.length === 0) return null;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-3 sm:p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <ScoreIcon className={cn("w-5 h-5", scoreColor)} />
            Santé sécuritaire
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={cn("text-xl sm:text-2xl font-bold tabular-nums", scoreColor)}>
              {securityScore}%
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        <Progress value={securityScore} className="h-2 mt-2" />
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-500">
              <Lock className="w-3 h-3" />
              {accounts.length} comptes analysés
            </Badge>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                {criticalCount} critique{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-500/30 text-amber-500">
                <AlertTriangle className="w-3 h-3" />
                {warningCount} avertissement{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
            {issues.length === 0 && (
              <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-500">
                <ShieldCheck className="w-3 h-3" />
                Tout est en ordre !
              </Badge>
            )}
          </div>

          {/* Issues list */}
          {issues.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {issues.slice(0, 10).map((issue, idx) => (
                <div
                  key={`${issue.account.id}-${issue.type}-${idx}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                    issue.severity === "critical" && "bg-destructive/10 text-destructive",
                    issue.severity === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    issue.severity === "info" && "bg-muted text-muted-foreground"
                  )}
                >
                  {issue.severity === "critical" ? (
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : issue.severity === "warning" ? (
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="font-medium truncate">{issue.account.name}</span>
                  <span className="text-[10px] opacity-75 truncate flex-1">{issue.message}</span>
                </div>
              ))}
              {issues.length > 10 && (
                <p className="text-[10px] text-muted-foreground text-center py-1">
                  +{issues.length - 10} autres problèmes
                </p>
              )}
            </div>
          )}

          {/* Refresh */}
          <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={analyze}>
            <RefreshCw className="w-3 h-3" />
            Réanalyser
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
