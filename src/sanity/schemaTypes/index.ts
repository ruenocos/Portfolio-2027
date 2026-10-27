import { about } from "./about";
import { caseStudy } from "./caseStudy";
import { home } from "./home";
import { media, richText } from "./media";
import { playgroundPiece, proofNumber, siteSettings, timelineEntry } from "./others";
import { project } from "./project";

// home, about and project are the 2027 site's. The rest are carried over from the
// old site and get reworked (or retired) with their pages; caseStudy keeps
// the old De Saak write-up until the case page takes it over.
export const schemaTypes = [home, about, project, siteSettings, caseStudy, playgroundPiece, timelineEntry, proofNumber, media, richText];

export const singletonTypes = new Set(["siteSettings", "home", "about"]);
