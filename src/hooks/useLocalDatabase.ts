import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { vaultKeepDB, TrashItem, PendingAction } from "@/lib/indexedDB";
import { toast } from "sonner";

type TableName = "accounts" | "links" | "ideas" | "categories" | "reminders";

export function useLocalDatabase() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Update pending count and IDs
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await vaultKeepDB.getPendingCount();
      const ids = await vaultKeepDB.getPendingIds();
      setPendingCount(count);
      setPendingIds(ids);
    } catch (error) {
      console.error("Error getting pending count:", error);
    }
  }, []);

  // Initialize and sync data from cloud to local
  const initializeLocalData = useCallback(async (userId?: string) => {
    try {
      let currentUserId = userId;

      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }

      if (!currentUserId) {
        setIsInitialized(true);
        return;
      }

      // Set current user for the database
      vaultKeepDB.setCurrentUser(currentUserId);
      setUserId(currentUserId);

      if (!navigator.onLine) {
        setIsInitialized(true);
        await updatePendingCount();
        return;
      }

      // Fetch all data from cloud and store locally
      const tables: TableName[] = ["accounts", "links", "ideas", "categories", "reminders"];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          await vaultKeepDB.putMany(table, data, "synced");
        }
      }

      // Clean expired trash items
      const cleaned = await vaultKeepDB.cleanExpiredTrash();
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} expired trash items`);
      }

      setIsInitialized(true);
      await updatePendingCount();
    } catch (error) {
      console.error("Error initializing local data:", error);
      setIsInitialized(true);
    }
  }, [updatePendingCount]);

  // Store credentials locally for offline authentication
  const storeCredentials = useCallback(async (
    email: string,
    password: string,
    userId: string,
    fullName?: string
  ): Promise<void> => {
    await vaultKeepDB.saveCredentials(email, password, userId, fullName);
  }, []);

  // Verify credentials offline
  const verifyOfflineCredentials = useCallback(async (
    email: string,
    password: string
  ): Promise<{ valid: boolean; userId?: string; fullName?: string }> => {
    return vaultKeepDB.verifyOfflineCredentials(email, password);
  }, []);

  // Get data (from local DB)
  const getData = useCallback(async <T>(table: TableName): Promise<T[]> => {
    try {
      const localData = await vaultKeepDB.getAll<T>(table);
      return localData;
    } catch (error) {
      console.error(`Error getting ${table} from local DB:`, error);
      return [];
    }
  }, []);

  // Insert data locally and queue for sync
  const insertData = useCallback(async (
    table: TableName,
    data: Record<string, any>
  ): Promise<Record<string, any> | null> => {
    try {
      let userId = vaultKeepDB.getCurrentUser();
      
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      }

      if (!userId) throw new Error("Non authentifié");

      const id = data.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const newItem = {
        ...data,
        id,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      // Save to local DB
      await vaultKeepDB.put(table, newItem, isOnline ? "synced" : "pending");

      if (isOnline) {
        // Try to sync immediately
        const { error } = await supabase.from(table).insert(newItem as any);
        if (error) {
          // If failed, mark as pending
          await vaultKeepDB.put(table, newItem, "pending");
          await vaultKeepDB.addPendingAction({
            table,
            action: "insert",
            data: newItem,
            timestamp: Date.now(),
          });
          await updatePendingCount();
        }
      } else {
        // Queue for later sync
        await vaultKeepDB.addPendingAction({
          table,
          action: "insert",
          data: newItem,
          timestamp: Date.now(),
        });
        await updatePendingCount();
      }

      return newItem;
    } catch (error) {
      console.error(`Error inserting ${table}:`, error);
      throw error;
    }
  }, [isOnline, updatePendingCount]);

  // Update data locally and queue for sync
  const updateData = useCallback(async (
    table: TableName,
    id: string,
    updates: Record<string, any>
  ): Promise<Record<string, any> | null> => {
    try {
      const existing = await vaultKeepDB.get<Record<string, any>>(table, id);
      if (!existing) throw new Error("Item not found");

      const updatedItem = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Save to local DB
      await vaultKeepDB.put(table, updatedItem, isOnline ? "synced" : "pending");

      if (isOnline) {
        // Try to sync immediately
        const { error } = await supabase
          .from(table)
          .update(updates as any)
          .eq("id", id);

        if (error) {
          await vaultKeepDB.put(table, updatedItem, "pending");
          await vaultKeepDB.addPendingAction({
            table,
            action: "update",
            data: { id, ...updates },
            timestamp: Date.now(),
          });
          await updatePendingCount();
        }
      } else {
        await vaultKeepDB.addPendingAction({
          table,
          action: "update",
          data: { id, ...updates },
          timestamp: Date.now(),
        });
        await updatePendingCount();
      }

      return updatedItem;
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
  }, [isOnline, updatePendingCount]);

  // Delete data (move to trash) locally and queue for sync
  const deleteData = useCallback(async (
    table: TableName,
    id: string,
    permanentDelete = false
  ): Promise<void> => {
    try {
      const existing = await vaultKeepDB.get(table, id);

      if (!permanentDelete && existing) {
        // Move to trash
        await vaultKeepDB.moveToTrash(table, id, existing);
      } else {
        // Permanent delete
        await vaultKeepDB.delete(table, id);
      }

      if (isOnline) {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) {
          await vaultKeepDB.addPendingAction({
            table,
            action: "delete",
            data: { id },
            timestamp: Date.now(),
          });
          await updatePendingCount();
        }
      } else {
        await vaultKeepDB.addPendingAction({
          table,
          action: "delete",
          data: { id },
          timestamp: Date.now(),
        });
        await updatePendingCount();
      }
    } catch (error) {
      console.error(`Error deleting ${table}:`, error);
      throw error;
    }
  }, [isOnline, updatePendingCount]);

  // Get trash items
  const getTrash = useCallback(async (): Promise<TrashItem[]> => {
    return vaultKeepDB.getTrash();
  }, []);

  // Restore from trash
  const restoreFromTrash = useCallback(async (trashId: string): Promise<boolean> => {
    try {
      const result = await vaultKeepDB.restoreFromTrash(trashId);
      if (!result) return false;

      // Queue for sync
      await vaultKeepDB.addPendingAction({
        table: result.table,
        action: "insert",
        data: result.data,
        timestamp: Date.now(),
      });
      await updatePendingCount();

      return true;
    } catch (error) {
      console.error("Error restoring from trash:", error);
      return false;
    }
  }, [updatePendingCount]);

  // Permanently delete from trash
  const permanentDeleteFromTrash = useCallback(async (trashId: string): Promise<void> => {
    await vaultKeepDB.deleteFromTrash(trashId);
  }, []);

  // Sync all pending actions
  const syncAll = useCallback(async (): Promise<void> => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const pendingActions = await vaultKeepDB.getPendingActions();

    if (pendingActions.length === 0) {
      setIsSyncing(false);
      return;
    }

    let successCount = 0;
    let failedActions: PendingAction[] = [];

    let userId = vaultKeepDB.getCurrentUser();
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      setIsSyncing(false);
      return;
    }

    for (const action of pendingActions) {
      try {
        switch (action.action) {
          case "insert":
            const insertData = { ...action.data, user_id: userId };
            const { error: insertError } = await supabase
              .from(action.table as any)
              .upsert(insertData);
            if (insertError) throw insertError;
            break;

          case "update":
            const { id, ...updateFields } = action.data;
            const { error: updateError } = await supabase
              .from(action.table as any)
              .update(updateFields)
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

        await vaultKeepDB.removePendingAction(action.id);
        successCount++;
      } catch (error) {
        console.error(`Sync error for action ${action.id}:`, error);
        failedActions.push(action);
      }
    }

    await updatePendingCount();
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} modification(s) synchronisée(s)`);
    }
    if (failedActions.length > 0) {
      toast.error(`${failedActions.length} action(s) en échec`);
    }

    // Refresh local data from cloud
    await initializeLocalData();
  }, [isOnline, isSyncing, updatePendingCount, initializeLocalData]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connexion rétablie");
    };

    const handleOffline = () => {
      setIsOnline(false);
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
    if (isOnline && pendingCount > 0) {
      const timer = setTimeout(syncAll, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, syncAll]);

  // Initialize on mount
  useEffect(() => {
    initializeLocalData();
  }, [initializeLocalData]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    pendingIds,
    isInitialized,
    userId,
    getData,
    insertData,
    updateData,
    deleteData,
    getTrash,
    restoreFromTrash,
    permanentDeleteFromTrash,
    syncAll,
    initializeLocalData,
    storeCredentials,
    verifyOfflineCredentials,
  };
}
