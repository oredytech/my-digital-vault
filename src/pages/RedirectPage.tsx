import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, AlertTriangle } from "lucide-react";

const RedirectPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<"loading" | "password" | "error" | "expired">("loading");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const resolveLink = async (pwd?: string) => {
    if (!slug) {
      setStatus("error");
      setErrorMsg("Lien invalide");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("redirect-short-link", {
        body: { slug, password: pwd },
      });

      if (error) {
        setStatus("error");
        setErrorMsg("Impossible de résoudre ce lien");
        return;
      }

      if (data.password_required) {
        setStatus("password");
        if (pwd) setErrorMsg("Mot de passe incorrect");
        return;
      }

      if (data.error === "Link expired") {
        setStatus("expired");
        return;
      }

      if (data.error) {
        setStatus("error");
        setErrorMsg(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setStatus("error");
      setErrorMsg("Erreur de connexion");
    }
  };

  useEffect(() => {
    resolveLink();
  }, [slug]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    resolveLink(password);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  if (status === "password") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Lock className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Lien protégé</h1>
          <p className="text-muted-foreground">Ce lien est protégé par un mot de passe.</p>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez le mot de passe"
              className="rounded-xl"
              required
            />
            <Button type="submit" className="w-full rounded-xl">Accéder</Button>
          </form>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Lien expiré</h1>
          <p className="text-muted-foreground">Ce lien court a expiré et n'est plus disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Lien introuvable</h1>
        <p className="text-muted-foreground">{errorMsg || "Ce lien court n'existe pas ou a été désactivé."}</p>
      </div>
    </div>
  );
};

export default RedirectPage;
