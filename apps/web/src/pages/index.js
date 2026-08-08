import Head from "next/head";
import Image from "next/image";
import {
  FaGithub,
  FaGitlab,
  FaGoogleDrive,
  FaServer,
  FaYandex,
} from "react-icons/fa6";
import { SiCodeberg, SiGitea, SiMega } from "react-icons/si";
import { Icon } from "@/components/site/Icon";
import {
  Band,
  Cross,
  DownloadButton,
  GhostButton,
  GITHUB_URL,
  Kicker,
  SiteFooter,
  SiteNav,
  VERSION,
} from "@/components/site/ui";

function SectionHead({ kicker, title, copy, center = false }) {
  return (
    <div className={center ? "max-w-3xl mx-auto text-center" : "max-w-3xl"}>
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
        {title}
      </h2>
      {copy ? (
        <p
          className={`mt-5 text-base md:text-lg text-[#5f665f] leading-relaxed ${center ? "mx-auto" : ""} max-w-2xl`}
        >
          {copy}
        </p>
      ) : null}
    </div>
  );
}

const HERO_TABS = [
  "Dashboard",
  "Backup history",
  "Problem files",
  "Schedule",
  "Destinations",
];

const HERO_ROWS = [
  ["Documents", "Personal", "12,402", "37 changed", "SHA-256 verified", "done"],
  [
    "Projects / clients",
    "Work",
    "8,114",
    "112 changed",
    "SHA-256 verified",
    "done",
  ],
  [
    "Design / brand",
    "Work",
    "2,930",
    "6 changed",
    "hashing changed files",
    "running",
  ],
  [
    "Finance / 2026",
    "Personal",
    "1,204",
    "2 changed",
    "SHA-256 verified",
    "done",
  ],
  [
    "Photos / family",
    "Personal",
    "24,551",
    "418 changed",
    "waiting for turn",
    "queued",
  ],
  ["Research / notes", "Personal", "3,388", "no changes", "up to date", "done"],
];

function StatusChip({ state }) {
  if (state === "running") {
    return (
      <span className="font-display italic text-[13px] text-[#17714a]">
        Backing up…
      </span>
    );
  }
  if (state === "queued") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded bg-black/5 text-[#6b716b] text-[11px] font-semibold">
        Queued
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e2f5e8] text-[#177245] text-[11px] font-semibold">
      <Icon name="check" size={11} strokeWidth={2.2} /> Backed up
    </span>
  );
}

function HeroMock() {
  return (
    <div className="w-full rounded-t-xl border border-b-0 border-black/10 overflow-hidden shadow-[0_-12px_48px_rgba(16,20,16,0.05)]">
      <div className="flex overflow-x-auto bg-[#eceae5]">
        {HERO_TABS.map((tab, i) => (
          <span
            key={tab}
            className={`flex-1 whitespace-nowrap px-5 py-3 text-xs font-semibold border-r border-black/8 last:border-r-0 flex items-center justify-center gap-2 ${
              i === 0 ? "bg-white text-[#101410]" : "text-[#8b918b]"
            }`}
          >
            {i === 0 ? (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#177245]"
                aria-hidden="true"
              />
            ) : null}
            {tab}
          </span>
        ))}
      </div>

      <div className="bg-white text-[#101410]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e0]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e0]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e0]" />
            </div>
            <span className="text-xs font-semibold text-[#40463f]">
              NextHive — 6 profiles · 08 Aug 2026, 09:04
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#101410] text-white text-[11px] font-semibold">
            <Icon name="commit" size={12} /> Run all
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/8">
                {[
                  "Folder",
                  "Profile",
                  "Files",
                  "Last run",
                  "Verification",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 font-grotesk text-[10px] font-semibold tracking-[0.14em] uppercase text-[#9aa09a]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HERO_ROWS.map(
                ([folder, profile, files, changes, verify, state]) => (
                  <tr
                    key={folder}
                    className="border-b border-black/5 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-semibold flex items-center gap-2.5">
                      <span className="text-[#8d948d]">
                        <Icon name="folder" size={15} />
                      </span>
                      {folder}
                    </td>
                    <td className="px-4 py-3 text-[#6b716b]">{profile}</td>
                    <td className="px-4 py-3 text-[#6b716b] font-mono text-xs">
                      {files}
                    </td>
                    <td className="px-4 py-3 text-[#6b716b]">{changes}</td>
                    <td className="px-4 py-3 text-[#6b716b]">{verify}</td>
                    <td className="px-4 py-3">
                      <StatusChip state={state} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const PROBLEMS = [
  "Copy-paste versions multiply until none of them is the truth",
  "One-off archives cannot show what changed, or when",
  "Cloud sync overwrites history instead of keeping it",
  "You find out a backup failed only when you need it",
];

const MESSY_FILES = [
  ["report-final.docx", "12 Mar 2026"],
  ["report-final-v2.docx", "03 Apr 2026"],
  ["report-FINAL-real.docx", "03 Apr 2026"],
  ["report-final-v2 (copy).docx", "date unknown"],
  ["backup-2025.zip", "contents unknown"],
];

const STEPS = [
  {
    number: "01",
    title: "Start with any folder",
    copy: "Build a profile around Documents, client work, or anything worth protecting. Sources are read, never rewritten.",
  },
  {
    number: "02",
    title: "Let the scan decide",
    copy: "Fast metadata comparison skips the unchanged; SHA-256 re-hashes only what actually moved.",
  },
  {
    number: "03",
    title: "Push, then confirm",
    copy: "Changes become a dated, readable Git commit. A run counts as successful only after the private remote accepts it.",
  },
];

const RUN_FEED = [
  {
    time: "02:00",
    text: "Scheduled run missed — machine was asleep",
    chip: null,
    muted: true,
  },
  {
    time: "09:04",
    text: "Caught up automatically on wake",
    chip: "37 files",
    muted: false,
  },
  {
    time: "09:04",
    text: "Commit written: 2026-08-08",
    chip: "readable history",
    muted: false,
  },
  {
    time: "09:05",
    text: "Pushed to private remote",
    chip: "confirmed",
    muted: false,
    ok: true,
  },
];

const ODOMETER = [
  { id: "d1", ch: "0" },
  { id: "d2", ch: "0" },
  { id: "c1", ch: "," },
  { id: "d3", ch: "0" },
  { id: "d4", ch: "0" },
  { id: "d5", ch: "0" },
  { id: "c2", ch: "," },
  { id: "d6", ch: "0" },
  { id: "d7", ch: "0" },
  { id: "d8", ch: "0" },
];

const FAQS = [
  {
    q: "What is NextHive?",
    a: "A local-first Windows desktop app that watches the folders you choose, records only what changed, and builds a readable, dated history in private Git repositories you control.",
  },
  {
    q: "Does it touch my original folders?",
    a: "No. Source folders are read, never written. Changed contents are copied into a managed workspace, so no .git folder ever appears next to your files.",
  },
  {
    q: "Do I need Git installed?",
    a: "No. NextHive embeds libgit2 and performs every Git operation itself — no shell commands, no separate installation.",
  },
  {
    q: "Where do my backups live?",
    a: "In repositories under accounts you own — GitHub, GitLab, Gitea, Forgejo, or Codeberg. NextHive creates them private by default, or you pick an existing private repository.",
  },
  {
    q: "Is my data encrypted?",
    a: "Transport is HTTPS and tokens live in the Windows credential vault. A private Git repository is access-controlled storage, not end-to-end encrypted storage — NextHive states that boundary instead of blurring it.",
  },
  {
    q: "What does it cost?",
    a: "NextHive is open source and free. There is no server, no account, and no subscription — your Git provider's storage is the only storage involved.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#edece8] text-[#101410] font-sans overflow-x-hidden">
      <Head>
        <title>NextHive — Versioned backups you control</title>
        <meta
          name="description"
          content="NextHive is a local-first Windows backup app that watches your folders, creates readable dated Git history, and syncs it to private repositories you control."
        />
        <meta
          property="og:title"
          content="NextHive — Versioned backups you control"
          key="title"
        />
        <meta
          property="og:description"
          content="Quiet, inspectable desktop backups to private repositories you own."
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

      {/* HERO */}
      <Band>
        <div className="relative px-6 md:px-10 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(23, 113, 74, 0.06), transparent)",
            }}
          />
          <div className="relative z-10 pt-14 md:pt-16" id="top">
            <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-x-16 gap-y-10 items-start">
              <div>
                <p className="font-grotesk text-[11px] font-semibold tracking-[0.18em] uppercase text-[#7f8a80] flex items-center gap-2 mb-6">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#177245]"
                    aria-hidden="true"
                  />
                  NextHive {VERSION} · Early access for Windows
                </p>
                <h1 className="font-display text-[44px] md:text-6xl lg:text-[64px] font-medium tracking-tight leading-[1.04] text-balance">
                  Your files change.
                  <br />
                  <span className="text-[#17714a]">NextHive remembers.</span>
                </h1>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <DownloadButton />
                  <GhostButton href={GITHUB_URL} external light>
                    Explore the source
                    <Icon name="arrow" size={15} />
                  </GhostButton>
                </div>
              </div>
              <div className="lg:justify-self-end lg:max-w-sm lg:pt-12">
                <p className="text-[15px] md:text-base text-[#5f665f] leading-relaxed">
                  A local-first desktop app that watches your folders, records
                  only what changed, and builds a readable history in private
                  Git repositories you control.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-[#6b716b]">
                  <li className="flex items-center gap-2">
                    <Icon name="check" size={13} className="text-[#177245]" />{" "}
                    No Git installation required
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="check" size={13} className="text-[#177245]" />{" "}
                    Source folders stay untouched
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="check" size={13} className="text-[#177245]" />{" "}
                    New repositories are private
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 md:mt-16">
              <HeroMock />
            </div>
          </div>
        </div>
      </Band>

      {/* FACT STRIP */}
      <Band>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            ["0", ".git folders added next to your files"],
            ["SHA-256", "verification of every changed file"],
            ["Private", "repository visibility by default"],
            ["One lock", "no duplicate run per profile"],
          ].map(([v, l], i) => (
            <div
              key={v}
              className={`px-6 py-6 text-center border-black/10 ${i % 2 === 0 ? "border-r" : ""} ${
                i < 2 ? "border-b lg:border-b-0" : ""
              } ${i === 2 ? "lg:border-r" : ""}`}
            >
              <strong className="block font-grotesk text-lg font-semibold tracking-tight text-[#101410]">
                {v}
              </strong>
              <span className="block mt-1 text-[#8b918b] text-xs">{l}</span>
            </div>
          ))}
        </div>
      </Band>

      <main id="main-content">
        {/* THE PROBLEM */}
        <Band>
          <Cross className="-bottom-[8px] -left-[8px]" />
          <Cross className="-bottom-[8px] -right-[8px]" />
          <div className="grid lg:grid-cols-2">
            <div className="px-6 md:px-10 py-20 md:py-28 lg:border-r border-black/10">
              <Kicker>The problem</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                Manual backups are a quiet liability.
              </h2>
              <ul className="mt-10 space-y-4">
                {PROBLEMS.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-[15px] text-[#40463f]"
                  >
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-black/10 bg-white flex items-center justify-center text-[#a0642c]">
                      <Icon name="minus" size={11} strokeWidth={2.4} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 md:px-10 py-20 md:py-28 flex items-center bg-[#efeeea]">
              <div className="w-full max-w-md mx-auto rounded-xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="px-4 py-3 border-b border-black/8 text-xs font-semibold text-[#6b716b] flex items-center gap-2">
                  <Icon name="folder" size={14} className="text-[#9aa09a]" />
                  Desktop › Backups (manual)
                </div>
                <div className="divide-y divide-black/5">
                  {MESSY_FILES.map(([name, date]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between px-4 py-3 text-[13px]"
                    >
                      <span className="flex items-center gap-2.5 font-medium text-[#40463f]">
                        <Icon
                          name="file"
                          size={14}
                          className="text-[#b0b5af]"
                        />
                        {name}
                      </span>
                      <span className="text-xs text-[#9aa09a]">{date}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-black/8 bg-[#faf9f7] font-display italic text-sm text-[#6b716b]">
                  Which one is the truth?
                </div>
              </div>
            </div>
          </div>
        </Band>

        {/* WITH NEXTHIVE */}
        <Band id="product">
          <div className="grid lg:grid-cols-2">
            <div className="order-2 lg:order-1 px-6 md:px-10 py-20 md:py-28 lg:border-r border-black/10 bg-[#efeeea] flex items-center">
              <div className="w-full rounded-xl border border-black/10 bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                <div className="relative overflow-hidden aspect-[1.58] rounded-lg bg-[#0a0d0b]">
                  <Image
                    className="w-full h-full object-cover object-top"
                    src="/images/nexthive-dashboard.png"
                    alt="NextHive desktop dashboard showing protected folders and backup profiles"
                    width={1176}
                    height={749}
                    quality={100}
                    sizes="(max-width: 1024px) calc(100vw - 48px), 560px"
                  />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 px-6 md:px-10 py-20 md:py-28">
              <Kicker>With NextHive</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                The app does the work. You keep the proof.
              </h2>
              <ul className="mt-10 space-y-4">
                {[
                  "Run at 02:00 or on demand — the result is the same dated, readable history",
                  "Every run becomes a Git commit you can open on any machine",
                  "Real stages and concrete changes, never an invented percentage",
                  "One dashboard for what changed, what failed, and what runs next",
                ].map((p) => (
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
          </div>
        </Band>

        {/* HOW IT WORKS */}
        <Band id="how-it-works" innerClassName="px-6 md:px-10 py-20 md:py-28">
          <Cross className="-top-[8px] -left-[8px]" />
          <Cross className="-top-[8px] -right-[8px]" />
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end mb-14">
            <SectionHead
              kicker="How it works"
              title="Set it up once. It keeps the history forever."
            />
            <p className="text-[15px] text-[#5f665f] leading-relaxed lg:pb-2 max-w-sm">
              Each profile is a small contract: these folders, this destination,
              this schedule. NextHive keeps the contract and shows its work.
            </p>
          </div>

          <div className="grid md:grid-cols-3 border border-black/10 rounded-xl overflow-hidden bg-white">
            {STEPS.map((step, i) => (
              <article
                key={step.number}
                className={`flex flex-col ${i !== 2 ? "border-b md:border-b-0 md:border-r border-black/10" : ""}`}
              >
                <div className="p-7 pb-5">
                  <span className="font-grotesk text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9aa09a]">
                    Step {step.number}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-medium tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm text-[#5f665f] leading-relaxed">
                    {step.copy}
                  </p>
                </div>
                <div className="mt-auto border-t border-black/8 bg-[#faf9f7] p-5 min-h-[150px]">
                  {i === 0 ? (
                    <div className="space-y-2">
                      {[
                        ["Documents", true],
                        ["Projects / clients", true],
                        ["Design / brand", true],
                        ["node_modules", false],
                      ].map(([name, on]) => (
                        <div
                          key={name}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-md border text-xs font-medium ${
                            on
                              ? "border-[#17714a]/20 bg-white text-[#40463f]"
                              : "border-black/8 bg-white/60 text-[#a5aaa4] line-through"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                              on
                                ? "border-[#177245] bg-[#177245] text-white"
                                : "border-black/15 bg-white"
                            }`}
                          >
                            {on ? (
                              <Icon name="check" size={9} strokeWidth={3} />
                            ) : null}
                          </span>
                          {name}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {i === 1 ? (
                    <div className="font-mono text-[11px] leading-6 text-[#5f665f]">
                      <div>metadata compare · 12,402 files · 0.8s</div>
                      <div>unchanged skipped · 12,365 files</div>
                      <div className="text-[#177245]">
                        re-hash changed · 37 files
                      </div>
                      <div className="text-[#177245]">
                        SHA-256 verified · 37 / 37
                      </div>
                      <div className="text-[#9aa09a]">
                        no source file written
                      </div>
                    </div>
                  ) : null}
                  {i === 2 ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between px-3 py-2 rounded-md border border-black/8 bg-white font-mono text-[11px] text-[#40463f]">
                        <span>commit 2026-08-08</span>
                        <span className="text-[#9aa09a]">37 files</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 rounded-md border border-black/8 bg-white font-mono text-[11px] text-[#40463f]">
                        <span>push → nexthive-documents</span>
                        <span className="text-[#9aa09a]">private</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#17714a]/25 bg-[#e2f5e8] font-semibold text-[#177245]">
                        <Icon name="check" size={12} strokeWidth={2.5} />{" "}
                        Confirmed by remote
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Band>

        {/* SCHEDULING / AUTOMATION */}
        <Band>
          <div className="border-b border-black/10 px-6 md:px-10 overflow-x-auto">
            <div className="flex min-w-max">
              {[
                "Documents",
                "Client work",
                "Design",
                "Finance",
                "Photos",
                "Research",
              ].map((t, i) => (
                <span
                  key={t}
                  className={`px-5 py-3.5 text-[13px] font-semibold border-r border-black/10 first:border-l ${
                    i === 0
                      ? "bg-white text-[#101410] shadow-[inset_0_-2px_0_#177245]"
                      : "text-[#8b918b]"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="grid lg:grid-cols-2">
            <div className="px-6 md:px-10 py-20 md:py-24 lg:border-r border-black/10 bg-gradient-to-b from-[#e7efe8] to-[#f3f5f1] flex items-center">
              <div className="w-full max-w-md mx-auto space-y-3">
                {RUN_FEED.map((run, i) => (
                  <div
                    key={`${run.time}-${run.text}`}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border bg-white text-[13px] shadow-sm ${
                      run.ok ? "border-[#17714a]/30" : "border-black/8"
                    } ${run.muted ? "opacity-60" : ""}`}
                    style={{ marginLeft: `${i * 10}px` }}
                  >
                    <span className="font-mono text-[11px] text-[#9aa09a]">
                      {run.time}
                    </span>
                    <span className="flex-1 font-medium text-[#40463f]">
                      {run.text}
                    </span>
                    {run.chip ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          run.ok
                            ? "bg-[#e2f5e8] text-[#177245]"
                            : "bg-black/5 text-[#6b716b]"
                        }`}
                      >
                        {run.chip}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 md:px-10 py-20 md:py-24">
              <Kicker>Scheduling</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                Automate the routine you never remember.
              </h2>
              <p className="mt-5 text-base text-[#5f665f] leading-relaxed max-w-md">
                Schedules survive sleep and shutdowns: a missed 02:00 run
                catches up quietly the next time your machine is awake.
              </p>
              <div className="mt-9 space-y-5">
                {[
                  [
                    "clock",
                    "Catch-up scheduling",
                    "Missed 02:00 · caught up at 09:04, no questions asked.",
                  ],
                  [
                    "tray",
                    "Quiet tray operation",
                    "Pause or run a backup without opening the app.",
                  ],
                  [
                    "file",
                    "Visible problem files",
                    "Retry, or add the exact file to an exclusion profile.",
                  ],
                ].map(([icon, title, copy]) => (
                  <div key={title} className="flex items-start gap-4">
                    <span className="w-9 h-9 shrink-0 rounded-lg border border-[#17714a]/20 bg-white text-[#17714a] flex items-center justify-center">
                      <Icon name={icon} size={17} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-0.5 text-sm text-[#5f665f]">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Band>

        {/* INTEGRATIONS */}
        <Band id="integrations" innerClassName="px-6 md:px-10 py-20 md:py-28">
          <Cross className="-top-[8px] -left-[8px]" />
          <Cross className="-top-[8px] -right-[8px]" />
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end mb-14">
            <SectionHead
              kicker="Your destination"
              title="Your account. Your repository. Your history."
            />
            <p className="text-[15px] text-[#5f665f] leading-relaxed lg:pb-2 max-w-sm">
              Connect personal and work identities, choose an existing private
              repository, or let NextHive create{" "}
              <span className="font-mono text-[13px]">
                nexthive-&lt;profile&gt;
              </span>
              .
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-4">
                Available today
              </h3>
              <div className="space-y-2.5">
                {[
                  [
                    <FaGithub key="gh" size={18} />,
                    "GitHub",
                    "Private repos · LFS built in",
                  ],
                  [
                    <FaGitlab key="gl" size={18} />,
                    "GitLab",
                    "GitLab.com or self-managed",
                  ],
                  [
                    <SiGitea key="gt" size={18} />,
                    "Gitea / Forgejo",
                    "Your own infrastructure",
                  ],
                  [
                    <SiCodeberg key="cb" size={18} />,
                    "Codeberg",
                    "Community-run hosting",
                  ],
                ].map(([iconNode, name, note]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-3 rounded-lg border border-black/10 bg-white"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-md bg-[#101410] text-white flex items-center justify-center">
                      {iconNode}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {name}
                      </span>
                      <span className="block text-xs text-[#8b918b] truncate">
                        {note}
                      </span>
                    </div>
                    <span className="ml-auto text-[#177245]">
                      <Icon name="check" size={15} strokeWidth={2.2} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-4">
                On the way
              </h3>
              <div className="space-y-2.5">
                {[
                  [<FaGoogleDrive key="gd" size={18} />, "Google Drive"],
                  [<FaYandex key="yd" size={18} />, "Yandex Disk"],
                  [<SiMega key="mega" size={18} />, "MEGA"],
                  [<FaServer key="sf" size={18} />, "SFTP / FTPS"],
                ].map(([iconNode, name]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-3 rounded-lg border border-black/8 border-dashed bg-white/60"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-md bg-[#e9e8e4] text-[#6b716b] flex items-center justify-center">
                      {iconNode}
                    </span>
                    <span className="text-sm font-semibold text-[#6b716b]">
                      {name}
                    </span>
                    <span className="ml-auto px-2 py-0.5 rounded bg-black/5 text-[10px] font-bold text-[#8b918b]">
                      Planned
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#9aa09a]">
                Shown honestly as planned — not promised dates.
              </p>
            </div>

            <div>
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-4">
                Every destination gets
              </h3>
              <div className="space-y-2.5">
                {[
                  ["lock", "Token in the OS credential vault"],
                  ["shield", "Private visibility by default"],
                  ["key", "Push permission verified up front"],
                  ["file", "LFS handling for large files"],
                ].map(([icon, text]) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#17714a]/15 bg-[#eef6ef]"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-md bg-white border border-[#17714a]/20 text-[#17714a] flex items-center justify-center">
                      <Icon name={icon} size={16} />
                    </span>
                    <span className="text-sm font-medium text-[#2c4436]">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Band>

        {/* TRUST / VERIFICATION */}
        <Band>
          <div className="grid lg:grid-cols-2">
            <div className="px-6 md:px-10 py-20 md:py-28 lg:border-r border-black/10">
              <Kicker>Accuracy</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                Verified, or it does not count as a backup.
              </h2>
              <p className="mt-5 text-base text-[#5f665f] leading-relaxed max-w-md">
                NextHive reports real stages and concrete changes instead of
                inventing progress it cannot measure — and a run succeeds only
                after the remote accepts the push.
              </p>
              <ul className="mt-9 space-y-4">
                {[
                  "Fast metadata comparison avoids rehashing unchanged files",
                  "SHA-256 verifies every file that actually changed",
                  "The dated structure is readable on any machine, without NextHive",
                ].map((p) => (
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
            <div className="px-6 md:px-10 py-20 md:py-28 bg-[#0b0f0c] text-white flex items-center relative overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(117,233,161,0.10), transparent)",
                }}
              />
              <div className="relative w-full max-w-md mx-auto space-y-2">
                {[
                  ["A", "design/launch-notes.md", "+ 18 KB"],
                  ["M", "src/features/sync.ts", "SHA verified"],
                  ["D", "archive/old-draft.pdf", "removed"],
                ].map(([badge, file, note]) => (
                  <div
                    key={file}
                    className="flex items-center gap-3 p-3 rounded-md border border-white/8 bg-white/5 font-mono text-xs text-[#dce2ec]"
                  >
                    <span className="w-5 h-5 rounded bg-[#75e9a1]/10 text-[#75e9a1] flex items-center justify-center font-bold">
                      {badge}
                    </span>
                    <span className="flex-1">{file}</span>
                    <span className="text-[#6f7a8b]">{note}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3.5 mt-3 rounded-md border border-[#75e9a1]/25 bg-[#75e9a1]/10 text-[#b8efca] text-sm font-semibold">
                  <Icon
                    name="check"
                    size={16}
                    strokeWidth={2.4}
                    className="text-[#75e9a1]"
                  />
                  Push confirmed by remote — run recorded as successful
                </div>
              </div>
            </div>
          </div>
        </Band>

        {/* FAQ */}
        <Band id="faq" innerClassName="px-6 md:px-10 py-20 md:py-28">
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-12">
            <div>
              <h2 className="font-display text-5xl md:text-6xl font-medium tracking-tight">
                FAQs
              </h2>
              <p className="mt-5 text-[15px] text-[#5f665f] leading-relaxed max-w-xs">
                Still have questions? Read the source, or open an issue on{" "}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 decoration-black/30 hover:text-[#101410]"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
            <div className="border-t border-black/10">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group border-b border-black/10"
                >
                  <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[15px] font-semibold hover:text-[#17714a] transition-colors">
                    {item.q}
                    <span className="shrink-0 w-6 h-6 rounded-full border border-black/10 bg-white flex items-center justify-center text-[#6b716b] transition-transform group-open:rotate-45">
                      <Icon name="plus" size={13} strokeWidth={2} />
                    </span>
                  </summary>
                  <p className="pb-6 pr-10 text-sm text-[#5f665f] leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Band>

        {/* SECURITY */}
        <Band id="security" innerClassName="px-6 md:px-10 py-20 md:py-28">
          <div className="bg-[#0a0d0b] rounded-2xl px-8 py-14 md:px-16 md:py-20 text-white relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 55% 60% at 50% 0%, rgba(117,233,161,0.09), transparent),
                  linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
                `,
                backgroundSize: "100% 100%, 48px 48px, 48px 48px",
              }}
            />
            <div className="relative text-center max-w-2xl mx-auto">
              <Kicker dark>Security by boundary</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                Secrets stay in Rust. Files stay out of the web layer.
              </h2>
              <p className="mt-5 text-[#8e9b93] text-base md:text-lg leading-relaxed">
                The interface can ask for work without gaining broad filesystem
                access or ever receiving your provider token.
              </p>
              <div className="mt-8">
                <DownloadButton dark />
              </div>
              <p className="mt-8 text-[#6c776e] text-xs max-w-md mx-auto">
                A private Git repository is access-controlled storage, not
                end-to-end encrypted storage. NextHive states that boundary
                clearly.
              </p>
            </div>
            <div className="relative flex flex-wrap justify-center gap-x-10 gap-y-3 mt-12 pt-8 border-t border-white/10 text-[13px] text-[#aab5ac]">
              {[
                "Tokens in the OS credential vault",
                "Typed Rust commands only",
                "Private repositories by default",
                "libgit2 — no shell-built Git",
              ].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <Icon name="check" size={13} className="text-[#75e9a1]" /> {t}
                </span>
              ))}
            </div>
          </div>
        </Band>

        {/* ZERO COUNTER */}
        <Band
          rule={false}
          innerClassName="px-6 md:px-10 py-24 md:py-32 text-center overflow-hidden"
        >
          <p className="font-grotesk text-[11px] font-semibold tracking-[0.18em] uppercase text-[#9aa09a]">
            Bytes of your files stored on NextHive servers, to date
          </p>
          <div
            className="mt-8 flex justify-center items-center gap-1.5 md:gap-2 select-none"
            aria-hidden="true"
          >
            {ODOMETER.map((cell) =>
              cell.ch === "," ? (
                <span
                  key={cell.id}
                  className="font-grotesk text-4xl md:text-6xl text-[#b8bcb6] pb-2"
                >
                  ,
                </span>
              ) : (
                <span
                  key={cell.id}
                  className="relative w-11 h-16 md:w-16 md:h-24 rounded-lg border border-black/10 bg-white shadow-sm flex items-center justify-center font-grotesk text-4xl md:text-6xl font-medium text-[#2c332d]"
                >
                  {cell.ch}
                  <span className="absolute inset-x-0 top-1/2 h-px bg-black/8" />
                </span>
              ),
            )}
          </div>
          <p className="mt-8 text-[15px] text-[#5f665f] max-w-md mx-auto leading-relaxed">
            Backups travel from your machine straight to repositories you own.
            The only thing nexthive.app can ever count is an optional, anonymous
            daily ping — a version number and an OS name, with an off switch.
          </p>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
