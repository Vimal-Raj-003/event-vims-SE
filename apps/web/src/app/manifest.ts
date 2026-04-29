import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VIMS Events",
    short_name: "VIMS",
    description:
      "Smart networking for conferences, meetups, and corporate events",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#4F46E5",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "events", "networking"],
    screenshots: [
      {
        src: "/images/screenshot-wide.png",
        sizes: "1280x720",
        type: "image/png",
      },
      {
        src: "/images/screenshot-narrow.png",
        sizes: "750x1334",
        type: "image/png",
      },
    ],
  };
}
