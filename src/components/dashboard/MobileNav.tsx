import { Link2, Users, Lightbulb, Bell, BarChart3, Trash2, FileText, Columns, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

type ActiveSection = "stats" | "links" | "accounts" | "ideas" | "reminders" | "categories" | "trash" | "notes" | "kanban" | "surveys";

interface MobileNavProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

export function MobileNav({ activeSection, onSectionChange }: MobileNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const mainNavItems = [
    { id: "stats" as const, label: "Stats", icon: BarChart3 },
    { id: "links" as const, label: "Liens", icon: Link2 },
    { id: "accounts" as const, label: "Comptes", icon: Users },
    { id: "ideas" as const, label: "Idées", icon: Lightbulb },
  ];

  const moreItems = [
    { id: "notes" as const, label: "Notes", icon: FileText },
    { id: "kanban" as const, label: "Kanban", icon: Columns },
    { id: "surveys" as const, label: "Enquêtes", icon: ClipboardList },
    { id: "reminders" as const, label: "Rappels", icon: Bell },
    { id: "trash" as const, label: "Corbeille", icon: Trash2 },
  ];

  const isMoreActive = moreItems.some(item => item.id === activeSection);

  const handleSectionChange = (section: ActiveSection) => {
    onSectionChange(section);
    setSheetOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 lg:hidden">
      <div className="flex items-center justify-around py-2 px-1 safe-area-bottom">
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
        
        {/* More Menu with Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
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
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-sidebar border-sidebar-border rounded-t-2xl p-0 h-auto max-h-[50vh]">
            <div className="p-4 pb-8">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <SheetTitle className="text-lg font-semibold text-sidebar-foreground mb-4 text-center">
                Plus d'options
              </SheetTitle>
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl transition-all",
                        activeSection === item.id
                          ? "bg-primary/20 text-primary"
                          : "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80"
                      )}
                    >
                      <Icon className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}