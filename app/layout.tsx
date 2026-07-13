import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScienceBackground from "@/components/ScienceBackground";

export const metadata: Metadata = {
  title: "Synapse — Research, Reimagined as Video",
  description:
    "Turn scientific papers into short-form animated videos with clear AI voiceovers for TikTok, Reels, Shorts, LinkedIn, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Michroma&family=Sora:wght@400;500;600;700&family=Syncopate:wght@400;700&family=Unbounded:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ScienceBackground />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
