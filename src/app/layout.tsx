import "@/styles/globals.css";

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { PostHogProvider } from "@/components/PostHogProvider";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ui/theme-provider";

export const metadata: Metadata = {
  title: "Sawaed",
  description: "Sawaed - The best way to showcase your skills",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale =
    cookieLocale === "en" || cookieLocale === "ar" ? cookieLocale : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang={locale} dir={dir} className={`${geist.variable}`}>
        <body>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <PostHogProvider>
              <ConvexClientProvider>{children}</ConvexClientProvider>
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
