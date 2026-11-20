// This configuration is served to the browser. Only a publishable key belongs here.
export function sharedPlansConfig(env = process.env) {
  const url = env.ROAM_SUPABASE_URL?.trim() || "";
  const publishableKey = env.ROAM_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  if (!url && !publishableKey) return {};

  const endpoint = URL.canParse(url) ? new URL(url) : null;
  const local = endpoint && ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (
    !endpoint ||
    (endpoint.protocol !== "https:" && !(local && endpoint.protocol === "http:")) ||
    endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
    endpoint.pathname !== "/" ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)
  ) {
    throw new Error("Set ROAM_SUPABASE_URL to the project URL and ROAM_SUPABASE_PUBLISHABLE_KEY to its sb_publishable_ key.");
  }
  return { url: endpoint.origin, publishableKey };
}

export const supabaseBundle = new URL(
  "../node_modules/@supabase/supabase-js/dist/umd/supabase.js",
  import.meta.url,
);
