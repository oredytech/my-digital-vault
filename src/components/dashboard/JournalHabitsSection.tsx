import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookHeart, Plus, Flame, Trash2, Smile, Frown, Meh } from "lucide-react";

interface JournalEntry {
  id: string;
  entry_date: string;
  mood: number | null;
  title: string | null;
  content: string;
  created_at: string;
}

interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: string;
  archived: boolean;
}

interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
}

const moodIcons = [
  { v: 1, icon: Frown, label: "Mauvais", color: "text-red-500" },
  { v: 2, icon: Frown, label: "Bof", color: "text-orange-500" },
  { v: 3, icon: Meh, label: "Neutre", color: "text-yellow-500" },
  { v: 4, icon: Smile, label: "Bien", color: "text-lime-500" },
  { v: 5, icon: Smile, label: "Super", color: "text-green-500" },
];

const today = () => new Date().toISOString().slice(0, 10);

function computeStreak(logs: string[]): number {
  if (logs.length === 0) return 0;
  const set = new Set(logs);
  let streak = 0;
  const d = new Date();
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function JournalHabitsSection() {
  // Journal
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [eOpen, setEOpen] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eContent, setEContent] = useState("");
  const [eMood, setEMood] = useState<number>(3);

  // Habits
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [hOpen, setHOpen] = useState(false);
  const [hName, setHName] = useState("");
  const [hIcon, setHIcon] = useState("⭐");
  const [hColor, setHColor] = useState("#10b981");

  const loadAll = async () => {
    const [{ data: e }, { data: h }, { data: l }] = await Promise.all([
      supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }),
      supabase.from("habits").select("*").eq("archived", false).order("created_at"),
      supabase.from("habit_logs").select("*").gte(
        "log_date",
        new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
      ),
    ]);
    setEntries((e as JournalEntry[]) || []);
    setHabits((h as Habit[]) || []);
    setLogs((l as HabitLog[]) || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createEntry = async () => {
    if (!eContent.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      title: eTitle.trim() || null,
      content: eContent.trim(),
      mood: eMood,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Entrée ajoutée");
      setETitle("");
      setEContent("");
      setEMood(3);
      setEOpen(false);
      loadAll();
    }
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("journal_entries").delete().eq("id", id);
    loadAll();
  };

  const createHabit = async () => {
    if (!hName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name: hName.trim(),
      icon: hIcon,
      color: hColor,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Habitude créée");
      setHName("");
      setHOpen(false);
      loadAll();
    }
  };

  const toggleHabitToday = async (habit: Habit) => {
    const t = today();
    const existing = logs.find((l) => l.habit_id === habit.id && l.log_date === t);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
    } else {
      await supabase.from("habit_logs").insert({
        user_id: user.id,
        habit_id: habit.id,
        log_date: t,
      });
    }
    loadAll();
  };

  const archiveHabit = async (id: string) => {
    await supabase.from("habits").update({ archived: true }).eq("id", id);
    loadAll();
  };

  const habitStreaks = useMemo(() => {
    const map: Record<string, number> = {};
    habits.forEach((h) => {
      const dates = logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date);
      map[h.id] = computeStreak(dates);
    });
    return map;
  }, [habits, logs]);

  const last7Days = useMemo(() => {
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().slice(0, 10));
    }
    return arr;
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookHeart className="w-6 h-6 text-primary" /> Journal & Habitudes
        </h2>
        <p className="text-sm text-muted-foreground">
          Suivez votre humeur et construisez des routines durables
        </p>
      </header>

      <Tabs defaultValue="habits">
        <TabsList>
          <TabsTrigger value="habits">Habitudes</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        {/* HABITS */}
        <TabsContent value="habits" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={hOpen} onOpenChange={setHOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Habitude
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle habitude</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Ex: Méditer 10 min"
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                  />
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Icône"
                      value={hIcon}
                      onChange={(e) => setHIcon(e.target.value)}
                      className="w-20"
                      maxLength={2}
                    />
                    <Input
                      type="color"
                      value={hColor}
                      onChange={(e) => setHColor(e.target.value)}
                      className="w-20 h-10 p-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createHabit}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {habits.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              Aucune habitude. Créez-en une pour commencer.
            </Card>
          ) : (
            <div className="grid gap-3">
              {habits.map((h) => {
                const t = today();
                const doneToday = logs.some(
                  (l) => l.habit_id === h.id && l.log_date === t
                );
                return (
                  <Card key={h.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: `${h.color}25` }}
                      >
                        {h.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{h.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Flame className="w-3.5 h-3.5 text-orange-500" />
                          <span>{habitStreaks[h.id] || 0} jours</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {last7Days.map((d) => {
                          const done = logs.some(
                            (l) => l.habit_id === h.id && l.log_date === d
                          );
                          return (
                            <div
                              key={d}
                              className="w-4 h-4 rounded"
                              style={{
                                backgroundColor: done ? h.color : "hsl(var(--muted))",
                              }}
                              title={d}
                            />
                          );
                        })}
                      </div>
                      <Button
                        size="sm"
                        variant={doneToday ? "default" : "outline"}
                        onClick={() => toggleHabitToday(h)}
                        style={doneToday ? { backgroundColor: h.color } : undefined}
                      >
                        {doneToday ? "✓ Fait" : "Marquer"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => archiveHabit(h.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* JOURNAL */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={eOpen} onOpenChange={setEOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Entrée
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Comment va votre journée ?</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Titre (optionnel)"
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Que retenez-vous d'aujourd'hui ?"
                    value={eContent}
                    onChange={(e) => setEContent(e.target.value)}
                    rows={6}
                  />
                  <div>
                    <p className="text-sm font-medium mb-2">Humeur</p>
                    <div className="flex gap-2">
                      {moodIcons.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.v}
                            onClick={() => setEMood(m.v)}
                            className={`p-2 rounded-lg border-2 transition ${
                              eMood === m.v
                                ? "border-primary bg-primary/10"
                                : "border-transparent"
                            }`}
                            title={m.label}
                          >
                            <Icon className={`w-6 h-6 ${m.color}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createEntry}>Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {entries.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              Aucune entrée. Commencez votre journal aujourd'hui.
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => {
                const m = moodIcons.find((x) => x.v === (e.mood || 3));
                const Icon = m?.icon || Meh;
                return (
                  <Card key={e.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-6 h-6 ${m?.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {e.title && <p className="font-semibold">{e.title}</p>}
                          <Badge variant="secondary" className="text-xs">
                            {new Date(e.entry_date).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{e.content}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteEntry(e.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
