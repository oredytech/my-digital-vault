import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Grid3x3, List, Calendar, Trash2, CheckCircle2, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  remind_at: string;
  is_completed: boolean | null;
  related_type: string;
  related_id: string;
  created_at: string;
  user_id?: string;
}

export function RemindersSection() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const { getData, updateData, deleteData, isOnline } = useLocalDatabase();

  useEffect(() => {
    fetchReminders();
    const createReminders = async () => {
      if (isOnline) {
        try {
          await supabase.rpc('create_account_expiration_reminder');
        } catch (error) {
          console.error('Error creating reminders:', error);
        }
      }
    };
    createReminders();
  }, [isOnline]);

  const fetchReminders = async () => {
    try {
      const data = await getData("reminders");
      const sortedData = (data as Reminder[]).sort((a, b) => 
        new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
      );
      setReminders(sortedData);
    } catch (error) {
      toast.error("Erreur lors du chargement des rappels");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (id: string, currentStatus: boolean | null) => {
    try {
      await updateData("reminders", id, { is_completed: !currentStatus });
      toast.success(currentStatus ? "Rappel réactivé" : "Rappel marqué comme terminé");
      fetchReminders();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleSendEmail = async (reminderId: string) => {
    if (!isOnline) {
      toast.error("Connexion internet requise pour envoyer un email");
      return;
    }
    setSendingEmail(reminderId);
    try {
      const { error } = await supabase.functions.invoke("send-reminder-email", {
        body: { reminderId },
      });

      if (error) throw error;
      toast.success("Email envoyé avec succès !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteData("reminders", id);
      toast.success("Rappel supprimé");
      fetchReminders();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const isPast = (date: string) => new Date(date) < new Date();
  const activeReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Mes Rappels</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gérez vos rappels et notifications importantes</p>
        </div>
        <div className="flex items-center border rounded-lg p-1 bg-muted/30">
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")} className="h-8 w-8">
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("list")} className="h-8 w-8">
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {activeReminders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actifs ({activeReminders.length})</h3>
          <div className={viewMode === "grid" ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {activeReminders.map((reminder) => {
              const isOverdue = isPast(reminder.remind_at);
              return (
                <Card key={reminder.id} className={`hover:shadow-vault transition-shadow ${isOverdue ? 'border-destructive/50' : ''}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <Bell className={`w-5 h-5 ${isOverdue ? 'text-destructive' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{reminder.title}</CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(reminder.remind_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </div>
                        {isOverdue && <span className="text-xs text-destructive font-medium mt-1 inline-block">En retard</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleSendEmail(reminder.id)} 
                        disabled={sendingEmail === reminder.id || !isOnline} 
                        className="h-8 w-8" 
                        title={isOnline ? "Envoyer par email" : "Connexion requise"}
                      >
                        <Mail className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleComplete(reminder.id, reminder.is_completed)} className="h-8 w-8">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(reminder.id)} className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  {reminder.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reminder.description}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {completedReminders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Terminés ({completedReminders.length})</h3>
          <div className={viewMode === "grid" ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {completedReminders.map((reminder) => (
              <Card key={reminder.id} className="opacity-60 hover:opacity-100 transition-opacity">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-through">{reminder.title}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(reminder.remind_at), "dd MMM yyyy", { locale: fr })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleComplete(reminder.id, reminder.is_completed)} className="h-8 w-8">
                      <Bell className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(reminder.id)} className="h-8 w-8">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reminders.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun rappel configuré</p>
          <p className="text-sm text-muted-foreground mt-1">Les rappels seront créés automatiquement pour vos comptes avec une durée définie</p>
        </div>
      )}
    </div>
  );
}
