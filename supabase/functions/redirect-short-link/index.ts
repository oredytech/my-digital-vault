import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiter (per isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Cleanup stale entries periodically
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

function getDeviceType(userAgent: string): string {
  if (/mobile|android|iphone|ipad|tablet/i.test(userAgent)) return "mobile";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  return "desktop";
}

function getBrowser(userAgent: string): string {
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/edg/i.test(userAgent)) return "Edge";
  if (/chrome/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  if (/opera|opr/i.test(userAgent)) return "Opera";
  return "Other";
}

function getOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/mac/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad/i.test(userAgent)) return "iOS";
  return "Other";
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "vaultkeep-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cleanup every request (cheap for small maps)
  cleanupRateLimits();

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limit check
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const { slug, password } = await req.json();

    if (!slug || typeof slug !== "string" || slug.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: link, error } = await supabase
      .from("short_links")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !link) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await supabase.from("short_links").update({ is_active: false }).eq("id", link.id);
      return new Response(JSON.stringify({ error: "Link expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.is_password_protected && link.password_hash) {
      if (!password) {
        return new Response(JSON.stringify({ error: "Password required", password_required: true }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest("SHA-256", data);
      const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (hashHex !== link.password_hash) {
        return new Response(JSON.stringify({ error: "Wrong password", password_required: true }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userAgent = req.headers.get("user-agent") || "";
    const referrer = req.headers.get("referer") || null;
    const ipHash = await hashIP(ip);
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-country") || null;
    const city = req.headers.get("x-city") || null;

    await supabase.from("link_clicks").insert({
      short_link_id: link.id,
      device_type: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
      referrer,
      ip_hash: ipHash,
      country,
      city,
    });

    await supabase.from("short_links").update({
      click_count: (link.click_count || 0) + 1,
      last_clicked_at: new Date().toISOString(),
    }).eq("id", link.id);

    return new Response(JSON.stringify({ url: link.original_url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
