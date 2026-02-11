import { useState, useEffect } from "react";
import { Calculator, X, History, Trash2, Minus as MinusIcon, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingCalculatorProps {
  onClose: () => void;
}

interface HistoryEntry {
  expression: string;
  result: string;
  timestamp: Date;
}

export function FloatingCalculator({ onClose }: FloatingCalculatorProps) {
  const isMobile = useIsMobile();
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcExpression, setCalcExpression] = useState("");
  const [calcHistory, setCalcHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isRadians, setIsRadians] = useState(true);
  const [memory] = useState(0);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("calcHistory");
    if (saved) {
      try {
        setCalcHistory(JSON.parse(saved).map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (calcHistory.length > 0) localStorage.setItem("calcHistory", JSON.stringify(calcHistory));
  }, [calcHistory]);

  const addToHistory = (expression: string, result: string) => {
    setCalcHistory((prev) => [{ expression, result, timestamp: new Date() }, ...prev.slice(0, 49)]);
  };

  const calcButtons = [
    { label: isRadians ? "DEG" : "RAD", action: "toggle-mode", cls: "bg-indigo-500/20 text-indigo-400 text-[10px]" },
    { label: "C", action: "clear", cls: "bg-destructive/20 text-destructive" },
    { label: "⌫", action: "backspace" },
    { label: "÷", action: "input", value: "/" },
    { label: "sin", action: "func", value: "Math.sin(", cls: "bg-blue-500/20 text-blue-400 text-[10px]" },
    { label: "7", action: "input", value: "7" },
    { label: "8", action: "input", value: "8" },
    { label: "9", action: "input", value: "9" },
    { label: "×", action: "input", value: "*" },
    { label: "cos", action: "func", value: "Math.cos(", cls: "bg-blue-500/20 text-blue-400 text-[10px]" },
    { label: "4", action: "input", value: "4" },
    { label: "5", action: "input", value: "5" },
    { label: "6", action: "input", value: "6" },
    { label: "−", action: "input", value: "-" },
    { label: "tan", action: "func", value: "Math.tan(", cls: "bg-blue-500/20 text-blue-400 text-[10px]" },
    { label: "1", action: "input", value: "1" },
    { label: "2", action: "input", value: "2" },
    { label: "3", action: "input", value: "3" },
    { label: "+", action: "input", value: "+" },
    { label: "√", action: "func", value: "Math.sqrt(" },
    { label: "0", action: "input", value: "0", cls: "col-span-2" },
    { label: ".", action: "input", value: "." },
    { label: "(", action: "input", value: "(" },
    { label: ")", action: "input", value: ")" },
    { label: "xʸ", action: "input", value: "**" },
    { label: "π", action: "input", value: "Math.PI" },
    { label: "log", action: "func", value: "Math.log10(", cls: "text-[10px]" },
    { label: "ln", action: "func", value: "Math.log(", cls: "text-[10px]" },
    { label: "=", action: "calculate", cls: "bg-primary text-primary-foreground col-span-2" },
  ];

  const handleBtn = (btn: (typeof calcButtons)[0]) => {
    switch (btn.action) {
      case "clear":
        setCalcDisplay("0");
        setCalcExpression("");
        break;
      case "backspace":
        if (calcExpression.length > 0) {
          const ne = calcExpression.slice(0, -1);
          setCalcExpression(ne);
          setCalcDisplay(ne || "0");
        }
        break;
      case "toggle-mode":
        setIsRadians(!isRadians);
        toast.info(isRadians ? "Mode Degrés" : "Mode Radians");
        break;
      case "input":
      case "func":
        const ne = calcExpression === "0" || calcExpression === "" ? btn.value! : calcExpression + btn.value!;
        setCalcExpression(ne);
        setCalcDisplay(ne.replace(/Math\./g, "").replace(/\*\*/g, "^").replace(/\*/g, "×").replace(/\//g, "÷"));
        break;
      case "calculate":
        try {
          let expr = calcExpression;
          if (!isRadians) {
            expr = expr
              .replace(/Math\.sin\(/g, "Math.sin(Math.PI/180*")
              .replace(/Math\.cos\(/g, "Math.cos(Math.PI/180*")
              .replace(/Math\.tan\(/g, "Math.tan(Math.PI/180*");
          }
          const result = new Function(`return ${expr}`)();
          const formatted = typeof result === "number"
            ? Number.isInteger(result) ? result.toString() : result.toFixed(10).replace(/\.?0+$/, "")
            : "Erreur";
          addToHistory(calcDisplay, formatted);
          setCalcDisplay(formatted);
          setCalcExpression(formatted);
        } catch {
          setCalcDisplay("Erreur");
          setCalcExpression("");
        }
        break;
    }
  };

  if (minimized) {
    return (
      <div
        className={cn(
          "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl cursor-pointer hover:scale-105 transition-transform",
          isMobile ? "bottom-36 right-3" : "bottom-24 right-6"
        )}
        onClick={() => setMinimized(false)}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm font-bold text-foreground">{calcDisplay}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
        isMobile
          ? "bottom-36 left-3 right-3 max-h-[60vh]"
          : "bottom-24 right-6 w-80"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Calculatrice</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
            <MinusIcon className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Display */}
      <div className="px-3 py-2 bg-muted/30">
        <p className="text-right text-2xl font-mono font-bold text-foreground truncate">{calcDisplay}</p>
        <span className="text-[10px] text-muted-foreground">{isRadians ? "RAD" : "DEG"} | M: {memory !== 0 ? memory.toFixed(2) : "–"}</span>
      </div>

      {/* History */}
      {showHistory && (
        <div className="px-3 py-2 border-b border-border max-h-28">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-medium text-foreground">Historique</span>
            {calcHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setCalcHistory([]); localStorage.removeItem("calcHistory"); }} className="h-5 px-2 text-[10px] text-destructive">
                <Trash2 className="h-3 w-3 mr-1" /> Effacer
              </Button>
            )}
          </div>
          <ScrollArea className="h-16">
            {calcHistory.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-2">Vide</p>
            ) : (
              <div className="space-y-0.5">
                {calcHistory.map((e, i) => (
                  <button key={i} onClick={() => { setCalcDisplay(e.result); setCalcExpression(e.result); setShowHistory(false); }}
                    className="w-full text-left p-1 rounded hover:bg-muted text-[10px]">
                    <div className="text-muted-foreground truncate">{e.expression}</div>
                    <div className="text-foreground font-medium">= {e.result}</div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-5 gap-1 p-2 flex-1">
        {calcButtons.map((btn, i) => (
          <Button
            key={i}
            variant="outline"
            onClick={() => handleBtn(btn)}
            className={cn("h-9 text-xs font-semibold transition-all active:scale-95 p-0", btn.cls)}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
