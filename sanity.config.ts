"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schemaTypes, singletonTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { resolve } from "./src/sanity/presentation";

export default defineConfig({
  name: "wessel-oud",
  title: "Wessel Oud",
  basePath: "/studio",
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // Singletons can't be created or deleted from the "new document" menu.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  plugins: [
    structureTool({ structure }),
    // Click-to-edit on the real pages.
    presentationTool({
      resolve,
      previewUrl: { previewMode: { enable: "/api/draft-mode/enable" } },
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
