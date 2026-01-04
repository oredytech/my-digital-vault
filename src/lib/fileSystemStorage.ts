// File System Storage - Persistent storage with user permission
// Uses the File System Access API when available, falls back to IndexedDB

// Type declarations for File System Access API
interface FileSystemPermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface ExtendedFileSystemDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
}

declare global {
  interface Window {
    showDirectoryPicker?(options?: {
      mode?: "read" | "readwrite";
      startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
    }): Promise<FileSystemDirectoryHandle>;
  }
}

export interface FileSystemStorageConfig {
  folderName: string;
  appName: string;
}

class FileSystemStorage {
  private directoryHandle: ExtendedFileSystemDirectoryHandle | null = null;
  private hasPermission = false;
  private config: FileSystemStorageConfig = {
    folderName: "VaultKeep_Data",
    appName: "VaultKeep",
  };

  // Check if File System Access API is available
  isAvailable(): boolean {
    return "showDirectoryPicker" in window;
  }

  // Check if we already have permission
  async checkPermission(): Promise<boolean> {
    if (!this.directoryHandle) {
      // Try to restore from IndexedDB
      const handle = await this.getStoredHandle();
      if (handle) {
        this.directoryHandle = handle as ExtendedFileSystemDirectoryHandle;
        try {
          const permission = await this.directoryHandle.queryPermission({ mode: "readwrite" });
          this.hasPermission = permission === "granted";
          return this.hasPermission;
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      const permission = await this.directoryHandle.queryPermission({ mode: "readwrite" });
      this.hasPermission = permission === "granted";
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  // Request permission and set up the folder
  async requestAccess(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log("File System Access API not available");
      return false;
    }

    try {
      // Let user pick a directory
      const handle = await window.showDirectoryPicker!({
        mode: "readwrite",
        startIn: "documents",
      });

      // Create our app folder inside the chosen directory
      this.directoryHandle = await handle.getDirectoryHandle(this.config.folderName, { create: true }) as ExtendedFileSystemDirectoryHandle;
      this.hasPermission = true;

      // Store the handle for future sessions
      await this.storeHandle(this.directoryHandle);


      return true;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("User cancelled folder selection");
      } else {
        console.error("Error requesting file system access:", error);
      }
      return false;
    }
  }

  // Store handle in IndexedDB for persistence
  private async storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vaultkeep_fs_handles", 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("handles")) {
          db.createObjectStore("handles", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("handles", "readwrite");
        const store = transaction.objectStore("handles");
        store.put({ id: "directory", handle });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  // Get stored handle from IndexedDB
  private async getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vaultkeep_fs_handles", 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("handles")) {
          db.createObjectStore("handles", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("handles", "readonly");
        const store = transaction.objectStore("handles");
        const getRequest = store.get("directory");

        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result?.handle || null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  // Save data to a JSON file
  async saveToFile(filename: string, data: any): Promise<boolean> {
    if (!this.directoryHandle || !this.hasPermission) {
      return false;
    }

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(`${filename}.json`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return true;
    } catch (error) {
      console.error(`Error saving ${filename}:`, error);
      return false;
    }
  }

  // Load data from a JSON file
  async loadFromFile<T>(filename: string): Promise<T | null> {
    if (!this.directoryHandle || !this.hasPermission) {
      return null;
    }

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(`${filename}.json`);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content) as T;
    } catch (error: any) {
      if (error.name === "NotFoundError") {
        return null;
      }
      console.error(`Error loading ${filename}:`, error);
      return null;
    }
  }

  // Save all user data
  async saveAllData(data: {
    accounts: any[];
    links: any[];
    ideas: any[];
    categories: any[];
    reminders: any[];
  }): Promise<boolean> {
    if (!this.directoryHandle || !this.hasPermission) {
      return false;
    }

    try {
      await Promise.all([
        this.saveToFile("accounts", data.accounts),
        this.saveToFile("links", data.links),
        this.saveToFile("ideas", data.ideas),
        this.saveToFile("categories", data.categories),
        this.saveToFile("reminders", data.reminders),
        this.saveToFile("backup_info", {
          lastBackup: new Date().toISOString(),
          appVersion: "1.0.0",
          itemCount: {
            accounts: data.accounts.length,
            links: data.links.length,
            ideas: data.ideas.length,
            categories: data.categories.length,
            reminders: data.reminders.length,
          },
        }),
      ]);
      return true;
    } catch (error) {
      console.error("Error saving all data:", error);
      return false;
    }
  }

  // Load all user data
  async loadAllData(): Promise<{
    accounts: any[];
    links: any[];
    ideas: any[];
    categories: any[];
    reminders: any[];
  } | null> {
    if (!this.directoryHandle || !this.hasPermission) {
      return null;
    }

    try {
      const [accounts, links, ideas, categories, reminders] = await Promise.all([
        this.loadFromFile<any[]>("accounts"),
        this.loadFromFile<any[]>("links"),
        this.loadFromFile<any[]>("ideas"),
        this.loadFromFile<any[]>("categories"),
        this.loadFromFile<any[]>("reminders"),
      ]);

      return {
        accounts: accounts || [],
        links: links || [],
        ideas: ideas || [],
        categories: categories || [],
        reminders: reminders || [],
      };
    } catch (error) {
      console.error("Error loading all data:", error);
      return null;
    }
  }

  // Get the folder path for display
  getFolderName(): string {
    return this.config.folderName;
  }

  // Clear stored handle (revoke access)
  async clearAccess(): Promise<void> {
    this.directoryHandle = null;
    this.hasPermission = false;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vaultkeep_fs_handles", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("handles", "readwrite");
        const store = transaction.objectStore("handles");
        store.delete("directory");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }
}

export const fileSystemStorage = new FileSystemStorage();
