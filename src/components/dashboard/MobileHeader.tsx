import { LogOut, Moon, Sun, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { NotificationButton } from "./NotificationButton";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface MobileHeaderProps {
  onSignOut: () => void;
}

export function MobileHeader({ onSignOut }: MobileHeaderProps) {
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

  return (
    <header className="sticky top-0 bg-sidebar border-b border-sidebar-border z-40 lg:hidden safe-area-top rounded-b-2xl">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.webp" 
            alt="VaultKeep Logo" 
            className="w-10 h-10 rounded-xl"
          />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">VaultKeep</h1>
            <p className="text-[10px] text-muted-foreground">Coffre-fort digital</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {!isInstalled && deferredPrompt && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstall}
              className="text-primary"
              title="Installer l'app"
            >
              <Download className="w-5 h-5" />
            </Button>
          )}
          <NotificationButton variant="icon" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-sidebar-foreground"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
