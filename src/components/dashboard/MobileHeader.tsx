import { LogOut, Moon, Sun, Download, RefreshCw, Cloud, HardDrive, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { NotificationButton } from "./NotificationButton";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { DataBackup } from "./DataBackup";
import { FileSystemAccess } from "./FileSystemAccess";
import { cn } from "@/lib/utils";

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
  const [backupOpen, setBackupOpen] = useState(false);
  const [fileSystemOpen, setFileSystemOpen] = useState(false);
  const { isOnline, isSyncing, pendingCount, syncAll, hasFileSystemAccess, isAutoSyncing } = useLocalDatabase();

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
          {/* Auto-sync indicator */}
          {isAutoSyncing && (
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-500"
              title="Téléchargement..."
            >
              <Loader2 className="w-5 h-5 animate-spin" />
            </Button>
          )}
          {/* Sync Button */}
          {isOnline && pendingCount > 0 && !isAutoSyncing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={syncAll}
              disabled={isSyncing}
              className="text-primary relative"
              title={`${pendingCount} action(s) en attente`}
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {pendingCount}
              </Badge>
            </Button>
          )}
          {isOnline && pendingCount === 0 && !isAutoSyncing && (
            <Button
              variant="ghost"
              size="icon"
              className="text-green-500"
              title="Synchronisé"
            >
              <Cloud className="w-5 h-5" />
            </Button>
          )}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFileSystemOpen(true)}
            className={cn(
              hasFileSystemAccess ? "text-green-500" : "text-sidebar-foreground"
            )}
            title="Stockage local"
          >
            <FolderOpen className="w-5 h-5" />
          </Button>
          <FileSystemAccess open={fileSystemOpen} onOpenChange={setFileSystemOpen} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setBackupOpen(true)}
            className="text-sidebar-foreground"
            title="Sauvegarde"
          >
            <HardDrive className="w-5 h-5" />
          </Button>
          <DataBackup open={backupOpen} onOpenChange={setBackupOpen} />
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
