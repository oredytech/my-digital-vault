import { useState, useEffect } from "react";
import { 
  Clock, 
  Link2, 
  Users, 
  Lightbulb, 
  Bell, 
  Tag, 
  Trash2,
  Plus,
  Edit,
  RefreshCw
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";

interface ActivityItem {
  id: string;
  type: "link" | "account" | "idea" | "reminder" | "category";
  action: "create" | "update" | "delete" | "sync";
  title: string;
  timestamp: Date;
}

const typeIcons = {
  link: Link2,
  account: Users,
  idea: Lightbulb,
  reminder: Bell,
  category: Tag,
};

const actionColors = {
  create: "bg-green-500/20 text-green-500",
  update: "bg-blue-500/20 text-blue-500",
  delete: "bg-destructive/20 text-destructive",
  sync: "bg-primary/20 text-primary",
};

const actionLabels = {
  create: "Créé",
  update: "Modifié",
  delete: "Supprimé",
  sync: "Synchronisé",
};

export function ActivityTimeline() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { getData } = useLocalDatabase();

  useEffect(() => {
    const loadActivities = async () => {
      const allActivities: ActivityItem[] = [];

      // Load recent items from each table
      const tables = [
        { name: "links", type: "link" as const },
        { name: "accounts", type: "account" as const },
        { name: "ideas", type: "idea" as const },
        { name: "reminders", type: "reminder" as const },
        { name: "categories", type: "category" as const },
      ];

      for (const table of tables) {
        const data = await getData<any>(table.name as any);
        
        data.forEach((item: any) => {
          // Check if recently created
          const createdAt = new Date(item.created_at);
          const updatedAt = new Date(item.updated_at);
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          if (createdAt > oneDayAgo) {
            allActivities.push({
              id: `${item.id}-create`,
              type: table.type,
              action: "create",
              title: item.title || item.name || "Sans titre",
              timestamp: createdAt,
            });
          }

          if (updatedAt > oneDayAgo && updatedAt.getTime() !== createdAt.getTime()) {
            allActivities.push({
              id: `${item.id}-update`,
              type: table.type,
              action: "update",
              title: item.title || item.name || "Sans titre",
              timestamp: updatedAt,
            });
          }
        });
      }

      // Sort by timestamp descending
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Take only the last 20 activities
      setActivities(allActivities.slice(0, 20));
    };

    loadActivities();
    
    // Refresh every minute
    const interval = setInterval(loadActivities, 60000);
    return () => clearInterval(interval);
  }, [getData]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Activité récente
        </CardTitle>
        <CardDescription>
          Vos dernières actions (24h)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune activité récente</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = typeIcons[activity.type];
                  
                  return (
                    <div key={activity.id} className="relative flex items-start gap-4 pl-10">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-2.5 w-3 h-3 rounded-full border-2 border-background",
                        actionColors[activity.action].replace("/20", "")
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{activity.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", actionColors[activity.action])}
                          >
                            {actionLabels[activity.action]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(activity.timestamp, { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}