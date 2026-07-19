import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // firebase-admin을 웹팩 번들에 포함하면 Netlify 함수에서 로드 크래시(500) 발생 → 외부화
    serverComponentsExternalPackages: ["firebase-admin", "google-auth-library"],
  },
};

export default withNextIntl(nextConfig);
