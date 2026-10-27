// Where the site lives. Netlify sets URL (the production address) and
// CONTEXT (production, deploy-preview, branch-deploy) at build time.
export const SITE_URL = process.env.URL || "http://localhost:3000";
export const IS_PRODUCTION = process.env.CONTEXT === "production";

// Real pages, for the sitemap.
export const PAGES = ["/", "/work", "/about", "/playground"];
