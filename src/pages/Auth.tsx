import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Lock, WifiOff } from "lucide-react";
import { vaultKeepDB } from "@/lib/indexedDB";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineSignup, setShowOfflineSignup] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      if (isOnline) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Store credentials locally for offline use
          vaultKeepDB.setCurrentUser(session.user.id);
          navigate("/dashboard");
        }
      }
    };
    checkUser();
  }, [navigate, isOnline]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isOnline) {
      // Create offline account
      try {
        const { userId } = await vaultKeepDB.createOfflineAccount(email, password, fullName);
        vaultKeepDB.setCurrentUser(userId);
        toast.success("Compte hors-ligne créé ! Vos données seront synchronisées à la prochaine connexion.");
        navigate("/dashboard");
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de la création du compte");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Store credentials locally for offline authentication
      if (data.user) {
        await vaultKeepDB.saveCredentials(email, password, data.user.id, fullName);
        vaultKeepDB.setCurrentUser(data.user.id);
      }

      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isOnline) {
        // Online login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Store/update credentials locally for future offline use
        if (data.user) {
          await vaultKeepDB.saveCredentials(
            email,
            password,
            data.user.id,
            data.user.user_metadata?.full_name
          );
          vaultKeepDB.setCurrentUser(data.user.id);
        }

        toast.success("Connexion réussie !");
        navigate("/dashboard");
      } else {
        // Offline login - verify against stored credentials
        const result = await vaultKeepDB.verifyOfflineCredentials(email, password);

        if (result.valid && result.userId) {
          vaultKeepDB.setCurrentUser(result.userId);
          toast.success("Connexion hors-ligne réussie !");
          navigate("/dashboard");
        } else {
          toast.error("Identifiants incorrects ou aucun compte enregistré localement");
        }
      }
    } catch (error: any) {
      console.error("Signin error:", error);
      
      // If online login fails, try offline
      if (!isOnline || error.message?.includes("network") || error.message?.includes("fetch")) {
        const result = await vaultKeepDB.verifyOfflineCredentials(email, password);
        if (result.valid && result.userId) {
          vaultKeepDB.setCurrentUser(result.userId);
          toast.success("Connexion hors-ligne réussie !");
          navigate("/dashboard");
          return;
        }
      }
      
      toast.error(error.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-sidebar to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 shadow-vault">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-cyan-muted bg-clip-text text-transparent">
            VaultKeep
          </h1>
          <p className="text-muted-foreground">Votre coffre-fort digital personnel</p>
          
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Mode hors-ligne</span>
            </div>
          )}
        </div>

        <Card className="border-border/50 shadow-vault backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle className="text-center">Accès sécurisé</CardTitle>
            <CardDescription className="text-center">
              {isOnline 
                ? "Gérez vos informations en toute sécurité"
                : "Connectez-vous avec un compte déjà enregistré"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {!isOnline && <WifiOff className="w-4 h-4 mr-2" />}
                    {isOnline && <Lock className="w-4 h-4 mr-2" />}
                    {loading ? "Connexion..." : isOnline ? "Se connecter" : "Connexion hors-ligne"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {!isOnline && (
                  <div className="mb-4 bg-amber-500/10 text-amber-500 rounded-lg p-3 text-sm">
                    <p className="font-medium">Création de compte hors-ligne</p>
                    <p className="text-xs mt-1 opacity-80">
                      Vos données seront stockées localement et synchronisées lorsque vous serez connecté.
                    </p>
                  </div>
                )}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Votre nom"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {!isOnline && <WifiOff className="w-4 h-4 mr-2" />}
                    {isOnline && <Shield className="w-4 h-4 mr-2" />}
                    {loading ? "Création..." : isOnline ? "Créer un compte" : "Créer un compte hors-ligne"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
