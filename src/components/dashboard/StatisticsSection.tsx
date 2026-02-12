import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, PieChartIcon, Bell, Link2, Users, Lightbulb, Loader2, WifiOff } from "lucide-react";
import { QuickActionsWidget } from "./QuickActionsWidget";
import { PasswordGenerator } from "./PasswordGenerator";
import { ActivityTimeline } from "./ActivityTimeline";
import { SmartSuggestions } from "./SmartSuggestions";
import { SecurityHealthDashboard } from "./SecurityHealthDashboard";
import { SubscriptionTracker } from "./SubscriptionTracker";
import { AIProductivityDigest } from "./AIProductivityDigest";

interface CategoryStats {
  name: string;
  links: number;
  accounts: number;
  ideas: number;
  color: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Link {
  id: string;
  category_id: string | null;
}

interface Account {
  id: string;
  category_id: string | null;
}

interface Idea {
  id: string;
  category_id: string | null;
}

interface Reminder {
  id: string;
  title: string;
  remind_at: string;
  related_type: string;
  is_completed: boolean | null;
}

export function StatisticsSection() {
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [totalCounts, setTotalCounts] = useState({ links: 0, accounts: 0, ideas: 0, reminders: 0 });
  const [loading, setLoading] = useState(true);
  const { getData, isOnline, isInitialized } = useLocalDatabase();

  useEffect(() => {
    if (isInitialized) {
      fetchStatistics();
    }
  }, [isInitialized]);

  const fetchStatistics = async () => {
    try {
      // Fetch all data from local database
      const [categories, links, accounts, ideas, allReminders] = await Promise.all([
        getData<Category>("categories"),
        getData<Link>("links"),
        getData<Account>("accounts"),
        getData<Idea>("ideas"),
        getData<Reminder>("reminders"),
      ]);

      // Filter active reminders and sort by date
      const reminders = allReminders
        .filter((r) => !r.is_completed)
        .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
        .slice(0, 5);

      // Calculate totals
      setTotalCounts({
        links: links.length,
        accounts: accounts.length,
        ideas: ideas.length,
        reminders: reminders.length,
      });

      // Calculate stats per category
      const stats: CategoryStats[] = categories.map((cat) => ({
        name: cat.name,
        links: links.filter((l) => l.category_id === cat.id).length,
        accounts: accounts.filter((a) => a.category_id === cat.id).length,
        ideas: ideas.filter((i) => i.category_id === cat.id).length,
        color: cat.color || "#06b6d4",
      }));

      // Add uncategorized
      const uncategorized = {
        name: "Non catégorisé",
        links: links.filter((l) => !l.category_id).length,
        accounts: accounts.filter((a) => !a.category_id).length,
        ideas: ideas.filter((i) => !i.category_id).length,
        color: "#64748b",
      };

      if (uncategorized.links > 0 || uncategorized.accounts > 0 || uncategorized.ideas > 0) {
        stats.push(uncategorized);
      }

      setCategoryStats(stats);
      setUpcomingReminders(reminders);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: "Liens", value: totalCounts.links, color: "#06b6d4" },
    { name: "Comptes", value: totalCounts.accounts, color: "#8b5cf6" },
    { name: "Idées", value: totalCounts.ideas, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          <span>Statistiques</span>
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs font-normal text-amber-500 bg-amber-500/10 rounded-full px-2 py-1">
              <WifiOff className="w-3 h-3" />
              Hors-ligne
            </span>
          )}
        </h2>
      </div>

      {/* Quick Actions Widget */}
      <QuickActionsWidget />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">{totalCounts.links}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Liens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">{totalCounts.accounts}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Comptes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">{totalCounts.ideas}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Idées</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 flex-shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">{totalCounts.reminders}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Rappels</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Suggestions */}
      <SmartSuggestions />

      {/* Value-Added Dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <SecurityHealthDashboard />
        <SubscriptionTracker />
        <AIProductivityDigest />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bar Chart - Items per Category */}
        <Card className="bg-card border-border">
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Éléments par catégorie</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {categoryStats.length > 0 ? (
              <div className="w-full h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryStats} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      width={35}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px"
                      }} 
                    />
                    <Bar dataKey="links" name="Liens" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="accounts" name="Comptes" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="ideas" name="Idées" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">Aucune donnée à afficher</p>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Répartition globale</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {pieData.length > 0 ? (
              <div className="w-full h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px"
                      }} 
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px" }}
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">Aucune donnée à afficher</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Password Generator, Activity Timeline, Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Password Generator */}
        <PasswordGenerator />

        {/* Activity Timeline */}
        <ActivityTimeline />

        {/* Upcoming Reminders */}
        <Card className="bg-card border-border md:col-span-2 lg:col-span-1">
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
              <span className="truncate">Rappels à venir</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {upcomingReminders.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {upcomingReminders.map((reminder) => {
                  const remindDate = new Date(reminder.remind_at);
                  const isOverdue = remindDate < new Date();
                  return (
                    <div
                      key={reminder.id}
                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        isOverdue ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? "bg-destructive" : "bg-primary"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-xs sm:text-sm truncate">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {reminder.related_type === "account" ? "Compte" : "Autre"}
                          </p>
                        </div>
                      </div>
                      <p className={`text-xs sm:text-sm flex-shrink-0 ml-2 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {remindDate.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">Aucun rappel à venir</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}