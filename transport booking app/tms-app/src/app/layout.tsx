import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KNS TMS — Transport Management System",
  description: "Hazardous chemical logistics, EV fleet management & reverse logistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex h-screen overflow-hidden bg-gray-50">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
