// Where the site lives. Vercel sets VERCEL_ENV (production, preview,
// development) and VERCEL_PROJECT_PRODUCTION_URL (the production domain,
// the custom one once it's added, no protocol) at build time. Previews keep
// the production URL as their base so shared links and OG images point home.
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = host ? `https://${host}` : "http://localhost:3000";
export const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

// Placeholder marks (mock tags, empty slots) are hidden so the site reads as
// finished. ?mocks shows them for the rest of the visit, ?mocks=off hides
// them again. Runs in the <head>, before the first paint.
export const mocksScript = `try{var q=new URLSearchParams(location.search);if(q.has("mocks"))sessionStorage.setItem("mocks",q.get("mocks")==="off"?"":"1");if(sessionStorage.getItem("mocks"))document.documentElement.setAttribute("data-mocks","")}catch(e){}`;

// Real pages, for the sitemap.
export const PAGES = ["/", "/work", "/about", "/playground"];
