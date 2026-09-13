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
  LocaleAlternates,
  SiteFooter,
  SiteNav,
  VERSION,
} from "@/components/site/ui";
import { useI18n } from "@/i18n";

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

function StatusChip({ state, labels }) {
  if (state === "running") {
    return (
      <span className="font-display italic text-[13px] text-[#17714a]">
        {labels.running}
      </span>
    );
  }
  if (state === "queued") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded bg-black/5 text-[#6b716b] text-[11px] font-semibold">
        {labels.queued}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e2f5e8] text-[#177245] text-[11px] font-semibold">
      <Icon name="check" size={11} strokeWidth={2.2} /> {labels.done}
    </span>
  );
}

function HeroMock() {
  const { t } = useI18n();
  const mock = t.home.mock;
  return (
    <div className="w-full rounded-t-xl border border-b-0 border-black/10 overflow-hidden shadow-[0_-12px_48px_rgba(16,20,16,0.05)]">
      <div className="flex overflow-x-auto bg-[#eceae5]">
        {mock.tabs.map((tab, i) => (
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
              {mock.titleBar}
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#101410] text-white text-[11px] font-semibold">
            <Icon name="commit" size={12} /> {mock.runAll}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/8">
                {mock.columns.map((h) => (
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
              {mock.rows.map((row) => (
                <tr
                  key={row.folder}
                  className="border-b border-black/5 last:border-b-0"
                >
                  <td className="px-4 py-3 font-semibold flex items-center gap-2.5">
                    <span className="text-[#8d948d]">
                      <Icon name="folder" size={15} />
                    </span>
                    {row.folder}
                  </td>
                  <td className="px-4 py-3 text-[#6b716b]">{row.profile}</td>
                  <td className="px-4 py-3 text-[#6b716b] font-mono text-xs">
                    {row.files}
                  </td>
                  <td className="px-4 py-3 text-[#6b716b]">{row.changes}</td>
                  <td className="px-4 py-3 text-[#6b716b]">{row.verify}</td>
                  <td className="px-4 py-3">
                    <StatusChip state={row.state} labels={mock.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Provider marks, paired with the localized names by position. */
const AVAILABLE_ICONS = [
  <FaGithub key="gh" size={18} />,
  <FaGitlab key="gl" size={18} />,
  <SiGitea key="gt" size={18} />,
  <SiCodeberg key="cb" size={18} />,
];

const PLANNED_ICONS = [
  <FaGoogleDrive key="gd" size={18} />,
  <FaYandex key="yd" size={18} />,
  <SiMega key="mega" size={18} />,
  <FaServer key="sf" size={18} />,
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

export default function Home() {
  const { t } = useI18n();
  const home = t.home;
  return (
    <div className="min-h-screen bg-[#edece8] text-[#101410] font-sans overflow-x-hidden">
      <Head>
        <title>{home.meta.title}</title>
        <meta name="description" content={home.meta.description} />
        <meta property="og:title" content={home.meta.ogTitle} key="title" />
        <meta
          property="og:description"
          content={home.meta.ogDescription}
          key="description"
        />
        <meta name="theme-color" content="#f6f5f2" />
        <link rel="icon" type="image/png" href="/brand/app-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/brand/app-icon.png" />
      </Head>
      <LocaleAlternates />

      <a
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 focus:p-3 focus:bg-[#75e9a1] focus:text-[#07110b]"
        href="#main-content"
      >
        {t.nav.skip}
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
                  NextHive {VERSION} · {home.hero.badge}
                </p>
                <h1 className="font-display text-[44px] md:text-6xl lg:text-[64px] font-medium tracking-tight leading-[1.04] text-balance">
                  {home.hero.titleTop}
                  <br />
                  <span className="text-[#17714a]">
                    {home.hero.titleBottom}
                  </span>
                </h1>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <DownloadButton />
                  <GhostButton href={GITHUB_URL} external light>
                    {home.hero.exploreSource}
                    <Icon name="arrow" size={15} />
                  </GhostButton>
                </div>
              </div>
              <div className="lg:justify-self-end lg:max-w-sm lg:pt-12">
                <p className="text-[15px] md:text-base text-[#5f665f] leading-relaxed">
                  {home.hero.copy}
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-[#6b716b]">
                  {home.hero.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <Icon name="check" size={13} className="text-[#177245]" />{" "}
                      {point}
                    </li>
                  ))}
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
          {home.facts.map(([v, l], i) => (
            <div
              key={l}
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
              <Kicker>{home.problem.kicker}</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                {home.problem.title}
              </h2>
              <ul className="mt-10 space-y-4">
                {home.problem.items.map((p) => (
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
                  {home.problem.folderLabel}
                </div>
                <div className="divide-y divide-black/5">
                  {home.problem.files.map(([name, date]) => (
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
                  {home.problem.question}
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
                    alt={home.product.imageAlt}
                    width={1176}
                    height={749}
                    quality={100}
                    sizes="(max-width: 1024px) calc(100vw - 48px), 560px"
                  />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 px-6 md:px-10 py-20 md:py-28">
              <Kicker>{home.product.kicker}</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                {home.product.title}
              </h2>
              <ul className="mt-10 space-y-4">
                {home.product.items.map((p) => (
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
            <SectionHead kicker={home.how.kicker} title={home.how.title} />
            <p className="text-[15px] text-[#5f665f] leading-relaxed lg:pb-2 max-w-sm">
              {home.how.copy}
            </p>
          </div>

          <div className="grid md:grid-cols-3 border border-black/10 rounded-xl overflow-hidden bg-white">
            {home.how.steps.map((step, i) => (
              <article
                key={step.number}
                className={`flex flex-col ${i !== 2 ? "border-b md:border-b-0 md:border-r border-black/10" : ""}`}
              >
                <div className="p-7 pb-5">
                  <span className="font-grotesk text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9aa09a]">
                    {home.how.stepLabel} {step.number}
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
                      {home.how.folders.map(([name, on]) => (
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
                      {home.how.scanLog.map((line, index) => (
                        <div
                          key={line}
                          className={
                            index === 2 || index === 3
                              ? "text-[#177245]"
                              : index === 4
                                ? "text-[#9aa09a]"
                                : undefined
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {i === 2 ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between px-3 py-2 rounded-md border border-black/8 bg-white font-mono text-[11px] text-[#40463f]">
                        <span>{home.how.push.commit}</span>
                        <span className="text-[#9aa09a]">
                          {home.how.push.commitNote}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 rounded-md border border-black/8 bg-white font-mono text-[11px] text-[#40463f]">
                        <span>{home.how.push.pushLine}</span>
                        <span className="text-[#9aa09a]">
                          {home.how.push.pushNote}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#17714a]/25 bg-[#e2f5e8] font-semibold text-[#177245]">
                        <Icon name="check" size={12} strokeWidth={2.5} />{" "}
                        {home.how.push.confirmed}
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
              {home.schedule.tabs.map((tab, i) => (
                <span
                  key={tab}
                  className={`px-5 py-3.5 text-[13px] font-semibold border-r border-black/10 first:border-l ${
                    i === 0
                      ? "bg-white text-[#101410] shadow-[inset_0_-2px_0_#177245]"
                      : "text-[#8b918b]"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>
          <div className="grid lg:grid-cols-2">
            <div className="px-6 md:px-10 py-20 md:py-24 lg:border-r border-black/10 bg-gradient-to-b from-[#e7efe8] to-[#f3f5f1] flex items-center">
              <div className="w-full max-w-md mx-auto space-y-3">
                {home.schedule.feed.map((run, i) => {
                  const muted = i === 0;
                  const ok = i === home.schedule.feed.length - 1;
                  return (
                    <div
                      key={`${run.time}-${run.text}`}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border bg-white text-[13px] shadow-sm ${
                        ok ? "border-[#17714a]/30" : "border-black/8"
                      } ${muted ? "opacity-60" : ""}`}
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
                            ok
                              ? "bg-[#e2f5e8] text-[#177245]"
                              : "bg-black/5 text-[#6b716b]"
                          }`}
                        >
                          {run.chip}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 md:px-10 py-20 md:py-24">
              <Kicker>{home.schedule.kicker}</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                {home.schedule.title}
              </h2>
              <p className="mt-5 text-base text-[#5f665f] leading-relaxed max-w-md">
                {home.schedule.copy}
              </p>
              <div className="mt-9 space-y-5">
                {home.schedule.features.map(([icon, title, copy]) => (
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
              kicker={home.integrations.kicker}
              title={home.integrations.title}
            />
            <p className="text-[15px] text-[#5f665f] leading-relaxed lg:pb-2 max-w-sm">
              {home.integrations.copyBefore}
              <span className="font-mono text-[13px]">
                nexthive-&lt;profile&gt;
              </span>
              {home.integrations.copyAfter}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-4">
                {home.integrations.availableHeading}
              </h3>
              <div className="space-y-2.5">
                {home.integrations.available.map(([name, note], i) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-3 rounded-lg border border-black/10 bg-white"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-md bg-[#101410] text-white flex items-center justify-center">
                      {AVAILABLE_ICONS[i]}
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
                {home.integrations.plannedHeading}
              </h3>
              <div className="space-y-2.5">
                {home.integrations.planned.map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-3 rounded-lg border border-black/8 border-dashed bg-white/60"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-md bg-[#e9e8e4] text-[#6b716b] flex items-center justify-center">
                      {PLANNED_ICONS[i]}
                    </span>
                    <span className="text-sm font-semibold text-[#6b716b]">
                      {name}
                    </span>
                    <span className="ml-auto px-2 py-0.5 rounded bg-black/5 text-[10px] font-bold text-[#8b918b]">
                      {home.integrations.plannedChip}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#9aa09a]">
                {home.integrations.plannedNote}
              </p>
            </div>

            <div>
              <h3 className="font-grotesk text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9aa09a] pb-3 border-b border-black/10 mb-4">
                {home.integrations.everyHeading}
              </h3>
              <div className="space-y-2.5">
                {home.integrations.every.map(([icon, text]) => (
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
              <Kicker>{home.trust.kicker}</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                {home.trust.title}
              </h2>
              <p className="mt-5 text-base text-[#5f665f] leading-relaxed max-w-md">
                {home.trust.copy}
              </p>
              <ul className="mt-9 space-y-4">
                {home.trust.items.map((p) => (
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
                {home.trust.diff.map(([badge, file, note]) => (
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
                  {home.trust.confirmed}
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
                {home.faq.title}
              </h2>
              <p className="mt-5 text-[15px] text-[#5f665f] leading-relaxed max-w-xs">
                {home.faq.copyBefore}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 decoration-black/30 hover:text-[#101410]"
                >
                  {home.faq.copyLink}
                </a>
                {home.faq.copyAfter}
              </p>
            </div>
            <div className="border-t border-black/10">
              {home.faq.items.map((item) => (
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
              <Kicker dark>{home.security.kicker}</Kicker>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
                {home.security.title}
              </h2>
              <p className="mt-5 text-[#8e9b93] text-base md:text-lg leading-relaxed">
                {home.security.copy}
              </p>
              <div className="mt-8">
                <DownloadButton dark />
              </div>
              <p className="mt-8 text-[#6c776e] text-xs max-w-md mx-auto">
                {home.security.note}
              </p>
            </div>
            <div className="relative flex flex-wrap justify-center gap-x-10 gap-y-3 mt-12 pt-8 border-t border-white/10 text-[13px] text-[#aab5ac]">
              {home.security.badges.map((badge) => (
                <span key={badge} className="flex items-center gap-2">
                  <Icon name="check" size={13} className="text-[#75e9a1]" />{" "}
                  {badge}
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
            {home.counter.kicker}
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
            {home.counter.copy}
          </p>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
