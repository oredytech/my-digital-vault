import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { FolderOpen, HardDrive, Check, Cloud, RefreshCw } from "lucide-react";
import { fileSystemStorage } from "@/lib/fileSystemStorage";

interface FileSystemAccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileSystemAccess({ open, onOpenChange }: FileSystemAccessProps) {
  const { 
    hasFileSystemAccess, 
    requestFileSystemAccess, 
    saveToFileSystem,
    isAutoSyncing 
  } = useLocalDatabase();

  const handleRequestAccess = async () => {
    const granted = await requestFileSystemAccess();
    if (granted) {
      onOpenChange(false);
    }
  };

  const handleSaveNow = async () => {
    await saveToFileSystem();
  };

  const isAvailable = fileSystemStorage.isAvailable();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Stockage local
          </DialogTitle>
          <DialogDescription>
            Sauvegardez vos données dans un dossier local pour un accès hors ligne garanti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isAvailable ? (
            <div className="bg-amber-500/10 text-amber-500 rounded-lg p-4 text-sm">
              <p>Cette fonctionnalité n'est pas disponible sur votre navigateur.</p>
              <p className="mt-2 text-xs opacity-80">
                Utilisez Chrome, Edge ou un navigateur compatible avec l'API File System Access.
              </p>
            </div>
          ) : hasFileSystemAccess ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 text-emerald-500 rounded-lg p-4 flex items-center gap-3">
                <Check className="w-5 h-5" />
                <div>
                  <p className="font-medium">Accès activé</p>
                  <p className="text-xs opacity-80">
                    Dossier: {fileSystemStorage.getFolderName()}
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <Button 
                  onClick={handleSaveNow}
                  disabled={isAutoSyncing}
                  className="w-full"
                  variant="outline"
                >
                  {isAutoSyncing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4 mr-2" />
                  )}
                  Sauvegarder maintenant
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Les données sont automatiquement sauvegardées lors de chaque synchronisation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Comment ça fonctionne ?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Choisissez un dossier sur votre appareil</li>
                  <li>• Un sous-dossier "VaultKeep_Data" sera créé</li>
                  <li>• Vos données y seront sauvegardées en JSON</li>
                  <li>• Accédez à vos données même sans l'application</li>
                </ul>
              </div>

              <Button 
                onClick={handleRequestAccess}
                className="w-full"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Choisir un dossier
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Vous pouvez révoquer cette permission à tout moment dans les paramètres de votre navigateur.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}