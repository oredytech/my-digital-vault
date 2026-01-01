import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { LinksSection } from "@/components/dashboard/LinksSection";
import { AccountsSection } from "@/components/dashboard/AccountsSection";
import { IdeasSection } from "@/components/dashboard/IdeasSection";
import { RemindersSection } from "@/components/dashboard/RemindersSection";
import { CategoriesSection } from "@/components/dashboard/CategoriesSection";
import { StatisticsSection } from "@/components/dashboard/StatisticsSection";
import { TrashSection } from "@/components/dashboard/TrashSection";
import { PWAInstallPrompt } from "@/components/dashboard/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/dashboard/OfflineIndicator";
import { toast } from "sonner";

type ActiveSection = "stats" | "links" | "accounts" | "ideas" | "reminders" | "categories" | "trash";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>("stats");

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
      {/* Mobile Header */}
      <MobileHeader onSignOut={handleSignOut} />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onSignOut={handleSignOut}
        />
        
        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 pb-24 lg:pb-8 pt-20 lg:pt-8">
          <div className="max-w-7xl mx-auto">
            {activeSection === "stats" && <StatisticsSection />}
            {activeSection === "links" && <LinksSection />}
            {activeSection === "accounts" && <AccountsSection />}
            {activeSection === "ideas" && <IdeasSection />}
            {activeSection === "reminders" && <RemindersSection />}
            {activeSection === "categories" && <CategoriesSection />}
            {activeSection === "trash" && <TrashSection />}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default Dashboard;
