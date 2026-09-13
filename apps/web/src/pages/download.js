import Head from "next/head";
import { useEffect, useState } from "react";
import { FaApple, FaLinux } from "react-icons/fa6";
import { Icon } from "@/components/site/Icon";
import {
  Band,
  Cross,
  DownloadButton,
  GhostButton,
  GITHUB_URL,
  Kicker,
  RELEASE_URL,
  SiteFooter,
  SiteNav,
  VERSION,
} from "@/components/site/ui";
import { fmt, useI18n } from "@/i18n";

const INSTALLER_NAME = `NextHive_${VERSION}_x64-setup.exe`;

/*
 * Public aggregate from /api/stats — the same numbers the anonymous daily
 * ping produces. Null until loaded; stays null (and the UI stays quiet) if
 * the endpoint is unreachable.
 */
function useActiveDevices() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}

const PLATFORM_ICONS = [
  <FaApple key="apple" size={18} />,
  <FaLinux key="linux" size={18} />,
];

export default function Download() {
  const { t } = useI18n();
  const page = t.download;
  const stats = useActiveDevices();
  const activeToday = stats && stats.today > 0 ? stats.today : null;
  const activeTodayLabel = activeToday
    ? activeToday.toLocaleString(t.numberLocale)
    : null;
  return (
    <div className="min-h-screen bg-[#edece8] text-[#101410] font-sans overflow-x-hidden">
      <Head>
        <title>{page.meta.title}</title>
        <meta
          name="description"
          content={fmt(page.meta.description, { version: VERSION })}
        />
        <meta property="og:title" content={page.meta.ogTitle} key="title" />
        <meta
          property="og:description"
          content={page.meta.ogDescription}
          key="description"
        />
        <meta name="theme-color" content="#f6f5f2" />
        <link rel="icon" type="image/png" href="/brand/app-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/brand/app-icon.png" />
      </Head>

      <a
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 focus:p-3 focus:bg-[#75e9a1] focus:text-[#07110b]"
        href="#main-content"
      >
        {t.nav.skip}
      </a>

      <SiteNav />

      <main id="main-content">
        {/* DOWNLOAD HERO */}
        <Band>
          <div className="relative px-6 md:px-10 py-20 md:py-28 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(23, 113, 74, 0.06), transparent)",
              }}
            />
            <div className="relative z-10 grid lg:grid-cols-[1.2fr_0.8fr] gap-x-16 gap-y-12 items-center">
              <div>
                <Kicker>{page.hero.kicker}</Kicker>
                <h1 className="mt-4 font-display text-[40px] md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.05] text-balance">
                  {page.hero.title}
                </h1>
                <p className="mt-5 text-base md:text-lg text-[#5f665f] leading-relaxed max-w-lg">
                  {fmt(page.hero.copy, { version: VERSION })}
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <DownloadButton direct>
                    <Icon name="download" size={16} strokeWidth={1.6} />
                    {fmt(page.hero.button, { version: VERSION })}
                  </DownloadButton>
                  <GhostButton href={`${GITHUB_URL}/releases`} external light>
                    {page.hero.allReleases}
                    <Icon name="external" size={14} />
                  </GhostButton>
                </div>
                <p className="mt-5 text-xs text-[#8b918b]">{page.hero.note}</p>
              </div>

              <div className="lg:justify-self-end w-full max-w-sm rounded-xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-black/8">
                  <span className="w-9 h-9 shrink-0 rounded-md bg-[#101410] text-white flex items-center justify-center">
                    <Icon name="windows" size={17} strokeWidth={1.4} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold truncate">
                      {INSTALLER_NAME}
                    </span>
                    <span className="block text-xs text-[#8b918b]">
                      {page.card.installerLabel}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-black/5 text-[13px]">
                  {[
                    [
                      page.card.version,
                      fmt(page.card.versionValue, { version: VERSION }),
                    ],
                    [page.card.platform, page.card.platformValue],
                    [page.card.license, page.card.licenseValue],
                    [page.card.source, "github.com/voilabs/nexthive"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <span className="text-[#8b918b]">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                  {activeTodayLabel ? (
                    <div className="flex items-center justify-between gap-4 px-5 py-3">
                      <span className="text-[#8b918b]">
                        {page.card.activeToday}
                      </span>
                      <span className="font-medium text-right flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#177245]"
                          aria-hidden="true"
                        />
                        {activeTodayLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
                <a
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#101410] text-white text-[13px] font-semibold transition-colors hover:bg-[#1e261f]"
                  href={RELEASE_URL}
                >
                  <Icon name="download" size={14} strokeWidth={1.8} />
                  {page.card.direct}
                </a>
              </div>
            </div>
          </div>
        </Band>

        {/* INSTALL STEPS */}
        <Band innerClassName="px-6 md:px-10 py-20 md:py-28">
          <Cross className="-top-[8px] -left-[8px]" />
          <Cross className="-top-[8px] -right-[8px]" />
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end mb-14">
            <div className="max-w-3xl">
              <Kicker>{page.steps.kicker}</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                {page.steps.title}
              </h2>
            </div>
            <p className="text-[15px] text-[#5f665f] leading-relaxed lg:pb-2 max-w-sm">
              {page.steps.copy}
            </p>
          </div>

          <div className="grid md:grid-cols-3 border border-black/10 rounded-xl overflow-hidden bg-white">
            {page.steps.items.map((step, i) => (
              <article
                key={step.number}
                className={`p-7 ${i !== 2 ? "border-b md:border-b-0 md:border-r border-black/10" : ""}`}
              >
                <span className="font-grotesk text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9aa09a]">
                  {page.steps.label} {step.number}
                </span>
                <h3 className="mt-3 font-display text-2xl font-medium tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm text-[#5f665f] leading-relaxed">
                  {fmt(step.copy, { installer: INSTALLER_NAME })}
                </p>
              </article>
            ))}
          </div>
        </Band>

        {/* REQUIREMENTS */}
        <Band>
          <div className="grid lg:grid-cols-2">
            <div className="px-6 md:px-10 py-16 md:py-20 lg:border-r border-black/10">
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-6">
                {page.needsHeading}
              </h3>
              <ul className="space-y-4">
                {page.needs.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-[15px] text-[#40463f]"
                  >
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-[#17714a]/20 bg-[#e2f5e8] flex items-center justify-center text-[#177245]">
                      <Icon name="check" size={11} strokeWidth={2.4} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 md:px-10 py-16 md:py-20 bg-[#efeeea]">
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-6">
                {page.notNeedsHeading}
              </h3>
              <ul className="space-y-4">
                {page.notNeeds.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-[15px] text-[#40463f]"
                  >
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-black/10 bg-white flex items-center justify-center text-[#6b716b]">
                      <Icon name="minus" size={11} strokeWidth={2.4} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>

        {/* TELEMETRY TRANSPARENCY */}
        <Band>
          <div className="grid lg:grid-cols-2">
            <div className="px-6 md:px-10 py-16 md:py-24 lg:border-r border-black/10">
              <Kicker>{page.telemetry.kicker}</Kicker>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight leading-[1.1] text-balance">
                {page.telemetry.title}
              </h2>
              <p className="mt-4 text-[15px] text-[#5f665f] leading-relaxed max-w-md">
                {page.telemetry.copyBefore}
                <em className="font-display">{page.telemetry.copyEm}</em>
                {page.telemetry.copyAfter}
              </p>
              <ul className="mt-7 space-y-3 text-[14px] text-[#40463f]">
                {page.telemetry.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-[#17714a]/20 bg-[#e2f5e8] flex items-center justify-center text-[#177245]">
                      <Icon name="check" size={11} strokeWidth={2.4} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 md:px-10 py-16 md:py-24 bg-[#efeeea] flex items-center">
              <div className="w-full max-w-md mx-auto rounded-xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="px-4 py-3 border-b border-black/8 text-xs font-semibold text-[#6b716b] font-mono">
                  {page.telemetry.endpoint}
                </div>
                <pre className="px-4 py-4 font-mono text-[12px] leading-6 text-[#40463f] overflow-x-auto">
                  {`{\n  "v":  "${VERSION}",\n  "os": "windows"\n}`}
                </pre>
                <div className="divide-y divide-black/5 border-t border-black/8 text-[13px]">
                  {page.telemetry.rows.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <span className="text-[#8b918b]">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  {activeTodayLabel ? (
                    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#eef6ef]">
                      <span className="text-[#2c4436] font-medium">
                        {page.telemetry.countedToday}
                      </span>
                      <span className="font-grotesk font-semibold text-[#177245]">
                        {activeTodayLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Band>

        {/* OTHER PLATFORMS */}
        <Band rule={false} innerClassName="px-6 md:px-10 py-16 md:py-20">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <div>
              <Kicker>{page.platforms.kicker}</Kicker>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight leading-[1.1] text-balance">
                {page.platforms.title}
              </h2>
              <p className="mt-4 text-[15px] text-[#5f665f] leading-relaxed max-w-md">
                {page.platforms.copy}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {["macOS", "Linux"].map((name, i) => (
                <div
                  key={name}
                  className="flex items-center gap-3 p-4 rounded-lg border border-black/8 border-dashed bg-white/60"
                >
                  <span className="w-9 h-9 shrink-0 rounded-md bg-[#e9e8e4] text-[#6b716b] flex items-center justify-center">
                    {PLATFORM_ICONS[i]}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-[#6b716b]">
                      {name}
                    </span>
                    <span className="block text-xs text-[#9aa09a]">
                      {page.platforms.notAvailable}
                    </span>
                  </div>
                </div>
              ))}
              <a
                className="sm:col-span-2 flex items-center justify-between gap-3 p-4 rounded-lg border border-black/10 bg-white text-sm font-semibold transition-colors hover:border-black/20"
                href={`${GITHUB_URL}/releases`}
                target="_blank"
                rel="noreferrer"
              >
                {page.platforms.follow}
                <Icon name="external" size={15} className="text-[#8b918b]" />
              </a>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter directDownload />
    </div>
  );
}
