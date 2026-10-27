import type { MetadataRoute } from "next";
import tokens from "../../design/tokens.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wessel Oud",
    short_name: "Wessel",
    start_url: "/",
    display: "browser",
    background_color: tokens.color.light.canvas.$value,
    theme_color: tokens.color.light.canvas.$value,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
