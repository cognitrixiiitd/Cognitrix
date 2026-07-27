const getEnv = (keys) => {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return "";
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabaseUrl = getEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const supabaseAnonKey = getEnv([
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ]);

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      ok: false,
      error:
        "Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY (or the VITE_ equivalents) in Vercel.",
    });
  }

  const endpoint = new URL("/rest/v1/courses", supabaseUrl);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Cache-Control": "no-store",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return res.status(response.status).json({
      ok: false,
      error: "Supabase ping failed",
      status: response.status,
      body,
    });
  }

  const rows = await response.json().catch(() => []);
  return res.status(200).json({
    ok: true,
    pingedAt: new Date().toISOString(),
    rows: Array.isArray(rows) ? rows.length : 0,
  });
}
