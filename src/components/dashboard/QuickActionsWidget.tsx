import { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Copy, 
  QrCode,
  Share2,
  Timer,
  Calculator,
  Palette,
  X,
  Delete,
  Divide,
  Percent,
  Plus,
  Minus,
  Equal,
  History,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuickActionsWidgetProps {
  onQuickAdd?: (type: string, data: any) => void;
}

interface HistoryEntry {
  expression: string;
  result: string;
  timestamp: Date;
}

export function QuickActionsWidget({ onQuickAdd }: QuickActionsWidgetProps) {
  const isMobile = useIsMobile();
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcExpression, setCalcExpression] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#00b4d8");
  const [calcHistory, setCalcHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isRadians, setIsRadians] = useState(true);
  const [memory, setMemory] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const pomodoroRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('calcHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setCalcHistory(parsed.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch (e) {
        console.error('Error loading calc history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (calcHistory.length > 0) {
      localStorage.setItem('calcHistory', JSON.stringify(calcHistory));
    }
  }, [calcHistory]);

  const categories = [
    { id: "link", label: "Nouveau lien", icon: "🔗" },
    { id: "idea", label: "Nouvelle idée", icon: "💡" },
    { id: "reminder", label: "Nouveau rappel", icon: "🔔" },
    { id: "note", label: "Nouvelle note", icon: "📝" },
    { id: "account", label: "Nouveau compte", icon: "👤" },
  ];

  // Voice recognition with continuous transcription
  const startVoiceRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("La reconnaissance vocale n'est pas supportée par ce navigateur");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText("");
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres.");
      } else if (event.error !== "aborted") {
        toast.error("Erreur de reconnaissance vocale: " + event.error);
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      
      setVoiceText((prev) => {
        const newText = finalTranscript || interimTranscript;
        return finalTranscript ? prev + finalTranscript : prev.split(" ").slice(0, -1).join(" ") + " " + interimTranscript;
      });
    };

    recognition.start();
    setShowVoiceDialog(true);
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleVoiceSubmit = () => {
    if (!voiceText.trim()) {
      toast.error("Aucun texte à ajouter");
      return;
    }
    if (!selectedCategory) {
      toast.error("Veuillez sélectionner une catégorie");
      return;
    }

    onQuickAdd?.(selectedCategory, { title: voiceText.trim(), content: voiceText.trim() });
    toast.success(`Ajouté comme ${categories.find(c => c.id === selectedCategory)?.label}`);
    setVoiceText("");
    setSelectedCategory("");
    setShowVoiceDialog(false);
  };

  // Pomodoro timer
  const togglePomodoro = () => {
    if (pomodoroActive) {
      if (pomodoroRef.current) clearInterval(pomodoroRef.current);
      setPomodoroActive(false);
      setPomodoroTime(25 * 60);
      toast.info("Pomodoro arrêté");
    } else {
      setPomodoroActive(true);
      toast.success("Pomodoro démarré - 25 minutes");
      
      pomodoroRef.current = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            if (pomodoroRef.current) clearInterval(pomodoroRef.current);
            setPomodoroActive(false);
            toast.success("Pomodoro terminé! Prenez une pause.", { duration: 10000 });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("VaultKeep - Pomodoro", {
                body: "Session terminée! Prenez une pause de 5 minutes.",
                icon: "/logo.webp"
              });
            }
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Add to history
  const addToHistory = (expression: string, result: string) => {
    const entry: HistoryEntry = {
      expression,
      result,
      timestamp: new Date()
    };
    setCalcHistory(prev => [entry, ...prev.slice(0, 49)]);
  };

  const clearHistory = () => {
    setCalcHistory([]);
    localStorage.removeItem('calcHistory');
    toast.success("Historique effacé");
  };

  const useHistoryEntry = (entry: HistoryEntry) => {
    setCalcDisplay(entry.result);
    setCalcExpression(entry.result);
    setShowHistory(false);
  };

  // Scientific Calculator
  const calcButtons = [
    // Row 1 - Memory
    { label: "MC", action: "memory", type: "mc", className: "bg-purple-500/20 text-purple-400 text-xs" },
    { label: "MR", action: "memory", type: "mr", className: "bg-purple-500/20 text-purple-400 text-xs" },
    { label: "M+", action: "memory", type: "m+", className: "bg-purple-500/20 text-purple-400 text-xs" },
    { label: "M-", action: "memory", type: "m-", className: "bg-purple-500/20 text-purple-400 text-xs" },
    { label: "MS", action: "memory", type: "ms", className: "bg-purple-500/20 text-purple-400 text-xs" },
    // Row 2
    { label: isRadians ? "DEG" : "RAD", action: "toggle-mode", className: "bg-indigo-500/20 text-indigo-400 text-xs" },
    { label: "C", action: "clear", className: "bg-destructive/20 text-destructive" },
    { label: "CE", action: "clear-entry", className: "bg-destructive/20 text-destructive" },
    { label: "⌫", action: "backspace", icon: Delete },
    { label: "÷", action: "input", value: "/", icon: Divide },
    // Row 3 - Scientific
    { label: "sin", action: "func", value: "Math.sin(", className: "bg-blue-500/20 text-blue-400 text-xs" },
    { label: "cos", action: "func", value: "Math.cos(", className: "bg-blue-500/20 text-blue-400 text-xs" },
    { label: "tan", action: "func", value: "Math.tan(", className: "bg-blue-500/20 text-blue-400 text-xs" },
    { label: "(", action: "input", value: "(" },
    { label: ")", action: "input", value: ")" },
    // Row 4
    { label: "asin", action: "func", value: "Math.asin(", className: "bg-blue-500/20 text-blue-400 text-xs" },
    { label: "acos", action: "func", value: "Math.acos(", className: "bg-blue-500/20 text-blue-400 text-xs" },
    { label: "atan", action: "func", value: "Math.atan(", className: "bg-blue-500/20 text-blue-400 text-xs" },
    { label: "xʸ", action: "input", value: "**" },
    { label: "×", action: "input", value: "*" },
    // Row 5
    { label: "log", action: "func", value: "Math.log10(", className: "bg-teal-500/20 text-teal-400 text-xs" },
    { label: "ln", action: "func", value: "Math.log(", className: "bg-teal-500/20 text-teal-400 text-xs" },
    { label: "√", action: "func", value: "Math.sqrt(" },
    { label: "x²", action: "power", value: "**2" },
    { label: "-", action: "input", value: "-", icon: Minus },
    // Row 6
    { label: "π", action: "input", value: "Math.PI" },
    { label: "e", action: "input", value: "Math.E" },
    { label: "exp", action: "func", value: "Math.exp(", className: "bg-teal-500/20 text-teal-400 text-xs" },
    { label: "x³", action: "power", value: "**3" },
    { label: "+", action: "input", value: "+", icon: Plus },
    // Row 7
    { label: "7", action: "input", value: "7" },
    { label: "8", action: "input", value: "8" },
    { label: "9", action: "input", value: "9" },
    { label: "1/x", action: "reciprocal", className: "text-xs" },
    { label: "%", action: "input", value: "/100", icon: Percent },
    // Row 8
    { label: "4", action: "input", value: "4" },
    { label: "5", action: "input", value: "5" },
    { label: "6", action: "input", value: "6" },
    { label: "n!", action: "factorial", className: "text-xs" },
    { label: "±", action: "negate" },
    // Row 9
    { label: "1", action: "input", value: "1" },
    { label: "2", action: "input", value: "2" },
    { label: "3", action: "input", value: "3" },
    { label: "∛", action: "func", value: "Math.cbrt(" },
    { label: ".", action: "input", value: "." },
    // Row 10
    { label: "0", action: "input", value: "0", className: "col-span-2" },
    { label: "10ˣ", action: "func", value: "Math.pow(10,", className: "text-xs" },
    { label: "2ˣ", action: "func", value: "Math.pow(2,", className: "text-xs" },
    { label: "=", action: "calculate", className: "bg-primary text-primary-foreground hover:bg-primary/90", icon: Equal },
  ];

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  const handleCalcButton = (button: typeof calcButtons[0]) => {
    switch (button.action) {
      case "clear":
        setCalcDisplay("0");
        setCalcExpression("");
        break;
      case "clear-entry":
        setCalcDisplay("0");
        break;
      case "backspace":
        if (calcExpression.length > 0) {
          const newExpr = calcExpression.slice(0, -1);
          setCalcExpression(newExpr);
          setCalcDisplay(newExpr || "0");
        }
        break;
      case "toggle-mode":
        setIsRadians(!isRadians);
        toast.info(isRadians ? "Mode Degrés" : "Mode Radians");
        break;
      case "memory":
        switch (button.type) {
          case "mc":
            setMemory(0);
            toast.info("Mémoire effacée");
            break;
          case "mr":
            setCalcDisplay(memory.toString());
            setCalcExpression(memory.toString());
            break;
          case "m+":
            setMemory(prev => prev + parseFloat(calcDisplay || "0"));
            toast.info("Ajouté à la mémoire");
            break;
          case "m-":
            setMemory(prev => prev - parseFloat(calcDisplay || "0"));
            toast.info("Soustrait de la mémoire");
            break;
          case "ms":
            setMemory(parseFloat(calcDisplay || "0"));
            toast.info("Enregistré en mémoire");
            break;
        }
        break;
      case "negate":
        if (calcExpression && calcExpression !== "0") {
          const newExpr = calcExpression.startsWith("-") ? calcExpression.slice(1) : "-" + calcExpression;
          setCalcExpression(newExpr);
          setCalcDisplay(newExpr.replace(/Math\./g, "").replace(/\*\*/g, "^").replace(/\*/g, "×").replace(/\//g, "÷"));
        }
        break;
      case "reciprocal":
        try {
          const value = parseFloat(calcExpression || calcDisplay);
          const result = 1 / value;
          const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(10).replace(/\.?0+$/, "");
          addToHistory(`1/${calcExpression || calcDisplay}`, formattedResult);
          setCalcDisplay(formattedResult);
          setCalcExpression(formattedResult);
        } catch {
          setCalcDisplay("Erreur");
        }
        break;
      case "factorial":
        try {
          const value = parseInt(calcExpression || calcDisplay);
          const result = factorial(value);
          const formattedResult = result.toString();
          addToHistory(`${value}!`, formattedResult);
          setCalcDisplay(formattedResult);
          setCalcExpression(formattedResult);
        } catch {
          setCalcDisplay("Erreur");
        }
        break;
      case "input":
      case "func":
      case "power":
        const newExpr = calcExpression === "0" || calcExpression === "" 
          ? button.value! 
          : calcExpression + button.value!;
        setCalcExpression(newExpr);
        setCalcDisplay(newExpr.replace(/Math\./g, "").replace(/\*\*/g, "^").replace(/\*/g, "×").replace(/\//g, "÷"));
        break;
      case "calculate":
        try {
          let expr = calcExpression;
          // Convert to radians if in degree mode for trig functions
          if (!isRadians) {
            expr = expr.replace(/Math\.sin\(/g, "Math.sin(Math.PI/180*")
              .replace(/Math\.cos\(/g, "Math.cos(Math.PI/180*")
              .replace(/Math\.tan\(/g, "Math.tan(Math.PI/180*");
          }
          const result = new Function(`return ${expr}`)();
          const formattedResult = typeof result === "number" 
            ? (Number.isInteger(result) ? result.toString() : result.toFixed(10).replace(/\.?0+$/, ""))
            : "Erreur";
          addToHistory(calcDisplay, formattedResult);
          setCalcDisplay(formattedResult);
          setCalcExpression(formattedResult);
        } catch {
          setCalcDisplay("Erreur");
          setCalcExpression("");
        }
        break;
    }
  };

  // Generate QR Code
  const generateQRCode = async (text: string) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("QR Code généré!");
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers!");
  };

  // Share current page
  const shareCurrentPage = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "VaultKeep",
        text: "Découvrez VaultKeep - Votre coffre-fort digital",
        url: window.location.href
      });
    } else {
      await copyToClipboard(window.location.href);
    }
  };

  const presetColors = [
    "#00b4d8", "#00d4aa", "#ff6b6b", "#ffd93d", 
    "#6c5ce7", "#fd79a8", "#74b9ff", "#a29bfe"
  ];

  // Calculator Content Component
  const CalculatorContent = () => (
    <div className="flex flex-col h-full">
      {/* Display */}
      <div className="bg-muted rounded-xl p-3 sm:p-4 mb-2 sm:mb-4">
        <p className="text-right text-2xl sm:text-4xl font-mono font-bold text-foreground truncate">
          {calcDisplay}
        </p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">
            {isRadians ? 'RAD' : 'DEG'} | M: {memory !== 0 ? memory.toFixed(2) : '-'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="h-6 px-2 text-xs"
          >
            <History className="h-3 w-3 mr-1" />
            Historique
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-muted/50 rounded-lg mb-2 p-2 max-h-28 sm:max-h-40">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-foreground">Historique</span>
            {calcHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="h-5 px-2 text-xs text-red-500">
                <Trash2 className="h-3 w-3 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          <ScrollArea className="h-16 sm:h-24">
            {calcHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Aucun historique</p>
            ) : (
              <div className="space-y-1">
                {calcHistory.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => useHistoryEntry(entry)}
                    className="w-full text-left p-1.5 rounded hover:bg-muted text-xs"
                  >
                    <div className="text-muted-foreground truncate">{entry.expression}</div>
                    <div className="text-foreground font-medium">= {entry.result}</div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      
      {/* Buttons Grid */}
      <div className="grid grid-cols-5 gap-1 flex-1">
        {calcButtons.map((btn, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => handleCalcButton(btn)}
            className={cn(
              "h-9 sm:h-11 text-xs sm:text-sm font-semibold transition-all active:scale-95 p-0",
              btn.className
            )}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-2 p-2 sm:p-3 bg-card rounded-xl border border-border">
      {/* Voice Command */}
      <Dialog open={showVoiceDialog} onOpenChange={(open) => {
        if (!open) stopVoiceRecognition();
        setShowVoiceDialog(open);
      }}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={startVoiceRecognition}
            className={cn(
              "gap-1 sm:gap-2 text-xs sm:text-sm transition-all",
              isListening && "bg-destructive text-destructive-foreground animate-pulse"
            )}
          >
            {isListening ? <MicOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Mic className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden sm:inline">{isListening ? "Écoute..." : "Dictée"}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Mic className="w-5 h-5 text-primary" />
              Dictée vocale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <div className="min-h-[100px] max-h-[150px] overflow-y-auto p-3 sm:p-4 bg-muted rounded-xl border-2 border-dashed border-primary/20">
                {voiceText ? (
                  <p className="text-foreground text-sm">{voiceText}</p>
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    {isListening ? "Parlez maintenant..." : "Appuyez sur le bouton pour commencer"}
                  </p>
                )}
              </div>
              {isListening && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-500">REC</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant={isListening ? "destructive" : "default"}
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className="gap-2"
                size="sm"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? "Arrêter" : "Commencer"}
              </Button>
              {voiceText && (
                <Button variant="outline" size="sm" onClick={() => setVoiceText("")}>
                  Effacer
                </Button>
              )}
            </div>

            {voiceText && (
              <div className="space-y-3 pt-2 border-t">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir où ajouter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleVoiceSubmit} 
                  className="w-full rounded-xl"
                  disabled={!selectedCategory}
                >
                  Ajouter
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pomodoro Timer */}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePomodoro}
        className={cn(
          "gap-1 sm:gap-2 text-xs sm:text-sm",
          pomodoroActive && "bg-primary text-primary-foreground"
        )}
      >
        <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
        {pomodoroActive ? formatTime(pomodoroTime) : <span className="hidden sm:inline">Pomodoro</span>}
      </Button>

      {/* Scientific Calculator - Different for mobile vs desktop */}
      {isMobile ? (
        <Drawer open={calcOpen} onOpenChange={setCalcOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Calculator className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Calcul</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[90vh] p-3">
            <DrawerHeader className="p-0 pb-2">
              <DrawerTitle className="flex items-center gap-2 text-foreground">
                <Calculator className="w-5 h-5 text-primary" />
                Calculatrice scientifique
              </DrawerTitle>
            </DrawerHeader>
            <CalculatorContent />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Calculator className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Calculatrice</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Calculator className="w-5 h-5 text-primary" />
                Calculatrice scientifique
              </DialogTitle>
            </DialogHeader>
            <CalculatorContent />
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Generator */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">QR</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-md mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Générateur de QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              id="qr-input"
              placeholder="URL ou texte à encoder"
              className="rounded-xl"
            />
            <Button 
              onClick={() => {
                const input = document.getElementById("qr-input") as HTMLInputElement;
                if (input?.value) generateQRCode(input.value);
              }}
              className="w-full rounded-xl"
            >
              Générer le QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Picker */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 sm:gap-2 text-xs sm:text-sm"
            style={{ borderColor: selectedColor }}
          >
            <Palette className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: selectedColor }} />
            <span className="hidden sm:inline">Couleurs</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-md mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Palette de couleurs</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  copyToClipboard(color);
                  setShowColorPicker(false);
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-transparent hover:border-foreground transition-all hover:scale-110"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Cliquez pour copier le code couleur
          </p>
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Button variant="outline" size="sm" onClick={shareCurrentPage} className="gap-1 sm:gap-2 text-xs sm:text-sm">
        <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Partager</span>
      </Button>

      {/* Voice text display (when not in dialog) */}
      {voiceText && !showVoiceDialog && (
        <div className="w-full mt-2 p-2 bg-muted rounded-lg text-xs sm:text-sm flex items-center gap-2">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
          <span className="flex-1 truncate">"{voiceText}"</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
            onClick={() => copyToClipboard(voiceText)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}