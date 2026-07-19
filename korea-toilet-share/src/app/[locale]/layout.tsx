import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import AuthProvider from "@/components/providers/AuthProvider";
import AppGate from "@/components/common/AppGate";
import Header from "@/components/common/Header";
import TabBar from "@/components/common/TabBar";
import ServerBattery from "@/components/common/ServerBattery";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB",
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "app" });
  return {
    title: "Korea Toilet Sharing Service | 코리아 토일럿 쉐어링",
    description: t("description"),
    manifest: "/manifest.webmanifest",
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as never)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <AppGate>
              <Header />
              <main className="min-h-dvh pb-16 pt-14">{children}</main>
              <TabBar />
              <ServerBattery />
            </AppGate>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
