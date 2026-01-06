import { Link2, Users, Lightbulb, Bell, BarChart3, Trash2, FileText, Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

type ActiveSection = "stats" | "links" | "accounts" | "ideas" | "reminders" | "categories" | "trash" | "notes" | "kanban";

interface MobileNavProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

export function MobileNav({ activeSection, onSectionChange }: MobileNavProps) {
  const mainNavItems = [
    { id: "stats" as const, label: "Stats", icon: BarChart3 },
    { id: "links" as const, label: "Liens", icon: Link2 },
    { id: "accounts" as const, label: "Comptes", icon: Users },
    { id: "ideas" as const, label: "Idées", icon: Lightbulb },
  ];

  const moreItems = [
    { id: "notes" as const, label: "Notes", icon: FileText },
    { id: "kanban" as const, label: "Kanban", icon: Columns },
    { id: "reminders" as const, label: "Rappels", icon: Bell },
    { id: "trash" as const, label: "Corbeille", icon: Trash2 },
  ];

  const isMoreActive = moreItems.some(item => item.id === activeSection);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 lg:hidden safe-area-bottom rounded-t-2xl">
      <div className="flex items-center justify-around py-2 px-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all min-w-0 flex-1",
                activeSection === item.id
                  ? "text-primary bg-primary/10"
                  : "text-sidebar-foreground hover:text-primary"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-medium truncate">{item.label}</span>
            </button>
          );
        })}
        
        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all min-w-0 flex-1",
                isMoreActive
                  ? "text-primary bg-primary/10"
                  : "text-sidebar-foreground hover:text-primary"
              )}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-medium truncate">Plus</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-sidebar border-sidebar-border mb-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    activeSection === item.id && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
