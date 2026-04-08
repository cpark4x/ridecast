import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PlayerProvider } from "@/components/PlayerContext";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ridecast 2",
  description: "Turn anything into audio for your commute",
  manifest: "/manifest.json",
  themeColor: "#EA580C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-sans">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
