import { Link2, Users, Lightbulb, Bell, Tag, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveSection = "stats" | "links" | "accounts" | "ideas" | "reminders" | "categories";

interface MobileNavProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

export function MobileNav({ activeSection, onSectionChange }: MobileNavProps) {
  const navItems = [
    { id: "stats" as const, label: "Stats", icon: BarChart3 },
    { id: "links" as const, label: "Liens", icon: Link2 },
    { id: "accounts" as const, label: "Comptes", icon: Users },
    { id: "ideas" as const, label: "Idées", icon: Lightbulb },
    { id: "reminders" as const, label: "Rappels", icon: Bell },
    { id: "categories" as const, label: "Catégories", icon: Tag },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 lg:hidden safe-area-bottom rounded-t-2xl">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1.5 rounded-lg transition-all min-w-0 flex-1",
                activeSection === item.id
                  ? "text-primary bg-primary/10"
                  : "text-sidebar-foreground hover:text-primary"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
