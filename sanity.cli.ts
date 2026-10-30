import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./src/sanity/env";

export default defineCliConfig({
  api: { projectId, dataset },
  // `npm run typegen` writes the schema and every defineQuery() result as
  // types to src/sanity/types.ts. Run it after changing a schema or a query.
  typegen: {
    path: "./src/**/*.{ts,tsx}",
    schema: "./src/sanity/schema.json",
    generates: "./src/sanity/types.ts",
  },
});
