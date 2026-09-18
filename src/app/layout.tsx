import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
  // --grey-900; meta tags need a literal value.
  themeColor: "#181a20",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla)
          inject attributes into <body> and trip dev hydration warnings. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
