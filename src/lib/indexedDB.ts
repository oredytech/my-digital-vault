// IndexedDB Database for VaultKeep - Persistent local storage with multi-user support
const DB_PREFIX = "vaultkeep_";
const DB_VERSION = 3;

export interface LocalItem {
  id: string;
  data: any;
  syncStatus: "synced" | "pending" | "conflict";
  lastModified: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface TrashItem {
  id: string;
  table: string;
  data: any;
  deletedAt: number;
  expiresAt: number;
}

export interface PendingAction {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  data: any;
  timestamp: number;
}

export interface StoredCredentials {
  id: string;
  email: string;
  hashedPassword: string;
  userId: string;
  fullName?: string;
  lastLogin: number;
}

// Simple hash function for password storage (not cryptographically secure, but adequate for offline demo)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "vaultkeep_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

class VaultKeepDB {
  private databases: Map<string, IDBDatabase> = new Map();
  private dbPromises: Map<string, Promise<IDBDatabase>> = new Map();
  private currentUserId: string | null = null;

  // Get database name for a specific user
  private getDBName(userId?: string): string {
    const id = userId || this.currentUserId || "anonymous";
    return `${DB_PREFIX}${id}`;
  }

  // Set current user ID
  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
  }

  getCurrentUser(): string | null {
    return this.currentUserId;
  }

  // Initialize database for a specific user
  private initDB(userId?: string): Promise<IDBDatabase> {
    const dbName = this.getDBName(userId);

    if (this.databases.has(dbName)) {
      return Promise.resolve(this.databases.get(dbName)!);
    }

    if (this.dbPromises.has(dbName)) {
      return this.dbPromises.get(dbName)!;
    }

    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.databases.set(dbName, request.result);
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores for each table
        const tables = ["accounts", "links", "ideas", "categories", "reminders", "profiles"];
        tables.forEach((table) => {
          if (!db.objectStoreNames.contains(table)) {
            const store = db.createObjectStore(table, { keyPath: "id" });
            store.createIndex("syncStatus", "syncStatus", { unique: false });
            store.createIndex("lastModified", "lastModified", { unique: false });
          }
        });

        // Create trash store
        if (!db.objectStoreNames.contains("trash")) {
          const trashStore = db.createObjectStore("trash", { keyPath: "id" });
          trashStore.createIndex("table", "table", { unique: false });
          trashStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }

        // Create pending actions store
        if (!db.objectStoreNames.contains("pending_actions")) {
          const pendingStore = db.createObjectStore("pending_actions", { keyPath: "id" });
          pendingStore.createIndex("table", "table", { unique: false });
          pendingStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });

    this.dbPromises.set(dbName, promise);
    return promise;
  }

  private async getDB(userId?: string): Promise<IDBDatabase> {
    return this.initDB(userId);
  }

  // ============ CREDENTIALS MANAGEMENT (Global DB) ============

  private async getCredentialsDB(): Promise<IDBDatabase> {
    const dbName = "vaultkeep_credentials";

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("credentials")) {
          const store = db.createObjectStore("credentials", { keyPath: "id" });
          store.createIndex("email", "email", { unique: true });
          store.createIndex("userId", "userId", { unique: true });
        }
      };
    });
  }

  async saveCredentials(email: string, password: string, userId: string, fullName?: string): Promise<void> {
    const db = await this.getCredentialsDB();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("credentials", "readwrite");
      const store = transaction.objectStore("credentials");

      const credentials: StoredCredentials = {
        id: email.toLowerCase(),
        email: email.toLowerCase(),
        hashedPassword,
        userId,
        fullName,
        lastLogin: Date.now(),
      };

      const request = store.put(credentials);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async verifyOfflineCredentials(email: string, password: string): Promise<{ valid: boolean; userId?: string; fullName?: string }> {
    const db = await this.getCredentialsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("credentials", "readonly");
      const store = transaction.objectStore("credentials");
      const request = store.get(email.toLowerCase());

      request.onsuccess = async () => {
        const credentials = request.result as StoredCredentials | undefined;
        if (!credentials) {
          resolve({ valid: false });
          return;
        }

        const isValid = await verifyPassword(password, credentials.hashedPassword);
        resolve({
          valid: isValid,
          userId: isValid ? credentials.userId : undefined,
          fullName: isValid ? credentials.fullName : undefined,
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStoredCredentials(email: string): Promise<StoredCredentials | null> {
    const db = await this.getCredentialsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("credentials", "readonly");
      const store = transaction.objectStore("credentials");
      const request = store.get(email.toLowerCase());

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllStoredUsers(): Promise<StoredCredentials[]> {
    const db = await this.getCredentialsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("credentials", "readonly");
      const store = transaction.objectStore("credentials");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ GENERIC CRUD OPERATIONS ============

  async getAll<T>(table: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, "readonly");
      const store = transaction.objectStore(table);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result
          .filter((item: LocalItem) => !item.deleted)
          .map((item: LocalItem) => item.data);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, "readonly");
      const store = transaction.objectStore(table);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result as LocalItem | undefined;
        if (item && !item.deleted) {
          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async put(table: string, data: any, syncStatus: "synced" | "pending" = "synced"): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, "readwrite");
      const store = transaction.objectStore(table);

      const item: LocalItem = {
        id: data.id,
        data,
        syncStatus,
        lastModified: Date.now(),
      };

      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async putMany(table: string, items: any[], syncStatus: "synced" | "pending" = "synced"): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, "readwrite");
      const store = transaction.objectStore(table);

      items.forEach((data) => {
        const item: LocalItem = {
          id: data.id,
          data,
          syncStatus,
          lastModified: Date.now(),
        };
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(table: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, "readwrite");
      const store = transaction.objectStore(table);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(table: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, "readwrite");
      const store = transaction.objectStore(table);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============ TRASH OPERATIONS ============

  async moveToTrash(table: string, id: string, data: any): Promise<void> {
    const db = await this.getDB();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["trash", table], "readwrite");

      // Add to trash
      const trashStore = transaction.objectStore("trash");
      const trashItem: TrashItem = {
        id: `${table}_${id}_${Date.now()}`,
        table,
        data: { ...data, originalId: id },
        deletedAt: Date.now(),
        expiresAt: Date.now() + THIRTY_DAYS,
      };
      trashStore.put(trashItem);

      // Mark as deleted in main store
      const mainStore = transaction.objectStore(table);
      const getRequest = mainStore.get(id);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const item = getRequest.result as LocalItem;
          item.deleted = true;
          item.deletedAt = Date.now();
          mainStore.put(item);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTrash(): Promise<TrashItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("trash", "readonly");
      const store = transaction.objectStore("trash");
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result.filter(
          (item: TrashItem) => item.expiresAt > Date.now()
        );
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async restoreFromTrash(trashId: string): Promise<{ table: string; data: any } | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("trash", "readonly");
      const store = transaction.objectStore("trash");
      const request = store.get(trashId);

      request.onsuccess = async () => {
        const trashItem = request.result as TrashItem | undefined;
        if (!trashItem) {
          resolve(null);
          return;
        }

        const { originalId, ...restoredData } = trashItem.data;
        restoredData.id = originalId;

        // Restore to main table
        await this.put(trashItem.table, restoredData, "pending");

        // Remove from trash
        await this.deleteFromTrash(trashId);

        resolve({ table: trashItem.table, data: restoredData });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFromTrash(trashId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("trash", "readwrite");
      const store = transaction.objectStore("trash");
      const request = store.delete(trashId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cleanExpiredTrash(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("trash", "readwrite");
      const store = transaction.objectStore("trash");
      const index = store.index("expiresAt");
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve(deletedCount);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ============ PENDING ACTIONS FOR SYNC ============

  async addPendingAction(action: Omit<PendingAction, "id">): Promise<string> {
    const db = await this.getDB();
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pending_actions", "readwrite");
      const store = transaction.objectStore("pending_actions");

      const pendingAction: PendingAction = { ...action, id };
      const request = store.put(pendingAction);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<PendingAction[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pending_actions", "readonly");
      const store = transaction.objectStore("pending_actions");
      const index = store.index("timestamp");
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingAction(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pending_actions", "readwrite");
      const store = transaction.objectStore("pending_actions");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingActions(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pending_actions", "readwrite");
      const store = transaction.objectStore("pending_actions");
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingCount(): Promise<number> {
    const actions = await this.getPendingActions();
    return actions.length;
  }

  async getPendingIds(): Promise<Set<string>> {
    const actions = await this.getPendingActions();
    const ids = new Set<string>();
    actions.forEach(action => {
      if (action.data?.id) {
        ids.add(action.data.id);
      }
    });
    return ids;
  }
}

// Singleton instance
export const vaultKeepDB = new VaultKeepDB();
