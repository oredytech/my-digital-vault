import { useState, useRef, useEffect } from "react";
import { Timer, X, Play, Pause, RotateCcw, Minus as MinusIcon, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingPomodoroProps {
  onClose: () => void;
}

export function FloatingPomodoro({ onClose }: FloatingPomodoroProps) {
  const isMobile = useIsMobile();
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [minimized, setMinimized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            const nextMode = mode === "work" ? "break" : "work";
            toast.success(mode === "work" ? "Pause ! Reposez-vous 5 min." : "Reprise du travail !", { duration: 8000 });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("VaultKeep - Pomodoro", {
                body: mode === "work" ? "Session terminée ! Pause de 5 min." : "Pause terminée, au travail !",
                icon: "/logo.webp",
              });
            }
            setMode(nextMode);
            return nextMode === "break" ? 5 * 60 : 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, mode]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setTime(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const mins = Math.floor(time / 60);
  const secs = time % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const progress = mode === "work" ? ((25 * 60 - time) / (25 * 60)) * 100 : ((5 * 60 - time) / (5 * 60)) * 100;

  if (minimized) {
    return (
      <div
        className={cn(
          "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl cursor-pointer hover:scale-105 transition-transform",
          isMobile ? "bottom-36 left-3" : "bottom-24 left-auto right-[22rem]"
        )}
        onClick={() => setMinimized(false)}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Timer className={cn("w-4 h-4", isActive ? "text-orange-400 animate-pulse" : "text-orange-400")} />
          <span className="font-mono text-sm font-bold text-foreground">{formatted}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden",
        isMobile ? "bottom-36 left-3 right-3" : "bottom-24 left-auto right-[22rem] w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          <Timer className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold text-foreground">Pomodoro</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
            <MinusIcon className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col items-center gap-3">
        {/* Mode badge */}
        <div className={cn(
          "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
          mode === "work" ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
        )}>
          {mode === "work" ? "Travail" : "Pause"}
        </div>

        {/* Progress ring */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={mode === "work" ? "hsl(var(--primary))" : "hsl(142, 76%, 36%)"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-2xl font-bold text-foreground">{formatted}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className={cn("h-12 w-12 rounded-full", isActive ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90")}
            onClick={toggle}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-9 rounded-full px-3"
            onClick={() => {
              const next = mode === "work" ? "break" : "work";
              setMode(next);
              setIsActive(false);
              setTime(next === "work" ? 25 * 60 : 5 * 60);
            }}
          >
            {mode === "work" ? "Pause" : "Travail"}
          </Button>
        </div>
      </div>
    </div>
  );
}
