import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { TrashItem } from "@/lib/indexedDB";
import { toast } from "sonner";
import { Trash2, RotateCcw, Clock, Link, User, Lightbulb, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TABLE_ICONS: Record<string, typeof Link> = {
  links: Link,
  accounts: User,
  ideas: Lightbulb,
};

const TABLE_LABELS: Record<string, string> = {
  links: "Lien",
  accounts: "Compte",
  ideas: "Idée",
  categories: "Catégorie",
  reminders: "Rappel",
};

export function TrashSection() {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTrash, restoreFromTrash, permanentDeleteFromTrash } = useLocalDatabase();

  const fetchTrash = async () => {
    try {
      const items = await getTrash();
      setTrashItems(items.sort((a, b) => b.deletedAt - a.deletedAt));
    } catch (error) {
      console.error("Error fetching trash:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (trashId: string) => {
    try {
      const success = await restoreFromTrash(trashId);
      if (success) {
        toast.success("Élément restauré avec succès");
        fetchTrash();
      } else {
        toast.error("Erreur lors de la restauration");
      }
    } catch (error) {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handlePermanentDelete = async (trashId: string) => {
    try {
      await permanentDeleteFromTrash(trashId);
      toast.success("Élément supprimé définitivement");
      fetchTrash();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getDaysRemaining = (expiresAt: number) => {
    const now = Date.now();
    const remaining = expiresAt - now;
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return days;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Corbeille</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Les éléments supprimés sont conservés 30 jours avant d'être définitivement effacés
        </p>
      </div>

      {trashItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              La corbeille est vide
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trashItems.map((item) => {
            const Icon = TABLE_ICONS[item.table] || Trash2;
            const daysRemaining = getDaysRemaining(item.expiresAt);

            return (
              <Card key={item.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">
                          {item.data.name || item.data.title || "Sans titre"}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {TABLE_LABELS[item.table] || item.table}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Supprimé {formatDistanceToNow(item.deletedAt, { addSuffix: true, locale: fr })}
                        </span>
                        <span className={daysRemaining <= 7 ? "text-destructive font-medium" : ""}>
                          {daysRemaining <= 0 ? "Expiration imminente" : `${daysRemaining} jour(s) restant(s)`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Restaurer</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="gap-1">
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                              Supprimer définitivement ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. L'élément sera définitivement supprimé et ne pourra plus être récupéré.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
