/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  /*
   * Sub-path locale routing: English stays at `/`, Turkish is served from
   * `/tr`. Language detection is handled in `src/proxy.js` instead of here,
   * because the built-in matcher ignores region-tagged headers such as
   * `tr-TR`.
   */
  i18n: {
    locales: ["en", "tr"],
    defaultLocale: "en",
    localeDetection: false,
  },
};

export default nextConfig;
