import { useState, useRef } from "react";
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
  Equal
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickActionsWidgetProps {
  onQuickAdd?: (type: string, data: any) => void;
}

export function QuickActionsWidget({ onQuickAdd }: QuickActionsWidgetProps) {
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
  const recognitionRef = useRef<any>(null);

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
      setPomodoroActive(false);
      setPomodoroTime(25 * 60);
      toast.info("Pomodoro arrêté");
    } else {
      setPomodoroActive(true);
      toast.success("Pomodoro démarré - 25 minutes");
      
      const interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
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

  // Scientific Calculator
  const calcButtons = [
    { label: "C", action: "clear", className: "bg-destructive/20 text-destructive hover:bg-destructive/30" },
    { label: "(", action: "input", value: "(" },
    { label: ")", action: "input", value: ")" },
    { label: "%", action: "input", value: "/100", icon: Percent },
    { label: "7", action: "input", value: "7" },
    { label: "8", action: "input", value: "8" },
    { label: "9", action: "input", value: "9" },
    { label: "÷", action: "input", value: "/", icon: Divide },
    { label: "4", action: "input", value: "4" },
    { label: "5", action: "input", value: "5" },
    { label: "6", action: "input", value: "6" },
    { label: "×", action: "input", value: "*" },
    { label: "1", action: "input", value: "1" },
    { label: "2", action: "input", value: "2" },
    { label: "3", action: "input", value: "3" },
    { label: "-", action: "input", value: "-", icon: Minus },
    { label: "0", action: "input", value: "0" },
    { label: ".", action: "input", value: "." },
    { label: "⌫", action: "backspace", icon: Delete },
    { label: "+", action: "input", value: "+", icon: Plus },
    { label: "sin", action: "func", value: "Math.sin(" },
    { label: "cos", action: "func", value: "Math.cos(" },
    { label: "tan", action: "func", value: "Math.tan(" },
    { label: "=", action: "calculate", className: "bg-primary text-primary-foreground hover:bg-primary/90", icon: Equal },
    { label: "√", action: "func", value: "Math.sqrt(" },
    { label: "x²", action: "power", value: "**2" },
    { label: "xʸ", action: "input", value: "**" },
    { label: "π", action: "input", value: "Math.PI" },
  ];

  const handleCalcButton = (button: typeof calcButtons[0]) => {
    switch (button.action) {
      case "clear":
        setCalcDisplay("0");
        setCalcExpression("");
        break;
      case "backspace":
        if (calcExpression.length > 0) {
          const newExpr = calcExpression.slice(0, -1);
          setCalcExpression(newExpr);
          setCalcDisplay(newExpr || "0");
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
          const result = new Function(`return ${calcExpression}`)();
          const formattedResult = typeof result === "number" 
            ? (Number.isInteger(result) ? result.toString() : result.toFixed(8).replace(/\.?0+$/, ""))
            : "Erreur";
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

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-card rounded-xl border border-border">
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
              "gap-2 transition-all",
              isListening && "bg-destructive text-destructive-foreground animate-pulse"
            )}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? "Écoute..." : "Dictée vocale"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              Dictée vocale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <div className="min-h-[120px] max-h-[200px] overflow-y-auto p-4 bg-muted rounded-xl border-2 border-dashed border-primary/20">
                {voiceText ? (
                  <p className="text-foreground">{voiceText}</p>
                ) : (
                  <p className="text-muted-foreground italic">
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
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? "Arrêter" : "Commencer"}
              </Button>
              {voiceText && (
                <Button variant="outline" onClick={() => setVoiceText("")}>
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
          "gap-2",
          pomodoroActive && "bg-primary text-primary-foreground"
        )}
      >
        <Timer className="w-4 h-4" />
        {pomodoroActive ? formatTime(pomodoroTime) : "Pomodoro"}
      </Button>

      {/* Scientific Calculator */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="w-4 h-4" />
            Calculatrice
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md w-[95vw] h-[85vh] sm:h-auto sm:max-h-[90vh] p-0 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Calculatrice
            </DialogTitle>
          </div>
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            {/* Display */}
            <div className="bg-muted rounded-xl p-4 mb-4">
              <p className="text-right text-3xl sm:text-4xl font-mono font-bold text-foreground truncate">
                {calcDisplay}
              </p>
            </div>
            
            {/* Buttons Grid */}
            <div className="grid grid-cols-4 gap-2 flex-1">
              {calcButtons.map((btn, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  onClick={() => handleCalcButton(btn)}
                  className={cn(
                    "h-12 sm:h-14 text-lg sm:text-xl font-semibold transition-all active:scale-95",
                    btn.className
                  )}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Generator */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="w-4 h-4" />
            QR Code
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Générateur de QR Code</DialogTitle>
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
            className="gap-2"
            style={{ borderColor: selectedColor }}
          >
            <Palette className="w-4 h-4" style={{ color: selectedColor }} />
            Couleurs
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Palette de couleurs</DialogTitle>
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
                className="w-12 h-12 rounded-lg border-2 border-transparent hover:border-foreground transition-all hover:scale-110"
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
      <Button variant="outline" size="sm" onClick={shareCurrentPage} className="gap-2">
        <Share2 className="w-4 h-4" />
        Partager
      </Button>

      {/* Voice text display (when not in dialog) */}
      {voiceText && !showVoiceDialog && (
        <div className="w-full mt-2 p-2 bg-muted rounded-lg text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="flex-1 truncate">"{voiceText}"</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => copyToClipboard(voiceText)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}