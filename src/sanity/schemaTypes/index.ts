import { caseStudy } from "./caseStudy";
import { media, richText } from "./media";
import { playgroundPiece, proofNumber, siteSettings, timelineEntry } from "./others";

export const schemaTypes = [siteSettings, caseStudy, playgroundPiece, timelineEntry, proofNumber, media, richText];

export const singletonTypes = new Set(["siteSettings"]);
