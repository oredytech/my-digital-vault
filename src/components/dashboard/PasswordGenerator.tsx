import { useState, useCallback } from "react";
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Shuffle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PasswordGenerator() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [showPassword, setShowPassword] = useState(false);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: true,
  });

  const generatePassword = useCallback(() => {
    let chars = "";
    
    const uppercaseChars = options.excludeAmbiguous 
      ? "ABCDEFGHJKLMNPQRSTUVWXYZ" 
      : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercaseChars = options.excludeAmbiguous 
      ? "abcdefghjkmnpqrstuvwxyz" 
      : "abcdefghijklmnopqrstuvwxyz";
    const numberChars = options.excludeAmbiguous 
      ? "23456789" 
      : "0123456789";
    const symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    if (options.uppercase) chars += uppercaseChars;
    if (options.lowercase) chars += lowercaseChars;
    if (options.numbers) chars += numberChars;
    if (options.symbols) chars += symbolChars;

    if (!chars) {
      toast.error("Sélectionnez au moins une option");
      return;
    }

    let result = "";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }

    // Ensure at least one character from each selected category
    let finalPassword = result.split("");
    let position = 0;
    
    if (options.uppercase && !finalPassword.some(c => uppercaseChars.includes(c))) {
      const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % uppercaseChars.length;
      finalPassword[position++] = uppercaseChars[randomIndex];
    }
    if (options.lowercase && !finalPassword.some(c => lowercaseChars.includes(c))) {
      const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % lowercaseChars.length;
      finalPassword[position++] = lowercaseChars[randomIndex];
    }
    if (options.numbers && !finalPassword.some(c => numberChars.includes(c))) {
      const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % numberChars.length;
      finalPassword[position++] = numberChars[randomIndex];
    }
    if (options.symbols && !finalPassword.some(c => symbolChars.includes(c))) {
      const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % symbolChars.length;
      finalPassword[position++] = symbolChars[randomIndex];
    }

    // Shuffle the password
    for (let i = finalPassword.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [finalPassword[i], finalPassword[j]] = [finalPassword[j], finalPassword[i]];
    }

    setPassword(finalPassword.join(""));
  }, [length, options]);

  const copyToClipboard = async () => {
    if (!password) {
      toast.error("Générez d'abord un mot de passe");
      return;
    }
    await navigator.clipboard.writeText(password);
    toast.success("Mot de passe copié!");
  };

  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: "Aucun", color: "text-muted-foreground" };
    
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;
    
    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score, label: "Faible", color: "text-destructive", icon: ShieldAlert };
    if (score <= 5) return { score, label: "Moyen", color: "text-yellow-500", icon: Shield };
    if (score <= 7) return { score, label: "Fort", color: "text-green-500", icon: ShieldCheck };
    return { score, label: "Très fort", color: "text-primary", icon: ShieldCheck };
  };

  const strength = getPasswordStrength();
  const StrengthIcon = strength.icon || Shield;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="w-5 h-5 text-primary" />
          Générateur de mots de passe
        </CardTitle>
        <CardDescription>
          Créez des mots de passe sécurisés instantanément
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Password Display */}
        <div className="relative">
          <Input
            value={password}
            readOnly
            type={showPassword ? "text" : "password"}
            placeholder="Cliquez sur Générer"
            className="pr-20 font-mono text-base"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={copyToClipboard}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Strength Indicator */}
        {password && (
          <div className="flex items-center gap-2">
            <StrengthIcon className={cn("w-5 h-5", strength.color)} />
            <span className={cn("font-medium", strength.color)}>{strength.label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  strength.score <= 2 ? "bg-destructive" : 
                  strength.score <= 5 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${(strength.score / 8) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Length Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Longueur</Label>
            <span className="text-sm font-medium text-primary">{length}</span>
          </div>
          <Slider
            value={[length]}
            onValueChange={([value]) => setLength(value)}
            min={8}
            max={64}
            step={1}
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="uppercase" className="text-sm">Majuscules</Label>
            <Switch
              id="uppercase"
              checked={options.uppercase}
              onCheckedChange={(checked) => setOptions({ ...options, uppercase: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="lowercase" className="text-sm">Minuscules</Label>
            <Switch
              id="lowercase"
              checked={options.lowercase}
              onCheckedChange={(checked) => setOptions({ ...options, lowercase: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="numbers" className="text-sm">Chiffres</Label>
            <Switch
              id="numbers"
              checked={options.numbers}
              onCheckedChange={(checked) => setOptions({ ...options, numbers: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="symbols" className="text-sm">Symboles</Label>
            <Switch
              id="symbols"
              checked={options.symbols}
              onCheckedChange={(checked) => setOptions({ ...options, symbols: checked })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
          <Label htmlFor="excludeAmbiguous" className="text-sm">
            Exclure caractères ambigus (0, O, l, I)
          </Label>
          <Switch
            id="excludeAmbiguous"
            checked={options.excludeAmbiguous}
            onCheckedChange={(checked) => setOptions({ ...options, excludeAmbiguous: checked })}
          />
        </div>

        {/* Generate Button */}
        <Button onClick={generatePassword} className="w-full gap-2">
          <Shuffle className="w-4 h-4" />
          Générer un mot de passe
        </Button>
      </CardContent>
    </Card>
  );
}