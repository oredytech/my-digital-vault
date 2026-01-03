import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Upload, FileJson, AlertCircle } from "lucide-react";
import { vaultKeepDB } from "@/lib/indexedDB";

interface DataBackupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BackupData {
  version: string;
  exportedAt: string;
  tables: {
    accounts: any[];
    links: any[];
    ideas: any[];
    categories: any[];
    reminders: any[];
  };
}

export function DataBackup({ open, onOpenChange }: DataBackupProps) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const tables = ["accounts", "links", "ideas", "categories", "reminders"] as const;
      const backupData: BackupData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        tables: {
          accounts: [],
          links: [],
          ideas: [],
          categories: [],
          reminders: [],
        },
      };

      for (const table of tables) {
        const data = await vaultKeepDB.getAll(table);
        backupData.tables[table] = data;
      }

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultkeep_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Données exportées avec succès");
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      // Validate structure
      if (!backupData.version || !backupData.tables) {
        throw new Error("Format de fichier invalide");
      }

      const tables = ["accounts", "links", "ideas", "categories", "reminders"] as const;
      let totalImported = 0;

      for (const table of tables) {
        const items = backupData.tables[table];
        if (items && Array.isArray(items)) {
          for (const item of items) {
            await vaultKeepDB.put(table, item, "pending");
            totalImported++;
          }
        }
      }

      toast.success(`${totalImported} élément(s) importé(s) avec succès`);
      onOpenChange(false);
      
      // Reload the page to refresh data
      window.location.reload();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erreur lors de l'import: fichier invalide");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            Sauvegarde des données
          </DialogTitle>
          <DialogDescription>
            Exportez ou importez vos données au format JSON pour une sauvegarde sécurisée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Exporter</h4>
                <p className="text-sm text-muted-foreground">
                  Téléchargez toutes vos données locales dans un fichier JSON.
                </p>
              </div>
            </div>
            <Button onClick={handleExport} className="w-full rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              Exporter les données
            </Button>
          </div>

          <div className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Importer</h4>
                <p className="text-sm text-muted-foreground">
                  Restaurez vos données à partir d'un fichier de sauvegarde JSON.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full rounded-xl"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? "Importation..." : "Importer des données"}
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              L'import fusionnera les données avec celles existantes. Les éléments avec le même ID seront mis à jour.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
