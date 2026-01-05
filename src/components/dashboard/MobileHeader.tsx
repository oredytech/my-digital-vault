import { LogOut, Moon, Sun, Download, RefreshCw, Cloud, HardDrive, FolderOpen, Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { NotificationButton } from "./NotificationButton";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { DataBackup } from "./DataBackup";
import { FileSystemAccess } from "./FileSystemAccess";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <>
      <header className="sticky top-0 bg-sidebar border-b border-sidebar-border z-40 lg:hidden safe-area-top rounded-b-2xl">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-2 min-w-0 flex-shrink">
            <img 
              src="/logo.webp" 
              alt="VaultKeep Logo" 
              className="w-8 h-8 rounded-lg flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-sidebar-foreground truncate">VaultKeep</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Auto-sync indicator */}
            {isAutoSyncing && (
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-500 h-8 w-8"
                title="Téléchargement..."
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </Button>
            )}
            
            {/* Sync Button */}
            {isOnline && pendingCount > 0 && !isAutoSyncing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={syncAll}
                disabled={isSyncing}
                className="text-primary relative h-8 w-8"
                title={`${pendingCount} action(s) en attente`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
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
                className="text-green-500 h-8 w-8"
                title="Synchronisé"
              >
                <Cloud className="w-4 h-4" />
              </Button>
            )}

            {/* Dropdown Menu for other actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isInstalled && deferredPrompt && (
                  <DropdownMenuItem onClick={handleInstall}>
                    <Download className="w-4 h-4 mr-2" />
                    Installer l'app
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => setFileSystemOpen(true)}>
                  <FolderOpen className={cn("w-4 h-4 mr-2", hasFileSystemAccess && "text-green-500")} />
                  Stockage local
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => setBackupOpen(true)}>
                  <HardDrive className="w-4 h-4 mr-2" />
                  Sauvegarde
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <NotificationButton variant="menu" />
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 mr-2" />
                  ) : (
                    <Moon className="w-4 h-4 mr-2" />
                  )}
                  {theme === "dark" ? "Mode clair" : "Mode sombre"}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <FileSystemAccess open={fileSystemOpen} onOpenChange={setFileSystemOpen} />
      <DataBackup open={backupOpen} onOpenChange={setBackupOpen} />
    </>
  );
}