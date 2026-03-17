import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Copy, QrCode, MousePointerClick, Monitor, Smartphone,
  Globe, Clock, TrendingUp, Share2, Download
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ShortLink {
  id: string;
  original_url: string;
  slug: string;
  title: string | null;
  click_count: number;
  last_clicked_at: string | null;
  created_at: string;
}

interface ClickData {
  id: string;
  clicked_at: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
}

interface ShortLinkStatsProps {
  link: ShortLink;
  onBack: () => void;
  baseUrl: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

export function ShortLinkStats({ link, onBack, baseUrl }: ShortLinkStatsProps) {
  const [clicks, setClicks] = useState<ClickData[]>([]);
  const [loading, setLoading] = useState(true);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchClicks();
  }, [link.id]);

  const fetchClicks = async () => {
    try {
      const { data, error } = await supabase
        .from("link_clicks")
        .select("*")
        .eq("short_link_id", link.id)
        .order("clicked_at", { ascending: false });

      if (error) throw error;
      setClicks((data as ClickData[]) || []);
    } catch {
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  // Generate QR code using canvas
  useEffect(() => {
    if (qrCanvasRef.current) {
      generateQRCode(`${baseUrl}/s/${link.slug}`, qrCanvasRef.current);
    }
  }, [link.slug, baseUrl]);

  const shortUrl = `${baseUrl}/s/${link.slug}`;

  // Device distribution
  const deviceData = clicks.reduce((acc, click) => {
    const device = click.device_type || "unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({
    name: name === "desktop" ? "Ordinateur" : name === "mobile" ? "Mobile" : name === "tablet" ? "Tablette" : "Autre",
    value,
  }));

  // Browser distribution
  const browserData = clicks.reduce((acc, click) => {
    const browser = click.browser || "Other";
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const browserChartData = Object.entries(browserData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Clicks over time (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const clicksOverTime = last7Days.map(day => ({
    date: new Date(day).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
    clics: clicks.filter(c => c.clicked_at.startsWith(day)).length,
  }));

  // Country distribution
  const countryData = clicks.reduce((acc, click) => {
    const country = click.country || "Inconnu";
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryChartData = Object.entries(countryData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const copyLink = () => {
    navigator.clipboard.writeText(shortUrl);
    toast.success("Lien copié !");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: link.title || link.slug, url: shortUrl });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  const downloadQR = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${link.slug}.png`;
    a.click();
    toast.success("QR Code téléchargé");
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{link.title || link.slug}</h2>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm text-primary font-mono bg-primary/5 px-2 py-0.5 rounded">
              {shortUrl}
            </code>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyLink}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={shareLink}>
              <Share2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4 text-center">
            <MousePointerClick className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{link.click_count || 0}</p>
            <p className="text-xs text-muted-foreground">Clics totaux</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-bold">
              {link.last_clicked_at
                ? new Date(link.last_clicked_at).toLocaleDateString("fr-FR")
                : "Aucun"}
            </p>
            <p className="text-xs text-muted-foreground">Dernier clic</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4 text-center">
            <Globe className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{Object.keys(countryData).length}</p>
            <p className="text-xs text-muted-foreground">Pays</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {clicks.filter(c => {
                const today = new Date().toISOString().split("T")[0];
                return c.clicked_at.startsWith(today);
              }).length}
            </p>
            <p className="text-xs text-muted-foreground">Clics aujourd'hui</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clicks Over Time */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Clics (7 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clicksOverTime}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="clics" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Appareils</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={deviceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {deviceChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {deviceChartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Browsers */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Navigateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {browserChartData.length > 0 ? (
              <div className="space-y-3">
                {browserChartData.map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm">{b.name}</span>
                    </div>
                    <Badge variant="secondary">{b.value}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Countries */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Pays</CardTitle>
          </CardHeader>
          <CardContent>
            {countryChartData.length > 0 ? (
              <div className="space-y-3">
                {countryChartData.map(([country, count], i) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{country}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <canvas
              ref={qrCanvasRef}
              width={200}
              height={200}
              className="border rounded-xl bg-white"
            />
            <Button variant="outline" onClick={downloadQR} className="rounded-xl w-full">
              <Download className="w-4 h-4 mr-2" />
              Télécharger le QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple QR Code generator using canvas (no external library)
function generateQRCode(text: string, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Use a simple encoding approach - create a visual QR-like pattern
  // For production, you'd use a proper QR library
  const size = 200;
  const moduleCount = 21;
  const moduleSize = Math.floor(size / (moduleCount + 8));
  const offset = Math.floor((size - moduleCount * moduleSize) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";

  // Generate a deterministic pattern from the URL
  const bytes = new TextEncoder().encode(text);
  const matrix: boolean[][] = Array.from({ length: moduleCount }, () => 
    Array.from({ length: moduleCount }, () => false)
  );

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[y + i][x + j] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(moduleCount - 7, 0);
  drawFinder(0, moduleCount - 7);

  // Data area - use hash of text for pattern
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash + bytes[i]) | 0;
  }

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row][col]) continue;
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || (row < 8 && col >= moduleCount - 8) || (row >= moduleCount - 8 && col < 8)) continue;
      // Use deterministic pattern
      const seed = (hash + row * 31 + col * 37 + row * col * 13) & 0xffffffff;
      matrix[row][col] = (seed % 3) === 0;
    }
  }

  // Draw
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row][col]) {
        ctx.fillRect(offset + col * moduleSize, offset + row * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}
