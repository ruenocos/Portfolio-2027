// Where the site lives. Netlify sets URL (the production address) and
// CONTEXT (production, deploy-preview, branch-deploy) at build time.
export const SITE_URL = process.env.URL || "http://localhost:3000";
export const IS_PRODUCTION = process.env.CONTEXT === "production";

// Placeholder marks (mock tags, empty slots) are hidden so the site reads as
// finished. ?mocks shows them for the rest of the visit, ?mocks=off hides
// them again. Runs in the <head>, before the first paint.
export const mocksScript = `try{var q=new URLSearchParams(location.search);if(q.has("mocks"))sessionStorage.setItem("mocks",q.get("mocks")==="off"?"":"1");if(sessionStorage.getItem("mocks"))document.documentElement.setAttribute("data-mocks","")}catch(e){}`;

// Real pages, for the sitemap.
export const PAGES = ["/", "/work", "/about", "/playground"];
