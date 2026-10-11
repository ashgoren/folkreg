import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { getRequestTenant } from "@/lib/tenant";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The browser tab's title, from the tenant's event title ("" until the organizer sets one).
export async function generateMetadata(): Promise<Metadata> {
  const { tenant } = await getRequestTenant();
  const { title } = tenant.event_config;
  return { title: title ? `${title} Registration` : "Registration" };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { tenant } = await getRequestTenant();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader event={tenant.event_config} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
