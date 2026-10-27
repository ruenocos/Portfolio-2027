// The site's links, in one place: the header, the phone menu and the footer
// all read from here.
export const NAV = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/playground", label: "Playground" },
] as const;

export const EMAIL = "wessel.oud@outlook.com";
export const LINKEDIN = "https://www.linkedin.com/in/wesseloud/";

// Pages without the footer (the Playground board fills the screen). Their
// "Contact ↓" goes to the home footer instead.
export const FOOTERLESS: readonly string[] = ["/playground"];
export const contactHref = (path: string) => (FOOTERLESS.includes(path) ? "/#contact" : "#contact");
