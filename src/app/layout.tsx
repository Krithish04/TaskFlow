import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TaskFlow - Intelligent Project Management",
    template: "%s | TaskFlow",
  },
  description:
    "TaskFlow is a role-based collaborative project management platform featuring interactive Kanban boards, team chat, GridFS file sharing, and Google Gemini AI.",
  keywords: [
    "project management",
    "kanban board",
    "task manager",
    "gemini ai",
    "team collaboration",
    "workflow automation",
    "mongodb",
    "next.js",
  ],
  authors: [{ name: "TaskFlow Team" }],
  creator: "TaskFlow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "TaskFlow - Intelligent Project Management",
    description:
      "Role-based project management with Kanban boards, team chat, and AI-powered task breakdowns.",
    siteName: "TaskFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskFlow - Intelligent Project Management",
    description:
      "Role-based project management with Kanban boards, team chat, and AI-powered task breakdowns.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
