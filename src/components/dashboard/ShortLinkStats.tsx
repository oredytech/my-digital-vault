import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, QrCode, MousePointerClick,
  Globe, Clock, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { SocialShareButtons } from "./SocialShareButtons";

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

  const shortUrl = `${baseUrl}/s/${link.slug}`;

  const deviceData = clicks.reduce((acc, click) => {
    const device = click.device_type || "unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({
    name: name === "desktop" ? "Ordinateur" : name === "mobile" ? "Mobile" : name === "tablet" ? "Tablette" : "Autre",
    value,
  }));

  const browserData = clicks.reduce((acc, click) => {
    const browser = click.browser || "Other";
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const browserChartData = Object.entries(browserData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const clicksOverTime = last7Days.map(day => ({
    date: new Date(day).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
    clics: clicks.filter(c => c.clicked_at.startsWith(day)).length,
  }));

  const countryData = clicks.reduce((acc, click) => {
    const country = click.country || "Inconnu";
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryChartData = Object.entries(countryData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (loading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl mt-1 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">{link.title || link.slug}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <code className="text-xs sm:text-sm text-primary font-mono bg-primary/5 px-2 py-0.5 rounded break-all">
              {shortUrl}
            </code>
          </div>
          <div className="mt-2">
            <SocialShareButtons url={shortUrl} title={link.title || link.slug} compact />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-xl">
          <CardContent className="pt-3 pb-3 text-center">
            <MousePointerClick className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold">{link.click_count || 0}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Clics totaux</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-3 pb-3 text-center">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-bold">
              {link.last_clicked_at
                ? new Date(link.last_clicked_at).toLocaleDateString("fr-FR")
                : "Aucun"}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Dernier clic</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-3 pb-3 text-center">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold">{Object.keys(countryData).length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pays</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-3 pb-3 text-center">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold">
              {clicks.filter(c => {
                const today = new Date().toISOString().split("T")[0];
                return c.clicked_at.startsWith(today);
              }).length}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Clics (7 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={clicksOverTime}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="clics" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Appareils</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={deviceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                      {deviceChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {deviceChartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Navigateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {browserChartData.length > 0 ? (
              <div className="space-y-2.5">
                {browserChartData.map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs sm:text-sm">{b.name}</span>
                    </div>
                    <Badge variant="secondary">{b.value}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Pays</CardTitle>
          </CardHeader>
          <CardContent>
            {countryChartData.length > 0 ? (
              <div className="space-y-2.5">
                {countryChartData.map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm">{country}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QRCodeGenerator url={shortUrl} slug={link.slug} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
