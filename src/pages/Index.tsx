import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Lightbulb, Link2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-sidebar/20 to-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6 shadow-vault animate-pulse">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-cyan-muted to-primary bg-clip-text text-transparent">
            VaultKeep
          </h1>
          <p className="text-2xl text-muted-foreground max-w-2xl mx-auto">
            Votre coffre-fort digital personnel pour tout organiser
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-vault">
              <Lock className="w-5 h-5 mr-2" />
              Commencer gratuitement
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-vault hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Liens organisés</h3>
            <p className="text-muted-foreground">
              Centralisez et catégorisez tous vos liens importants en un seul endroit sécurisé
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-vault hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Comptes sécurisés</h3>
            <p className="text-muted-foreground">
              Gérez vos mots de passe, emails et accès cPanel en toute sécurité
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-vault hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Idées enrichies par l'IA</h3>
            <p className="text-muted-foreground">
              Capturez vos idées et obtenez des suggestions intelligentes pour les développer
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 p-12 rounded-3xl bg-gradient-to-br from-sidebar to-sidebar-accent shadow-vault">
          <h2 className="text-3xl font-bold text-sidebar-foreground mb-4">
            Prêt à tout organiser ?
          </h2>
          <p className="text-sidebar-foreground/80 mb-6 max-w-xl mx-auto">
            Rejoignez VaultKeep et découvrez une nouvelle façon de gérer vos informations
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            variant="secondary"
            className="shadow-lg"
          >
            Créer mon compte
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
