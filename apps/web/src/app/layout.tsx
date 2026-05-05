import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/lib/query-client";
import { ThemeProvider } from "@/components/theme-provider";
import { fetchPublicSettings } from "@/lib/public-settings";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchPublicSettings();
  const platformName = settings.platformName;
  return {
    title: {
      default: `${platformName}: Smart Networking for Every Event`,
      template: `%s | ${platformName}`,
    },
    description: `Create unforgettable networking experiences. ${platformName} connects attendees through smart digital business cards, live directories, and intelligent matching at conferences, meetups, and corporate events.`,
    keywords: [
      "event networking",
      "digital business cards",
      "conference networking",
      "attendee directory",
      "event management",
      "QR code networking",
      "VIMS",
    ],
    authors: [{ name: platformName, url: "https://vims.events" }],
    creator: platformName,
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: "https://vims.events",
      siteName: platformName,
      title: `${platformName}: Smart Networking for Every Event`,
      description:
        "Create unforgettable networking experiences with smart digital business cards and live attendee directories.",
      images: [
        {
          url: "/images/og-banner.png",
          width: 1200,
          height: 630,
          alt: `${platformName}: Smart Networking Platform`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${platformName}: Smart Networking for Every Event`,
      description:
        "Create unforgettable networking experiences with smart digital business cards and live attendee directories.",
      images: ["/images/og-banner.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-video-preview": -1 },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider><Providers>{children}</Providers></ThemeProvider>
      </body>
    </html>
  );
}
