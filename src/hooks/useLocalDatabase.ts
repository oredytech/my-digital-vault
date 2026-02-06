import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { vaultKeepDB, TrashItem, PendingAction } from "@/lib/indexedDB";
import { fileSystemStorage } from "@/lib/fileSystemStorage";
import { toast } from "sonner";

type TableName = "accounts" | "links" | "ideas" | "categories" | "reminders" | "notes" | "surveys" | "survey_questions" | "survey_responses";

export function useLocalDatabase() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [hasFileSystemAccess, setHasFileSystemAccess] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const offlineSyncAttempted = useRef(false);

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

  // Save data to file system if access is granted
  const saveToFileSystem = useCallback(async () => {
    if (!hasFileSystemAccess) return;
    
    try {
      const tables: TableName[] = ["accounts", "links", "ideas", "categories", "reminders", "notes"];
      const data: Record<string, any[]> = {};
      
      for (const table of tables) {
        data[table] = await vaultKeepDB.getAll(table);
      }
      
      await fileSystemStorage.saveAllData({
        accounts: data.accounts,
        links: data.links,
        ideas: data.ideas,
        categories: data.categories,
        reminders: data.reminders,
      });
    } catch (error) {
      console.error("Error saving to file system:", error);
    }
  }, [hasFileSystemAccess]);

  // Request file system access
  const requestFileSystemAccess = useCallback(async (): Promise<boolean> => {
    if (!fileSystemStorage.isAvailable()) {
      toast.error("Le stockage local n'est pas supporté par ce navigateur");
      return false;
    }
    
    const granted = await fileSystemStorage.requestAccess();
    setHasFileSystemAccess(granted);
    
    if (granted) {
      toast.success(`Dossier "${fileSystemStorage.getFolderName()}" créé pour stocker vos données`);
      await saveToFileSystem();
    }
    
    return granted;
  }, [saveToFileSystem]);

  // Check existing file system permission
  const checkFileSystemAccess = useCallback(async () => {
    if (fileSystemStorage.isAvailable()) {
      const hasAccess = await fileSystemStorage.checkPermission();
      setHasFileSystemAccess(hasAccess);
    }
  }, []);

  // Sync offline account to cloud
  const syncOfflineAccountToCloud = useCallback(async (email: string, password: string, fullName: string): Promise<{ success: boolean; newUserId?: string }> => {
    try {
      // Get the old offline user ID
      const credentials = await vaultKeepDB.getCredentialsByEmail(email);
      if (!credentials || !credentials.isOfflineAccount) {
        return { success: false };
      }
      
      const oldUserId = credentials.userId;
      
      // Register the user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName }
        }
      });

      if (error) {
        console.error("Error registering offline account:", error);
        return { success: false };
      }

      if (!data.user) {
        return { success: false };
      }

      const newUserId = data.user.id;

      // Migrate data from offline database to new user database
      await vaultKeepDB.migrateOfflineData(oldUserId, newUserId);

      // Update credentials to mark as synced
      await vaultKeepDB.markAccountAsSynced(email, newUserId);

      // Set the new user as current
      vaultKeepDB.setCurrentUser(newUserId);
      setUserId(newUserId);

      return { success: true, newUserId };
    } catch (error) {
      console.error("Error syncing offline account:", error);
      return { success: false };
    }
  }, []);

  // Check and sync offline accounts when coming online
  const checkAndSyncOfflineAccounts = useCallback(async () => {
    if (!navigator.onLine || offlineSyncAttempted.current) return;
    
    try {
      const offlineAccounts = await vaultKeepDB.getOfflineAccounts();
      
      if (offlineAccounts.length > 0) {
        offlineSyncAttempted.current = true;
        toast.info(
          `${offlineAccounts.length} compte(s) hors-ligne détecté(s). Connectez-vous pour synchroniser vos données.`,
          { duration: 8000 }
        );
      }
    } catch (error) {
      console.error("Error checking offline accounts:", error);
    }
  }, []);

  // Initialize with LOCAL-FIRST approach: load local data immediately, then sync with cloud
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

      // Check file system access
      await checkFileSystemAccess();

      // STEP 1: Immediately mark as initialized with local data
      // This allows the UI to render with cached data right away
      setIsInitialized(true);
      await updatePendingCount();

      // STEP 2: If offline, stop here - we already have local data
      if (!navigator.onLine) {
        return;
      }

      // STEP 3: Sync with cloud in the background
      setIsAutoSyncing(true);

      const tables: TableName[] = ["accounts", "links", "ideas", "categories", "reminders", "notes", "surveys", "survey_questions", "survey_responses"];

      // Fetch all tables in parallel for faster loading
      const fetchPromises = tables.map(async (table) => {
        try {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            await vaultKeepDB.putMany(table, data, "synced");
          }
        } catch (err) {
          console.error(`Error syncing ${table}:`, err);
        }
      });

      await Promise.all(fetchPromises);

      // Clean expired trash items
      const cleaned = await vaultKeepDB.cleanExpiredTrash();
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} expired trash items`);
      }

      // Save to file system if access granted
      await saveToFileSystem();

      setIsAutoSyncing(false);
      await updatePendingCount();
    } catch (error) {
      console.error("Error initializing local data:", error);
      setIsAutoSyncing(false);
      setIsInitialized(true);
    }
  }, [updatePendingCount, checkFileSystemAccess, saveToFileSystem]);

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
  // Tables that don't have a user_id column (linked via foreign keys instead)
  const tablesWithoutUserId: TableName[] = ["survey_questions", "survey_responses"];

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

      // Only require userId for tables that have user_id column
      if (!userId && !tablesWithoutUserId.includes(table)) {
        throw new Error("Non authentifié");
      }

      const id = data.id || crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Build the new item - only add user_id for tables that have it
      const newItem: Record<string, any> = {
        ...data,
        id,
        created_at: now,
      };
      
      // Add user_id only for tables that have that column
      if (!tablesWithoutUserId.includes(table) && userId) {
        newItem.user_id = userId;
        newItem.updated_at = now;
      }

      // Save to local DB
      await vaultKeepDB.put(table, newItem, isOnline ? "synced" : "pending");

      if (isOnline) {
        // Try to sync immediately
        const { error } = await supabase.from(table).insert(newItem as any);
        if (error) {
          console.error(`Error inserting ${table} to cloud:`, error);
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
    
    let pendingActions: PendingAction[] = [];
    try {
      pendingActions = await vaultKeepDB.getPendingActions();
    } catch (error) {
      console.error("Error getting pending actions:", error);
      setIsSyncing(false);
      return;
    }

    if (pendingActions.length === 0) {
      setIsSyncing(false);
      return;
    }

    let successCount = 0;
    let failedActions: PendingAction[] = [];

    let userId = vaultKeepDB.getCurrentUser();
    if (!userId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch (error) {
        console.error("Error getting user:", error);
        setIsSyncing(false);
        return;
      }
    }

    if (!userId) {
      setIsSyncing(false);
      return;
    }

    // Process actions in parallel batches for better performance
    const batchSize = 5;
    for (let i = 0; i < pendingActions.length; i += batchSize) {
      const batch = pendingActions.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (action) => {
        try {
          switch (action.action) {
            case "insert":
              // Only add user_id for tables that have that column
              const insertPayload = tablesWithoutUserId.includes(action.table as TableName)
                ? { ...action.data }
                : { ...action.data, user_id: userId };
              // Remove any undefined user_id that might have been added
              if (tablesWithoutUserId.includes(action.table as TableName)) {
                delete insertPayload.user_id;
              }
              const { error: insertError } = await supabase
                .from(action.table as any)
                .upsert(insertPayload);
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
      }));
    }

    await updatePendingCount();
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} modification(s) synchronisée(s)`);
    }
    if (failedActions.length > 0) {
      toast.error(`${failedActions.length} action(s) en échec`);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connexion rétablie");
      // Check for offline accounts when coming online
      checkAndSyncOfflineAccounts();
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
  }, [checkAndSyncOfflineAccounts]);

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

  // Check for offline accounts on mount
  useEffect(() => {
    if (isOnline) {
      checkAndSyncOfflineAccounts();
    }
  }, [isOnline, checkAndSyncOfflineAccounts]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    pendingIds,
    isInitialized,
    userId,
    isAutoSyncing,
    hasFileSystemAccess,
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
    requestFileSystemAccess,
    saveToFileSystem,
    syncOfflineAccountToCloud,
    checkAndSyncOfflineAccounts,
  };
}
