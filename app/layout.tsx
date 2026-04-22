import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZLT Marketing CRM",
  description: "CRM de marketing de ZLT — contactos unificados y touchpoints.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
