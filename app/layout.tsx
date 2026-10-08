import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMCUTZ — Barber Studio Terminal Dashboard",
  description: "Live-Dashboard für Barber Giovanni — Termine, Kunden & Kalender in Echtzeit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-[#070708] text-white antialiased selection:bg-[#c99756]/30">
        {children}
      </body>
    </html>
  );
}
