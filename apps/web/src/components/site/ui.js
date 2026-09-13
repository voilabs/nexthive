import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Icon } from "@/components/site/Icon";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useI18n } from "@/i18n";

export const VERSION = "0.1.0";
export const RELEASE_URL = `https://github.com/voilabs/nexthive/releases/download/v${VERSION}/NextHive_${VERSION}_x64-setup.exe`;
export const GITHUB_URL = "https://github.com/voilabs/nexthive";
export const SITE_URL = "https://nexthive.app";

/*
 * Canonical plus hreflang pair for the current page, so each locale URL is
 * indexed on its own and search engines know they are translations.
 */
export function LocaleAlternates() {
  const { locale } = useI18n();
  const { asPath } = useRouter();
  const path = asPath === "/" ? "" : asPath.split("#")[0].split("?")[0];
  const urls = { en: `${SITE_URL}${path}`, tr: `${SITE_URL}/tr${path}` };
  return (
    <Head>
      <link rel="canonical" href={urls[locale] ?? urls.en} />
      <link rel="alternate" hrefLang="en" href={urls.en} />
      <link rel="alternate" hrefLang="tr" href={urls.tr} />
      <link rel="alternate" hrefLang="x-default" href={urls.en} />
    </Head>
  );
}

export function Brand({ onDark = false, compact = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-xl tracking-tight ${
        onDark ? "text-white" : "text-[#101410]"
      }`}
    >
      <span
        className={compact ? "block w-7 h-7" : "block w-8 h-8"}
        aria-hidden="true"
      >
        <Image
          src={onDark ? "/brand/mark-light.png" : "/brand/mark-dark.png"}
          alt=""
          width={128}
          height={128}
          priority
          className="w-full h-full object-contain"
        />
      </span>
      <span>NextHive</span>
      <span
        className="w-1.5 h-1.5 -ml-1 translate-y-[1px] rounded-full bg-[#75e9a1]"
        aria-hidden="true"
      />
    </span>
  );
}

export function Kicker({ children, dark = false }) {
  return (
    <span
      className={`font-grotesk text-[11px] font-semibold tracking-[0.18em] uppercase ${
        dark ? "text-[#75e9a1]" : "text-[#17714a]"
      }`}
    >
      {children}
    </span>
  );
}

/*
 * Primary CTA. Links to the /download page by default; pass `direct` for the
 * actual installer file (used on the download page itself).
 */
export function DownloadButton({ dark = false, direct = false, children }) {
  const { t } = useI18n();
  const className = `inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
    dark
      ? "bg-white text-[#0a0d0b] hover:bg-[#f1f1ee]"
      : "bg-[#101410] text-white hover:bg-[#1e261f]"
  }`;
  const label = children ?? (
    <>
      <Icon name="windows" size={16} strokeWidth={1.4} />
      {t.cta.downloadWindows}
    </>
  );
  if (direct) {
    return (
      <a className={className} href={RELEASE_URL}>
        {label}
      </a>
    );
  }
  return (
    <Link className={className} href="/download">
      {label}
    </Link>
  );
}

export function GhostButton({
  href,
  children,
  external = false,
  light = false,
}) {
  return (
    <a
      className={`inline-flex items-center gap-2 h-10 px-4 border text-sm font-semibold transition-all hover:-translate-y-0.5 ${
        light
          ? "border-black/10 bg-white text-[#101410] hover:border-black/20 hover:bg-[#faf9f7]"
          : "border-white/15 bg-white/5 text-[#e6ece7] hover:border-white/25 hover:bg-white/10"
      }`}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/* Decorative "+" marker sitting where the rails meet a section rule. */
export function Cross({ className }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-30 w-[15px] h-[15px] text-[#9aa29a] ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 15 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M7.5 0v15M0 7.5h15" />
      </svg>
    </span>
  );
}

/*
 * Full-bleed band: the horizontal rule runs edge-to-edge across the screen,
 * while the content sits inside the centered vertical rails.
 */
export function Band({
  id,
  children,
  className = "",
  innerClassName = "",
  rule = true,
}) {
  return (
    <section
      id={id}
      className={`relative ${rule ? "border-b border-black/10" : ""} ${className}`}
    >
      <div
        className={`relative mx-auto max-w-[1216px] border-x border-black/10 bg-[#f6f5f2] ${innerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

/* Hash targets are stable; only the visible label comes from the dictionary. */
const NAV_LINKS = [
  ["/#product", "product"],
  ["/#how-it-works", "how"],
  ["/#integrations", "integrations"],
  ["/#security", "security"],
  ["/#faq", "faq"],
];

export function SiteNav() {
  const { t } = useI18n();
  return (
    <Band>
      <header className="h-16 px-6 md:px-10 flex items-center justify-between">
        <Link href="/" aria-label={t.nav.home} className="flex items-center">
          <Brand compact />
        </Link>
        <nav
          className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#5f665f]"
          aria-label={t.nav.main}
        >
          {NAV_LINKS.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              className="hover:text-[#101410] transition-colors"
            >
              {t.nav.links[key]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <a
            className="hidden md:inline-flex items-center gap-2 h-9 px-3.5 border border-black/10 bg-white text-[#101410] text-[13px] font-semibold transition-colors hover:bg-[#faf9f7]"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="github" size={15} />
            {t.nav.github}
          </a>
          <Link
            className="inline-flex items-center gap-2 h-9 px-3.5 bg-[#101410] text-white text-[13px] font-semibold transition-transform hover:-translate-y-0.5"
            href="/download"
          >
            <Icon name="windows" size={15} strokeWidth={1.4} />
            {t.nav.download}
          </Link>
        </div>
      </header>
    </Band>
  );
}

export function SiteFooter({ directDownload = false }) {
  const { t } = useI18n();
  return (
    <footer className="relative bg-[#0a0d0b] text-[#dce2eb] overflow-hidden">
      <div className="mx-auto max-w-[1216px] px-6 md:px-10">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 items-end py-16 md:py-24 border-b border-white/10">
          <h2 className="font-display text-4xl md:text-6xl font-medium tracking-tight leading-[1.05] text-balance">
            {t.footer.headlineTop}
            <br />
            {t.footer.headlineBottom}
          </h2>
          <div className="flex flex-wrap gap-4 lg:justify-end">
            <DownloadButton dark direct={directDownload} />
            <GhostButton href={GITHUB_URL} external>
              <Icon name="github" size={15} />
              {t.footer.star}
            </GhostButton>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between gap-12 py-14">
          <div>
            <Brand onDark />
            <p className="mt-4 text-[#717c8d] text-sm max-w-[320px] leading-relaxed">
              {t.footer.blurb}
            </p>
          </div>
          <div className="flex gap-16">
            <div>
              <strong className="block text-[#f1f4f8] text-xs mb-4 font-grotesk tracking-[0.14em] uppercase">
                {t.footer.productHeading}
              </strong>
              <div className="flex flex-col gap-3 text-[13px] text-[#788393]">
                {NAV_LINKS.slice(0, 4).map(([href, key]) => (
                  <Link
                    key={href}
                    href={href}
                    className="hover:text-[#75e9a1] transition-colors"
                  >
                    {t.nav.links[key]}
                  </Link>
                ))}
                <Link
                  href="/download"
                  className="hover:text-[#75e9a1] transition-colors"
                >
                  {t.footer.download}
                </Link>
              </div>
            </div>
            <div>
              <strong className="block text-[#f1f4f8] text-xs mb-4 font-grotesk tracking-[0.14em] uppercase">
                {t.footer.projectHeading}
              </strong>
              <div className="flex flex-col gap-3 text-[13px] text-[#788393]">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#75e9a1] transition-colors"
                >
                  {t.footer.github}
                </a>
                <a
                  href={`${GITHUB_URL}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#75e9a1] transition-colors"
                >
                  {t.footer.releases}
                </a>
                <a
                  href={`${GITHUB_URL}/blob/main/CHANGELOG.md`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#75e9a1] transition-colors"
                >
                  {t.footer.changelog}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6 border-t border-white/10 text-xs text-[#5e6878]">
          <span>{t.footer.copyright}</span>
          <a
            href="https://voilabs.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#8490a2] hover:text-[#75e9a1] transition-colors"
          >
            voilabs.com
          </a>
        </div>

        <div
          aria-hidden="true"
          className="select-none pointer-events-none font-display font-medium tracking-tight leading-[0.78] text-white/[0.045] text-[26vw] lg:text-[300px] text-center -mb-[6vw] lg:-mb-16"
        >
          NextHive
        </div>
      </div>
    </footer>
  );
}
