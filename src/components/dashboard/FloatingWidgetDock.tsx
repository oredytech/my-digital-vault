import { useState, useEffect } from "react";
import { Calculator, Timer, QrCode, X, GripVertical, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FloatingCalculator } from "./FloatingCalculator";
import { FloatingPomodoro } from "./FloatingPomodoro";
import { FloatingQRCode } from "./FloatingQRCode";
import { useIsMobile } from "@/hooks/use-mobile";

type WidgetId = "calculator" | "pomodoro" | "qrcode";

interface WidgetConfig {
  id: WidgetId;
  label: string;
  icon: typeof Calculator;
  color: string;
}

const widgets: WidgetConfig[] = [
  { id: "calculator", label: "Calculatrice", icon: Calculator, color: "text-blue-400" },
  { id: "pomodoro", label: "Pomodoro", icon: Timer, color: "text-orange-400" },
  { id: "qrcode", label: "QR Code", icon: QrCode, color: "text-green-400" },
];

export function FloatingWidgetDock() {
  const isMobile = useIsMobile();
  const [openWidgets, setOpenWidgets] = useState<Set<WidgetId>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockVisible, setDockVisible] = useState(() => {
    const saved = localStorage.getItem("vk-dock-visible");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("vk-dock-visible", String(dockVisible));
  }, [dockVisible]);

  const toggleWidget = (id: WidgetId) => {
    setOpenWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const closeWidget = (id: WidgetId) => {
    setOpenWidgets((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (!dockVisible) {
    return (
      <button
        onClick={() => setDockVisible(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        title="Ouvrir les widgets"
      >
        <GripVertical className="w-5 h-5" />
      </button>
    );
  }

  return (
    <>
      {/* Floating Dock */}
      <div
        className={cn(
          "fixed z-40 transition-all duration-300",
          isMobile
            ? "bottom-20 right-3 left-3"
            : "bottom-6 right-6"
        )}
      >
        <div
          className={cn(
            "bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl transition-all duration-300",
            dockCollapsed ? "p-2" : "p-3"
          )}
        >
          {dockCollapsed ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDockCollapsed(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              {widgets.map((w) => (
                <Button
                  key={w.id}
                  variant={openWidgets.has(w.id) ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleWidget(w.id)}
                >
                  <w.icon className={cn("w-4 h-4", !openWidgets.has(w.id) && w.color)} />
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDockVisible(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Widgets
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => setDockCollapsed(true)}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setDockVisible(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className={cn("flex gap-2", isMobile ? "justify-around" : "")}>
                {widgets.map((w) => {
                  const isOpen = openWidgets.has(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWidget(w.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                        isOpen
                          ? "bg-primary/20 text-primary scale-105"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <w.icon className={cn("w-5 h-5", !isOpen && w.color)} />
                      <span className="text-[10px] font-medium">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rendered widgets */}
      {openWidgets.has("calculator") && (
        <FloatingCalculator onClose={() => closeWidget("calculator")} />
      )}
      {openWidgets.has("pomodoro") && (
        <FloatingPomodoro onClose={() => closeWidget("pomodoro")} />
      )}
      {openWidgets.has("qrcode") && (
        <FloatingQRCode onClose={() => closeWidget("qrcode")} />
      )}
    </>
  );
}
