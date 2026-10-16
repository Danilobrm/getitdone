import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "getitdone",
  description: "Tarefas diárias",
  applicationName: "getitdone",
  icons: {
    icon: [{ url: "/icons/192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-180", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "getitdone", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
        <BottomNav />
        <RegisterSW />
      </body>
    </html>
  );
}
