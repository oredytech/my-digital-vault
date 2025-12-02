import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface MobileHeaderProps {
  onSignOut: () => void;
}

export function MobileHeader({ onSignOut }: MobileHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 bg-sidebar border-b border-sidebar-border z-40 lg:hidden safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.webp" 
            alt="VaultKeep Logo" 
            className="w-10 h-10 rounded-xl"
          />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">VaultKeep</h1>
            <p className="text-[10px] text-muted-foreground">Coffre-fort digital</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-sidebar-foreground"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
