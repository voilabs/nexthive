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

const INSTALL_STEPS = [
  {
    number: "01",
    title: "Run the installer",
    copy: `Double-click ${INSTALLER_NAME} once the download finishes. No Git, no runtimes, no extra tools to set up first.`,
  },
  {
    number: "02",
    title: "Pass SmartScreen once",
    copy: "Early-access builds are not code-signed yet, so Windows may show a SmartScreen warning. Choose “More info → Run anyway” — or build from source if you prefer.",
  },
  {
    number: "03",
    title: "Create your first profile",
    copy: "Pick the folders worth protecting, connect a Git account, and run the first backup. It succeeds only when the remote confirms.",
  },
];

const NEEDS = [
  "64-bit Windows 10 or 11",
  "An account at GitHub, GitLab, Gitea, Forgejo, or Codeberg for destinations",
  "An internet connection when pushing backups",
];

const NOT_NEEDS = [
  "No Git installation — libgit2 is built in",
  "No NextHive account — there is nothing to sign up for",
  "No subscription — open source, free",
];

export default function Download() {
  const stats = useActiveDevices();
  const activeToday = stats && stats.today > 0 ? stats.today : null;
  return (
    <div className="min-h-screen bg-[#edece8] text-[#101410] font-sans overflow-x-hidden">
      <Head>
        <title>Download NextHive — Windows</title>
        <meta
          name="description"
          content={`Download NextHive ${VERSION} for Windows: a local-first backup app that builds readable, dated Git history in private repositories you control.`}
        />
        <meta
          property="og:title"
          content="Download NextHive — Windows"
          key="title"
        />
        <meta
          property="og:description"
          content="Get the early-access Windows build. Open source, no account, no tracking."
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
        Skip to content
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
                <Kicker>Download</Kicker>
                <h1 className="mt-4 font-display text-[40px] md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.05] text-balance">
                  Get NextHive for Windows.
                </h1>
                <p className="mt-5 text-base md:text-lg text-[#5f665f] leading-relaxed max-w-lg">
                  Version {VERSION}, early access. One installer, no account, no
                  tracking — your first backup can be running in a few minutes.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <DownloadButton direct>
                    <Icon name="download" size={16} strokeWidth={1.6} />
                    Download NextHive {VERSION}
                  </DownloadButton>
                  <GhostButton href={`${GITHUB_URL}/releases`} external light>
                    All releases
                    <Icon name="external" size={14} />
                  </GhostButton>
                </div>
                <p className="mt-5 text-xs text-[#8b918b]">
                  Served from GitHub Releases — the same place the app checks
                  for updates.
                </p>
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
                      Windows installer
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-black/5 text-[13px]">
                  {[
                    ["Version", `${VERSION} · early access`],
                    ["Platform", "Windows 10 / 11, 64-bit"],
                    ["License", "Open source"],
                    ["Source", "github.com/voilabs/nexthive"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <span className="text-[#8b918b]">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                  {activeToday ? (
                    <div className="flex items-center justify-between gap-4 px-5 py-3">
                      <span className="text-[#8b918b]">
                        Active devices today
                      </span>
                      <span className="font-medium text-right flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#177245]"
                          aria-hidden="true"
                        />
                        {activeToday.toLocaleString("en-US")}
                      </span>
                    </div>
                  ) : null}
                </div>
                <a
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#101410] text-white text-[13px] font-semibold transition-colors hover:bg-[#1e261f]"
                  href={RELEASE_URL}
                >
                  <Icon name="download" size={14} strokeWidth={1.8} />
                  Direct download
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
              <Kicker>From download to first backup</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                Three steps, no surprises.
              </h2>
            </div>
            <p className="text-[15px] text-[#5f665f] leading-relaxed lg:pb-2 max-w-sm">
              The installer sets up the app and nothing else — no services you
              did not ask for, no background updaters outside the app.
            </p>
          </div>

          <div className="grid md:grid-cols-3 border border-black/10 rounded-xl overflow-hidden bg-white">
            {INSTALL_STEPS.map((step, i) => (
              <article
                key={step.number}
                className={`p-7 ${i !== 2 ? "border-b md:border-b-0 md:border-r border-black/10" : ""}`}
              >
                <span className="font-grotesk text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9aa09a]">
                  Step {step.number}
                </span>
                <h3 className="mt-3 font-display text-2xl font-medium tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm text-[#5f665f] leading-relaxed">
                  {step.copy}
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
                What you need
              </h3>
              <ul className="space-y-4">
                {NEEDS.map((p) => (
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
                What you will not need
              </h3>
              <ul className="space-y-4">
                {NOT_NEEDS.map((p) => (
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
              <Kicker>Counted, not tracked</Kicker>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight leading-[1.1] text-balance">
                One anonymous ping a day. That is the whole story.
              </h2>
              <p className="mt-4 text-[15px] text-[#5f665f] leading-relaxed max-w-md">
                While NextHive is running, it reports once per day that{" "}
                <em className="font-display">a</em> device is alive — an app
                version and an OS name, nothing else. No identifier, no hardware
                info, no file names. The server keeps only day totals, and the
                count you see on this page is the same number we see.
              </p>
              <ul className="mt-7 space-y-3 text-[14px] text-[#40463f]">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-[#17714a]/20 bg-[#e2f5e8] flex items-center justify-center text-[#177245]">
                    <Icon name="check" size={11} strokeWidth={2.4} />
                  </span>
                  Turn it off any time: Settings → Privacy → Anonymous usage
                  ping
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-[#17714a]/20 bg-[#e2f5e8] flex items-center justify-center text-[#177245]">
                    <Icon name="check" size={11} strokeWidth={2.4} />
                  </span>
                  Both ends are open source — the ping and the counter are in
                  the repository
                </li>
              </ul>
            </div>
            <div className="px-6 md:px-10 py-16 md:py-24 bg-[#efeeea] flex items-center">
              <div className="w-full max-w-md mx-auto rounded-xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="px-4 py-3 border-b border-black/8 text-xs font-semibold text-[#6b716b] font-mono">
                  POST nexthive.app/api/ping
                </div>
                <pre className="px-4 py-4 font-mono text-[12px] leading-6 text-[#40463f] overflow-x-auto">
                  {`{\n  "v":  "${VERSION}",\n  "os": "windows"\n}`}
                </pre>
                <div className="divide-y divide-black/5 border-t border-black/8 text-[13px]">
                  {[
                    ["Identifiers sent", "none"],
                    ["IP address stored", "no"],
                    ["Stored server-side", "+1 to today's total"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <span className="text-[#8b918b]">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  {activeToday ? (
                    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#eef6ef]">
                      <span className="text-[#2c4436] font-medium">
                        Devices counted today
                      </span>
                      <span className="font-grotesk font-semibold text-[#177245]">
                        {activeToday.toLocaleString("en-US")}
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
              <Kicker>Other platforms</Kicker>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight leading-[1.1] text-balance">
                Windows first. The rest, honestly later.
              </h2>
              <p className="mt-4 text-[15px] text-[#5f665f] leading-relaxed max-w-md">
                macOS and Linux builds are not available yet. Watch the
                repository or the releases page — when they land, they will
                appear there first.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                [
                  <FaApple key="apple" size={18} />,
                  "macOS",
                  "Not available yet",
                ],
                [
                  <FaLinux key="linux" size={18} />,
                  "Linux",
                  "Not available yet",
                ],
              ].map(([iconNode, name, note]) => (
                <div
                  key={name}
                  className="flex items-center gap-3 p-4 rounded-lg border border-black/8 border-dashed bg-white/60"
                >
                  <span className="w-9 h-9 shrink-0 rounded-md bg-[#e9e8e4] text-[#6b716b] flex items-center justify-center">
                    {iconNode}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-[#6b716b]">
                      {name}
                    </span>
                    <span className="block text-xs text-[#9aa09a]">{note}</span>
                  </div>
                </div>
              ))}
              <a
                className="sm:col-span-2 flex items-center justify-between gap-3 p-4 rounded-lg border border-black/10 bg-white text-sm font-semibold transition-colors hover:border-black/20"
                href={`${GITHUB_URL}/releases`}
                target="_blank"
                rel="noreferrer"
              >
                Follow releases on GitHub
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
