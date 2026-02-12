import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle,
  ChevronDown, ChevronUp, Lock, KeyRound, RefreshCw,
  Wand2, Copy, Check, Eye, EyeOff, ExternalLink, Mail
} from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function generateSecurePassword(length = 20): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*_+-=?";
  const all = upper + lower + nums + syms;
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  const chars = Array.from(arr, (v) => all[v % all.length]);
  // Ensure at least one of each type
  const rnd = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  chars[0] = rnd(upper);
  chars[1] = rnd(lower);
  chars[2] = rnd(nums);
  chars[3] = rnd(syms);
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

interface FixDialogState {
  open: boolean;
  issue: SecurityIssue | null;
  generatedPassword: string;
  showPassword: boolean;
  copied: boolean;
  saving: boolean;
  emailInput: string;
}

export function SecurityHealthDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [securityScore, setSecurityScore] = useState(100);
  const [expanded, setExpanded] = useState(true);
  const { getData, isInitialized } = useLocalDatabase();
  const [fixDialog, setFixDialog] = useState<FixDialogState>({
    open: false, issue: null, generatedPassword: "", showPassword: false, copied: false, saving: false, emailInput: "",
  });

  useEffect(() => {
    if (isInitialized) analyze();
  }, [isInitialized]);

  const analyze = useCallback(async () => {
    const accs = await getData<Account>("accounts");
    setAccounts(accs);

    const foundIssues: SecurityIssue[] = [];
    const passwords = new Map<string, Account[]>();

    accs.forEach((acc) => {
      if (!acc.password_encrypted) {
        foundIssues.push({ type: "no_password", severity: "critical", account: acc, message: "Aucun mot de passe enregistré" });
      } else {
        const strength = evaluatePasswordStrength(acc.password_encrypted);
        if (strength.score < 50) {
          foundIssues.push({ type: "weak_password", severity: "warning", account: acc, message: `Mot de passe faible (${strength.label})` });
        }
        const existing = passwords.get(acc.password_encrypted) || [];
        existing.push(acc);
        passwords.set(acc.password_encrypted, existing);
      }

      if (!acc.email) {
        foundIssues.push({ type: "no_email", severity: "info", account: acc, message: "Aucun email de récupération" });
      }

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

    passwords.forEach((accsWithPwd) => {
      if (accsWithPwd.length > 1) {
        accsWithPwd.forEach((acc) => {
          foundIssues.push({ type: "reused_password", severity: "critical", account: acc, message: `Mot de passe réutilisé sur ${accsWithPwd.length} comptes` });
        });
      }
    });

    setIssues(foundIssues);

    const totalAccounts = accs.length || 1;
    const criticals = foundIssues.filter((i) => i.severity === "critical").length;
    const warnings = foundIssues.filter((i) => i.severity === "warning").length;
    const infos = foundIssues.filter((i) => i.severity === "info").length;
    const penalty = criticals * 15 + warnings * 8 + infos * 3;
    setSecurityScore(Math.max(0, Math.min(100, 100 - Math.round((penalty / totalAccounts) * 10))));
  }, [getData, isInitialized]);

  const openFixDialog = (issue: SecurityIssue) => {
    const needsPassword = ["no_password", "weak_password", "reused_password"].includes(issue.type);
    setFixDialog({
      open: true,
      issue,
      generatedPassword: needsPassword ? generateSecurePassword() : "",
      showPassword: false,
      copied: false,
      saving: false,
      emailInput: issue.account.email || "",
    });
  };

  const regeneratePassword = () => {
    setFixDialog((prev) => ({ ...prev, generatedPassword: generateSecurePassword(), copied: false }));
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(fixDialog.generatedPassword);
    setFixDialog((prev) => ({ ...prev, copied: true }));
    toast.success("Mot de passe copié !");
    setTimeout(() => setFixDialog((prev) => ({ ...prev, copied: false })), 2000);
  };

  const applyPasswordFix = async () => {
    if (!fixDialog.issue) return;
    setFixDialog((prev) => ({ ...prev, saving: true }));
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ password_encrypted: fixDialog.generatedPassword })
        .eq("id", fixDialog.issue.account.id);
      if (error) throw error;
      toast.success(`Mot de passe mis à jour pour "${fixDialog.issue.account.name}"`);
      setFixDialog((prev) => ({ ...prev, open: false }));
      await analyze();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setFixDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const applyEmailFix = async () => {
    if (!fixDialog.issue || !fixDialog.emailInput.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixDialog.emailInput)) {
      toast.error("Email invalide");
      return;
    }
    setFixDialog((prev) => ({ ...prev, saving: true }));
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ email: fixDialog.emailInput.trim() })
        .eq("id", fixDialog.issue.account.id);
      if (error) throw error;
      toast.success(`Email ajouté pour "${fixDialog.issue.account.name}"`);
      setFixDialog((prev) => ({ ...prev, open: false }));
      await analyze();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setFixDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const getFixAction = (issue: SecurityIssue) => {
    switch (issue.type) {
      case "no_password":
      case "weak_password":
      case "reused_password":
        return { label: "Corriger", icon: Wand2 };
      case "no_email":
        return { label: "Ajouter", icon: Mail };
      case "expired":
      case "expiring_soon":
        return { label: "Voir", icon: ExternalLink };
      default:
        return null;
    }
  };

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const scoreColor = securityScore >= 80 ? "text-green-500" : securityScore >= 50 ? "text-amber-500" : "text-destructive";
  const ScoreIcon = securityScore >= 80 ? ShieldCheck : securityScore >= 50 ? Shield : ShieldAlert;

  if (accounts.length === 0) return null;

  const isPasswordIssue = fixDialog.issue && ["no_password", "weak_password", "reused_password"].includes(fixDialog.issue.type);
  const isEmailIssue = fixDialog.issue?.type === "no_email";
  const isExpirationIssue = fixDialog.issue && ["expired", "expiring_soon"].includes(fixDialog.issue.type);

  return (
    <>
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

            {/* Issues list with fix buttons */}
            {issues.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {issues.slice(0, 15).map((issue, idx) => {
                  const action = getFixAction(issue);
                  const ActionIcon = action?.icon;
                  return (
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
                      {action && ActionIcon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 flex-shrink-0 hover:bg-background/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFixDialog(issue);
                          }}
                        >
                          <ActionIcon className="w-3 h-3" />
                          {action.label}
                        </Button>
                      )}
                    </div>
                  );
                })}
                {issues.length > 15 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    +{issues.length - 15} autres problèmes
                  </p>
                )}
              </div>
            )}

            {/* Bulk fix for criticals */}
            {criticalCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => {
                  const firstCritical = issues.find((i) => i.severity === "critical");
                  if (firstCritical) openFixDialog(firstCritical);
                }}
              >
                <Wand2 className="w-3 h-3" />
                Corriger le problème critique suivant
              </Button>
            )}

            {/* Refresh */}
            <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={analyze}>
              <RefreshCw className="w-3 h-3" />
              Réanalyser
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Fix Dialog */}
      <Dialog open={fixDialog.open} onOpenChange={(open) => setFixDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isPasswordIssue && <><KeyRound className="w-5 h-5 text-primary" /> Corriger le mot de passe</>}
              {isEmailIssue && <><Mail className="w-5 h-5 text-primary" /> Ajouter un email de récupération</>}
              {isExpirationIssue && <><AlertTriangle className="w-5 h-5 text-amber-500" /> Compte expiré</>}
            </DialogTitle>
          </DialogHeader>

          {fixDialog.issue && (
            <div className="space-y-4">
              {/* Account info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">{fixDialog.issue.account.name}</p>
                <p className="text-xs text-muted-foreground">{fixDialog.issue.message}</p>
                {fixDialog.issue.account.website_url && (
                  <a
                    href={fixDialog.issue.account.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {fixDialog.issue.account.website_url}
                  </a>
                )}
              </div>

              {/* Password fix */}
              {isPasswordIssue && (
                <div className="space-y-3">
                  <Label className="text-sm">Nouveau mot de passe généré</Label>
                  <div className="relative">
                    <Input
                      value={fixDialog.generatedPassword}
                      readOnly
                      type={fixDialog.showPassword ? "text" : "password"}
                      className="pr-20 font-mono text-sm"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setFixDialog((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                      >
                        {fixDialog.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyPassword}>
                        {fixDialog.copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Strength indicator */}
                  {fixDialog.generatedPassword && (() => {
                    const s = evaluatePasswordStrength(fixDialog.generatedPassword);
                    return (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={cn("w-4 h-4", s.color)} />
                        <span className={cn("text-xs font-medium", s.color)}>{s.label}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all", s.score >= 80 ? "bg-green-500" : s.score >= 50 ? "bg-amber-500" : "bg-destructive")}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={regeneratePassword}>
                    <RefreshCw className="w-3 h-3" />
                    Régénérer
                  </Button>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Copiez le mot de passe avant de l'appliquer. Rendez-vous ensuite sur le site pour le changer manuellement.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline" className="flex-1"
                      onClick={() => setFixDialog((prev) => ({ ...prev, open: false }))}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="flex-1 gap-1"
                      onClick={applyPasswordFix}
                      disabled={fixDialog.saving}
                    >
                      {fixDialog.saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Appliquer
                    </Button>
                  </div>
                </div>
              )}

              {/* Email fix */}
              {isEmailIssue && (
                <div className="space-y-3">
                  <Label className="text-sm">Email de récupération</Label>
                  <Input
                    type="email"
                    placeholder="exemple@email.com"
                    value={fixDialog.emailInput}
                    onChange={(e) => setFixDialog((prev) => ({ ...prev, emailInput: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline" className="flex-1"
                      onClick={() => setFixDialog((prev) => ({ ...prev, open: false }))}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="flex-1 gap-1"
                      onClick={applyEmailFix}
                      disabled={fixDialog.saving || !fixDialog.emailInput.trim()}
                    >
                      {fixDialog.saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              )}

              {/* Expiration info */}
              {isExpirationIssue && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Ce compte nécessite un renouvellement. Rendez-vous sur le site du service pour prolonger votre abonnement.
                    </p>
                  </div>
                  {fixDialog.issue.account.website_url && (
                    <Button asChild className="w-full gap-1">
                      <a href={fixDialog.issue.account.website_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Ouvrir le site
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline" className="w-full"
                    onClick={() => setFixDialog((prev) => ({ ...prev, open: false }))}
                  >
                    Fermer
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
