import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfflineAction {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  data: any;
  timestamp: number;
}

const OFFLINE_STORAGE_KEY = "vaultkeep_offline_actions";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);

  // Load pending actions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored));
      } catch {
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
      }
    }
  }, []);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflineAction[]) => {
    setPendingActions(actions);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(actions));
  }, []);

  // Add an offline action
  const addOfflineAction = useCallback((
    table: string,
    action: "insert" | "update" | "delete",
    data: any
  ) => {
    const newAction: OfflineAction = {
      id: crypto.randomUUID(),
      table,
      action,
      data,
      timestamp: Date.now()
    };

    const updatedActions = [...pendingActions, newAction];
    savePendingActions(updatedActions);
    
    return newAction.id;
  }, [pendingActions, savePendingActions]);

  // Sync a single action
  const syncAction = async (action: OfflineAction): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      switch (action.action) {
        case "insert":
          const insertData = { ...action.data, user_id: user.id };
          delete insertData.id; // Let Supabase generate the ID
          const { error: insertError } = await supabase
            .from(action.table as any)
            .insert(insertData);
          if (insertError) throw insertError;
          break;

        case "update":
          const { id, ...updateData } = action.data;
          const { error: updateError } = await supabase
            .from(action.table as any)
            .update(updateData)
            .eq("id", id);
          if (updateError) throw updateError;
          break;

        case "delete":
          const { error: deleteError } = await supabase
            .from(action.table as any)
            .delete()
            .eq("id", action.data.id);
          if (deleteError) throw deleteError;
          break;
      }

      return true;
    } catch (error) {
      console.error("Sync error:", error);
      return false;
    }
  };

  // Sync all pending actions
  const syncAllActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const failedActions: OfflineAction[] = [];
    let successCount = 0;

    // Sort by timestamp to maintain order
    const sortedActions = [...pendingActions].sort((a, b) => a.timestamp - b.timestamp);

    for (const action of sortedActions) {
      const success = await syncAction(action);
      if (success) {
        successCount++;
      } else {
        failedActions.push(action);
      }
    }

    savePendingActions(failedActions);
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} modification(s) synchronisée(s)`);
    }

    if (failedActions.length > 0) {
      toast.error(`${failedActions.length} action(s) n'ont pas pu être synchronisées`);
    }
  }, [isOnline, pendingActions, isSyncing, savePendingActions]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connexion rétablie");
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Mode hors-ligne activé");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(syncAllActions, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingActions.length, syncAllActions]);

  // Clear all pending actions
  const clearPendingActions = useCallback(() => {
    savePendingActions([]);
  }, [savePendingActions]);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    pendingCount: pendingActions.length,
    addOfflineAction,
    syncAllActions,
    clearPendingActions
  };
}
