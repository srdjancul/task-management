import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Hanken Grotesk — the free, Google-Fonts successor of HK Grotesk
// (the finance design's typeface).
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Task Management",
    template: "%s · Task Management",
  },
  description: "Personal outreach CRM and daily planner.",
  // Private tool — keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // --black-900; meta tags need a literal value.
  themeColor: "#0c0d0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hanken.variable} h-full`}>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla)
          inject attributes into <body> and trip dev hydration warnings. */}
      <body className="min-h-full" suppressHydrationWarning>
        <div aria-hidden className="app-beams" />
        {children}
      </body>
    </html>
  );
}
