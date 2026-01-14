import { LogOut, Moon, Sun, Download, RefreshCw, Cloud, HardDrive, FolderOpen, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { NotificationButton } from "./NotificationButton";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { DataBackup } from "./DataBackup";
import { FileSystemAccess } from "./FileSystemAccess";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const {
    isOnline,
    isSyncing,
    pendingCount,
    syncAll,
    hasFileSystemAccess,
    isAutoSyncing
  } = useLocalDatabase();

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
    setSheetOpen(false);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setSheetOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-sidebar border-b border-sidebar-border z-50 lg:hidden">
        <div className="flex items-center justify-between px-3 py-2 safe-area-top">
          <div className="flex items-center space-x-2 min-w-0 flex-shrink">
            <img src="/logo.webp" alt="VaultKeep Logo" className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="min-w-0 flex flex-col">
              <h1 className="text-base font-bold text-sidebar-foreground truncate leading-tight">VaultKeep</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Coffre-fort digital</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Auto-sync indicator */}
            {isAutoSyncing && (
              <Button variant="ghost" size="icon" className="text-blue-500 h-8 w-8" title="Téléchargement...">
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
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {pendingCount}
                </Badge>
              </Button>
            )}
            
            {isOnline && pendingCount === 0 && !isAutoSyncing && (
              <Button variant="ghost" size="icon" className="text-green-500 h-8 w-8" title="Synchronisé">
                <Cloud className="w-4 h-4" />
              </Button>
            )}

            {/* Sheet Menu - Opens from bottom like "Plus" menu */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-sidebar-accent hover:bg-sidebar-accent/80">
                  <Menu className="w-4 h-4 text-sidebar-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-sidebar border-sidebar-border rounded-t-2xl p-0 h-auto max-h-[60vh]">
                <div className="p-4 pb-8">
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
                  <SheetTitle className="text-lg font-semibold text-sidebar-foreground mb-4 text-center">
                    Menu
                  </SheetTitle>
                  <div className="grid grid-cols-3 gap-3">
                    {!isInstalled && deferredPrompt && (
                      <button
                        onClick={handleInstall}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all"
                      >
                        <Download className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Installer</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleMenuAction(() => setFileSystemOpen(true))}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all"
                    >
                      <FolderOpen className={cn("w-6 h-6 mb-2", hasFileSystemAccess && "text-green-500")} />
                      <span className="text-sm font-medium">Stockage</span>
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(() => setBackupOpen(true))}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all"
                    >
                      <HardDrive className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">Sauvegarde</span>
                    </button>
                    
                    <NotificationButton variant="drawer" onAction={() => setSheetOpen(false)} />
                    
                    <button
                      onClick={() => handleMenuAction(() => setTheme(theme === "dark" ? "light" : "dark"))}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all"
                    >
                      {theme === "dark" ? <Sun className="w-6 h-6 mb-2" /> : <Moon className="w-6 h-6 mb-2" />}
                      <span className="text-sm font-medium">{theme === "dark" ? "Clair" : "Sombre"}</span>
                    </button>
                    
                    <button
                      onClick={() => handleMenuAction(onSignOut)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                    >
                      <LogOut className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">Déconnexion</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      <FileSystemAccess open={fileSystemOpen} onOpenChange={setFileSystemOpen} />
      <DataBackup open={backupOpen} onOpenChange={setBackupOpen} />
    </>
  );
}