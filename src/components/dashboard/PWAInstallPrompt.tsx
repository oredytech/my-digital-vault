import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Shield, WifiOff } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay if user hasn't dismissed it
      const dismissed = localStorage.getItem("pwa-prompt-dismissed");
      const lastDismissed = localStorage.getItem("pwa-prompt-dismissed-time");
      
      // Show again after 7 days
      if (dismissed && lastDismissed) {
        const dismissedTime = parseInt(lastDismissed, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime > sevenDays) {
          localStorage.removeItem("pwa-prompt-dismissed");
          setTimeout(() => setShowPrompt(true), 3000);
        }
      } else if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa-prompt-dismissed");
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

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPrompt(false);
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("Installation error:", error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
    localStorage.setItem("pwa-prompt-dismissed-time", Date.now().toString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-vault p-6 w-full max-w-sm animate-fade-in relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Installer VaultKeep</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Installez l'application pour un accès rapide et hors-ligne
          </p>
          
          {/* Features */}
          <div className="w-full space-y-2 mb-6 text-left">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WifiOff className="w-4 h-4 text-primary" />
              <span>Accès hors-ligne complet</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Expérience native</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Données sécurisées localement</span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full">
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
            >
              Plus tard
            </Button>
            <Button
              onClick={handleInstall}
              className="flex-1"
              disabled={isInstalling || !deferredPrompt}
            >
              <Download className="w-4 h-4 mr-2" />
              {isInstalling ? "Installation..." : "Installer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
