import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PlayerProvider } from "@/components/PlayerContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ridecast 2",
  description: "Turn anything into audio for your commute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
