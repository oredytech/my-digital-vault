import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CheckSquare, Calendar, Flag, Trash2, ListTodo } from "lucide-react";

interface Task {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  created_at: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500",
  medium: "bg-yellow-500/10 text-yellow-600",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-red-500/10 text-red-600",
};

export function TasksSection() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "done">("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setParentId(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      parent_id: parentId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Tâche créée");
      resetForm();
      setOpen(false);
      load();
    }
  };

  const toggleDone = async (t: Task) => {
    const done = t.status === "done";
    const { error } = await supabase
      .from("tasks")
      .update({
        status: done ? "todo" : "done",
        completed_at: done ? null : new Date().toISOString(),
      })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Supprimée");
    load();
  };

  const isToday = (d: string | null) =>
    d && new Date(d).toDateString() === new Date().toDateString();
  const isOverdue = (d: string | null) =>
    d && new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString();

  const visible = tasks.filter((t) => {
    if (t.parent_id) return false;
    if (filter === "today") return isToday(t.due_date) && t.status !== "done";
    if (filter === "overdue") return isOverdue(t.due_date) && t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    today: tasks.filter((t) => isToday(t.due_date) && t.status !== "done").length,
    overdue: tasks.filter((t) => isOverdue(t.due_date) && t.status !== "done").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-primary" /> Tâches
          </h2>
          <p className="text-sm text-muted-foreground">
            Organisez vos actions avec priorités et échéances
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Titre"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <Select
                value={parentId || "none"}
                onValueChange={(v) => setParentId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sous-tâche de..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tâche racine</SelectItem>
                  {tasks
                    .filter((t) => !t.parent_id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          <p className="text-2xl font-bold text-blue-500">{stats.today}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">En retard</p>
          <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Terminées</p>
          <p className="text-2xl font-bold text-green-500">{stats.done}</p>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "today", "overdue", "done"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toutes" : f === "today" ? "Aujourd'hui" : f === "overdue" ? "En retard" : "Terminées"}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Aucune tâche</Card>
      ) : (
        <div className="space-y-2">
          {visible.map((t) => {
            const subs = tasks.filter((s) => s.parent_id === t.id);
            return (
              <Card key={t.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={t.status === "done"}
                    onCheckedChange={() => toggleDone(t)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        t.status === "done" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={priorityColors[t.priority]} variant="secondary">
                        <Flag className="w-3 h-3 mr-1" /> {t.priority}
                      </Badge>
                      {t.due_date && (
                        <Badge
                          variant="secondary"
                          className={
                            isOverdue(t.due_date) && t.status !== "done"
                              ? "bg-red-500/10 text-red-600"
                              : ""
                          }
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(t.due_date).toLocaleString(undefined, {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Badge>
                      )}
                    </div>
                    {subs.length > 0 && (
                      <div className="mt-3 pl-3 border-l-2 border-border space-y-1.5">
                        {subs.map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={s.status === "done"}
                              onCheckedChange={() => toggleDone(s)}
                            />
                            <span
                              className={`text-sm flex-1 ${
                                s.status === "done"
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {s.title}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => remove(s.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
