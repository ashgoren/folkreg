import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { getRequestTenant } from "@/lib/tenant";
import { THEME_COOKIE, dataThemeAttribute, parseTheme } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// The browser tab's title, from the tenant's event title.
export async function generateMetadata(): Promise<Metadata> {
  const { tenant } = await getRequestTenant();
  const { title } = tenant.event_config;
  return { title: title ? `${title} Registration` : "Registration" };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { tenant } = await getRequestTenant();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={dataThemeAttribute(theme)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader event={tenant.event_config} theme={theme} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
