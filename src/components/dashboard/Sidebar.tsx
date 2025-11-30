import { Shield, Link2, Users, Lightbulb, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActiveSection = "links" | "accounts" | "ideas" | "reminders";

interface SidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  onSignOut: () => void;
}

export function Sidebar({ activeSection, onSectionChange, onSignOut }: SidebarProps) {
  const navItems = [
    { id: "links" as const, label: "Liens", icon: Link2 },
    { id: "accounts" as const, label: "Comptes", icon: Users },
    { id: "ideas" as const, label: "Idées", icon: Lightbulb },
    { id: "reminders" as const, label: "Rappels", icon: Bell },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border shadow-vault">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">VaultKeep</h1>
              <p className="text-xs text-muted-foreground">Coffre-fort digital</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                  activeSection === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </div>
    </aside>
  );
}
