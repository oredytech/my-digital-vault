import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { QrCode, History, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type QRType = "url" | "text" | "wifi" | "vcard" | "email" | "sms" | "phone";

const HISTORY_KEY = "vaultkeep_qr_history";

interface HistoryItem {
  label: string;
  value: string;
  date: string;
}

const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export function QRStudioSection() {
  const [type, setType] = useState<QRType>("url");

  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA", hidden: false });
  const [vcard, setVcard] = useState({ firstName: "", lastName: "", phone: "", email: "", org: "", url: "" });
  const [email, setEmail] = useState({ to: "", subject: "", body: "" });
  const [sms, setSms] = useState({ number: "", message: "" });
  const [phone, setPhone] = useState("");

  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => {
    switch (type) {
      case "url":
        return url.trim() === "https://" ? "" : url.trim();
      case "text":
        return text.trim();
      case "wifi":
        return wifi.ssid.trim()
          ? `WIFI:T:${wifi.security};S:${escapeWifi(wifi.ssid.trim())};${
              wifi.security !== "nopass" && wifi.password ? `P:${escapeWifi(wifi.password)};` : ""
            }${wifi.hidden ? "H:true;" : ""};`
          : "";
      case "vcard":
        return vcard.firstName || vcard.lastName
          ? [
              "BEGIN:VCARD",
              "VERSION:3.0",
              `N:${vcard.lastName};${vcard.firstName}`,
              `FN:${`${vcard.firstName} ${vcard.lastName}`.trim()}`,
              vcard.org ? `ORG:${vcard.org}` : "",
              vcard.phone ? `TEL:${vcard.phone}` : "",
              vcard.email ? `EMAIL:${vcard.email}` : "",
              vcard.url ? `URL:${vcard.url}` : "",
              "END:VCARD",
            ]
              .filter(Boolean)
              .join("\n")
          : "";
      case "email":
        return email.to.trim()
          ? `mailto:${email.to.trim()}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
          : "";
      case "sms":
        return sms.number.trim() ? `SMSTO:${sms.number.trim()}:${sms.message}` : "";
      case "phone":
        return phone.trim() ? `tel:${phone.trim()}` : "";
      default:
        return "";
    }
  }, [type, url, text, wifi, vcard, email, sms, phone]);

  const saveToHistory = () => {
    if (!value) {
      toast.error("Rien à enregistrer");
      return;
    }
    const label =
      type === "wifi" ? `WiFi · ${wifi.ssid}` :
      type === "vcard" ? `Contact · ${vcard.firstName} ${vcard.lastName}`.trim() :
      value.length > 42 ? `${value.slice(0, 42)}…` : value;
    const next = [{ label, value, date: new Date().toISOString() }, ...history.filter((h) => h.value !== value)].slice(0, 12);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    toast.success("QR Code enregistré dans l'historique");
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success("Historique vidé");
  };

  const loadItem = (item: HistoryItem) => {
    setType("text");
    setText(item.value);
    toast.success("Chargé dans l'éditeur");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Éditeur de QR Code</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Personnalisez et prévisualisez en temps réel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Contenu */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Contenu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={type} onValueChange={(v) => setType(v as QRType)}>
              <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="url" className="text-xs rounded-lg">Lien</TabsTrigger>
                <TabsTrigger value="text" className="text-xs rounded-lg">Texte</TabsTrigger>
                <TabsTrigger value="wifi" className="text-xs rounded-lg">WiFi</TabsTrigger>
                <TabsTrigger value="vcard" className="text-xs rounded-lg">Contact</TabsTrigger>
                <TabsTrigger value="email" className="text-xs rounded-lg">E-mail</TabsTrigger>
                <TabsTrigger value="sms" className="text-xs rounded-lg">SMS</TabsTrigger>
                <TabsTrigger value="phone" className="text-xs rounded-lg">Appel</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-1.5 mt-4">
                <Label className="text-xs">URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemple.com" className="rounded-xl" />
              </TabsContent>

              <TabsContent value="text" className="space-y-1.5 mt-4">
                <Label className="text-xs">Texte libre</Label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message..." className="rounded-xl min-h-24" />
              </TabsContent>

              <TabsContent value="wifi" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom du réseau (SSID)</Label>
                  <Input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mot de passe</Label>
                    <Input
                      value={wifi.password}
                      onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                      disabled={wifi.security === "nopass"}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sécurité</Label>
                    <Select value={wifi.security} onValueChange={(v) => setWifi({ ...wifi, security: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">Aucune</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} />
                  Réseau caché
                </label>
              </TabsContent>

              <TabsContent value="vcard" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prénom</Label>
                  <Input value={vcard.firstName} onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom</Label>
                  <Input value={vcard.lastName} onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail</Label>
                  <Input value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Organisation</Label>
                  <Input value={vcard.org} onChange={(e) => setVcard({ ...vcard, org: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Site web</Label>
                  <Input value={vcard.url} onChange={(e) => setVcard({ ...vcard, url: e.target.value })} className="rounded-xl" />
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Destinataire</Label>
                  <Input value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Objet</Label>
                  <Input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Message</Label>
                  <Textarea value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} className="rounded-xl min-h-20" />
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Numéro</Label>
                  <Input value={sms.number} onChange={(e) => setSms({ ...sms, number: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Message</Label>
                  <Textarea value={sms.message} onChange={(e) => setSms({ ...sms, message: e.target.value })} className="rounded-xl min-h-20" />
                </div>
              </TabsContent>

              <TabsContent value="phone" className="space-y-1.5 mt-4">
                <Label className="text-xs">Numéro à appeler</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243..." className="rounded-xl" />
              </TabsContent>
            </Tabs>

            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Aperçu des données</p>
              <p className="text-xs font-mono break-all text-foreground/80 whitespace-pre-wrap">
                {value || "Remplissez le formulaire pour voir l'aperçu"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview + style */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aperçu & style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {value ? (
              <>
                <QRCodeGenerator url={value} slug={type} />
                <Button variant="outline" onClick={saveToHistory} className="w-full rounded-xl">
                  <History className="w-4 h-4 mr-2" />
                  Enregistrer dans l'historique
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
                <QrCode className="w-12 h-12 opacity-30" />
                <p className="text-sm">L'aperçu apparaît dès que le contenu est saisi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {history.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Historique
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={clearHistory}>
              <Trash2 className="w-3 h-3 mr-1" /> Vider
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((item) => (
              <button
                key={item.value}
                onClick={() => loadItem(item)}
                className="w-full text-left px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(item.date).toLocaleString("fr-FR")}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
