import { WifiOff, RefreshCw, CloudOff, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncAllActions } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 z-40">
      {!isOnline && (
        <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <WifiOff className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Mode hors-ligne</p>
            <p className="text-xs text-muted-foreground">
              Les modifications seront synchronisées à la reconnexion
            </p>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-vault">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <CloudOff className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {isSyncing ? "Synchronisation..." : "Actions en attente"}
              </p>
              <Badge variant="secondary" className="text-xs">
                {pendingCount}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isSyncing 
                ? "Envoi des données en cours" 
                : isOnline 
                  ? "Cliquez pour synchroniser" 
                  : "En attente de connexion"
              }
            </p>
          </div>
          {isOnline && !isSyncing && (
            <Button size="sm" variant="outline" onClick={syncAllActions}>
              <Cloud className="w-4 h-4 mr-1" />
              Sync
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
