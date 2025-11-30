import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { LinksSection } from "@/components/dashboard/LinksSection";
import { AccountsSection } from "@/components/dashboard/AccountsSection";
import { IdeasSection } from "@/components/dashboard/IdeasSection";
import { toast } from "sonner";

type ActiveSection = "links" | "accounts" | "ideas" | "reminders";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>("links");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-sidebar/20 to-background">
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onSignOut={handleSignOut}
        />
        
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            {activeSection === "links" && <LinksSection />}
            {activeSection === "accounts" && <AccountsSection />}
            {activeSection === "ideas" && <IdeasSection />}
            {activeSection === "reminders" && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">Rappels</h2>
                <p className="text-muted-foreground">Section en cours de développement</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
