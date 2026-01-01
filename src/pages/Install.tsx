import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle, Shield, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
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
    
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("Installation error:", error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const features = [
    {
      icon: Wifi,
      title: "Accès hors-ligne",
      description: "Consultez vos données même sans connexion internet"
    },
    {
      icon: Shield,
      title: "Sécurité renforcée",
      description: "Vos données sont stockées localement et synchronisées"
    },
    {
      icon: Smartphone,
      title: "Expérience native",
      description: "L'application s'exécute comme une app native"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Installer VaultKeep</h1>
          <p className="text-muted-foreground">
            Installez l'application pour un accès rapide et hors-ligne
          </p>
        </div>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <div>
                <h3 className="font-semibold text-foreground">Application installée</h3>
                <p className="text-sm text-muted-foreground">
                  VaultKeep est déjà installé sur votre appareil
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Button 
              onClick={handleInstall} 
              className="w-full h-14 text-lg"
              disabled={isInstalling || !deferredPrompt}
            >
              <Download className="w-5 h-5 mr-2" />
              {isInstalling ? "Installation..." : "Installer l'application"}
            </Button>

            {!deferredPrompt && (
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Installation manuelle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Sur iOS (Safari):</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Appuyez sur le bouton Partager</li>
                      <li>Sélectionnez "Sur l'écran d'accueil"</li>
                      <li>Appuyez sur "Ajouter"</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Sur Android (Chrome):</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Appuyez sur le menu ⋮</li>
                      <li>Sélectionnez "Installer l'application"</li>
                      <li>Confirmez l'installation</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate("/dashboard")}
        >
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
