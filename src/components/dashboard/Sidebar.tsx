import { Link2, Users, Lightbulb, Bell, LogOut, Tag, Moon, Sun, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

type ActiveSection = "stats" | "links" | "accounts" | "ideas" | "reminders" | "categories";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface SidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  onSignOut: () => void;
}

export function Sidebar({ activeSection, onSectionChange, onSignOut }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  };
  
  const navItems = [
    { id: "stats" as const, label: "Statistiques", icon: BarChart3 },
    { id: "links" as const, label: "Liens", icon: Link2 },
    { id: "accounts" as const, label: "Comptes", icon: Users },
    { id: "ideas" as const, label: "Idées", icon: Lightbulb },
    { id: "reminders" as const, label: "Rappels", icon: Bell },
    { id: "categories" as const, label: "Catégories", icon: Tag },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border shadow-vault z-50 overflow-y-auto hidden lg:block rounded-r-2xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.webp" 
              alt="VaultKeep Logo" 
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">VaultKeep</h1>
              <p className="text-xs text-muted-foreground">Coffre-fort digital</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                  activeSection === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {!isInstalled && deferredPrompt && (
            <Button
              variant="outline"
              onClick={handleInstall}
              className="w-full justify-start border-primary/50 text-primary hover:bg-primary/10"
            >
              <Download className="w-5 h-5 mr-3" />
              Installer l'app
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 mr-3" />
            ) : (
              <Moon className="w-5 h-5 mr-3" />
            )}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </Button>
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </div>
    </aside>
  );
}
