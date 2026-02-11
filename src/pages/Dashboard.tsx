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
import { QuickNotesSection } from "@/components/dashboard/QuickNotesSection";
import { IdeasKanban } from "@/components/dashboard/IdeasKanban";
import { RemindersSection } from "@/components/dashboard/RemindersSection";
import { CategoriesSection } from "@/components/dashboard/CategoriesSection";
import { StatisticsSection } from "@/components/dashboard/StatisticsSection";
import { TrashSection } from "@/components/dashboard/TrashSection";
import { SurveysSection } from "@/components/dashboard/SurveysSection";
import { PWAInstallPrompt } from "@/components/dashboard/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/dashboard/OfflineIndicator";
import { FloatingWidgetDock } from "@/components/dashboard/FloatingWidgetDock";
import { vaultKeepDB } from "@/lib/indexedDB";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { toast } from "sonner";

type ActiveSection = "stats" | "links" | "accounts" | "ideas" | "reminders" | "categories" | "trash" | "notes" | "kanban" | "surveys";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>("stats");
  const [isOfflineAuth, setIsOfflineAuth] = useState(false);
  const { initializeLocalData, isOnline } = useLocalDatabase();

  useEffect(() => {
    const checkAuth = async () => {
      // Check for offline user first
      const offlineUserId = vaultKeepDB.getCurrentUser();
      
      if (navigator.onLine) {
        // Online mode - check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setSession(session);
          vaultKeepDB.setCurrentUser(session.user.id);
          await initializeLocalData(session.user.id);
        } else if (offlineUserId) {
          // User was authenticated offline, try to continue offline
          setIsOfflineAuth(true);
          await initializeLocalData(offlineUserId);
        } else {
          navigate("/auth");
        }
      } else {
        // Offline mode - check if we have a stored user
        if (offlineUserId) {
          setIsOfflineAuth(true);
          await initializeLocalData(offlineUserId);
        } else {
          navigate("/auth");
        }
      }
      
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes when online
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setSession(session);
          setIsOfflineAuth(false);
          vaultKeepDB.setCurrentUser(session.user.id);
        } else if (!vaultKeepDB.getCurrentUser()) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, initializeLocalData]);

  const handleSignOut = async () => {
    try {
      if (isOnline) {
        await supabase.auth.signOut();
      }
      vaultKeepDB.setCurrentUser(null);
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error) {
      // Even if Supabase signout fails, clear local user
      vaultKeepDB.setCurrentUser(null);
      toast.success("Déconnexion réussie");
      navigate("/auth");
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
            {activeSection === "notes" && <QuickNotesSection />}
            {activeSection === "kanban" && <IdeasKanban />}
            {activeSection === "surveys" && <SurveysSection />}
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

      {/* Floating Widget Dock */}
      <FloatingWidgetDock />
    </div>
  );
};

export default Dashboard;
