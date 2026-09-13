/*
 * English copy for the marketing site. Keep this file and `tr.js` structurally
 * identical — the language switcher swaps one for the other at runtime.
 */
export const en = {
  code: "en",
  label: "English",
  shortLabel: "EN",
  htmlLang: "en",
  numberLocale: "en-US",

  nav: {
    home: "NextHive home",
    main: "Main navigation",
    skip: "Skip to content",
    github: "GitHub",
    download: "Download",
    links: {
      product: "Product",
      how: "How it works",
      integrations: "Integrations",
      security: "Security",
      faq: "FAQ",
    },
  },

  language: {
    label: "Language",
    menu: "Select language",
  },

  cta: {
    downloadWindows: "Download for Windows",
  },

  footer: {
    headlineTop: "Stop losing versions",
    headlineBottom: "of your work.",
    star: "Star on GitHub",
    blurb: "Quiet, inspectable backups under your control. Built by VoiLabs.",
    productHeading: "Product",
    projectHeading: "Project",
    download: "Download",
    github: "GitHub",
    releases: "Releases",
    changelog: "Changelog",
    copyright: "© 2026 VoiLabs. NextHive is open source software.",
  },

  home: {
    meta: {
      title: "NextHive — Versioned backups you control",
      description:
        "NextHive is a local-first Windows backup app that watches your folders, creates readable dated Git history, and syncs it to private repositories you control.",
      ogTitle: "NextHive — Versioned backups you control",
      ogDescription:
        "Quiet, inspectable desktop backups to private repositories you own.",
    },
    hero: {
      badge: "Early access for Windows",
      titleTop: "Your files change.",
      titleBottom: "NextHive remembers.",
      exploreSource: "Explore the source",
      copy: "A local-first desktop app that watches your folders, records only what changed, and builds a readable history in private Git repositories you control.",
      points: [
        "No Git installation required",
        "Source folders stay untouched",
        "New repositories are private",
      ],
    },
    mock: {
      tabs: [
        "Dashboard",
        "Backup history",
        "Problem files",
        "Schedule",
        "Destinations",
      ],
      titleBar: "NextHive — 6 profiles · 08 Aug 2026, 09:04",
      runAll: "Run all",
      columns: [
        "Folder",
        "Profile",
        "Files",
        "Last run",
        "Verification",
        "Status",
      ],
      status: {
        running: "Backing up…",
        queued: "Queued",
        done: "Backed up",
      },
      rows: [
        {
          folder: "Documents",
          profile: "Personal",
          files: "12,402",
          changes: "37 changed",
          verify: "SHA-256 verified",
          state: "done",
        },
        {
          folder: "Projects / clients",
          profile: "Work",
          files: "8,114",
          changes: "112 changed",
          verify: "SHA-256 verified",
          state: "done",
        },
        {
          folder: "Design / brand",
          profile: "Work",
          files: "2,930",
          changes: "6 changed",
          verify: "hashing changed files",
          state: "running",
        },
        {
          folder: "Finance / 2026",
          profile: "Personal",
          files: "1,204",
          changes: "2 changed",
          verify: "SHA-256 verified",
          state: "done",
        },
        {
          folder: "Photos / family",
          profile: "Personal",
          files: "24,551",
          changes: "418 changed",
          verify: "waiting for turn",
          state: "queued",
        },
        {
          folder: "Research / notes",
          profile: "Personal",
          files: "3,388",
          changes: "no changes",
          verify: "up to date",
          state: "done",
        },
      ],
    },
    facts: [
      ["0", ".git folders added next to your files"],
      ["SHA-256", "verification of every changed file"],
      ["Private", "repository visibility by default"],
      ["One lock", "no duplicate run per profile"],
    ],
    problem: {
      kicker: "The problem",
      title: "Manual backups are a quiet liability.",
      items: [
        "Copy-paste versions multiply until none of them is the truth",
        "One-off archives cannot show what changed, or when",
        "Cloud sync overwrites history instead of keeping it",
        "You find out a backup failed only when you need it",
      ],
      folderLabel: "Desktop › Backups (manual)",
      files: [
        ["report-final.docx", "12 Mar 2026"],
        ["report-final-v2.docx", "03 Apr 2026"],
        ["report-FINAL-real.docx", "03 Apr 2026"],
        ["report-final-v2 (copy).docx", "date unknown"],
        ["backup-2025.zip", "contents unknown"],
      ],
      question: "Which one is the truth?",
    },
    product: {
      kicker: "With NextHive",
      title: "The app does the work. You keep the proof.",
      imageAlt:
        "NextHive desktop dashboard showing protected folders and backup profiles",
      items: [
        "Run at 02:00 or on demand — the result is the same dated, readable history",
        "Every run becomes a Git commit you can open on any machine",
        "Real stages and concrete changes, never an invented percentage",
        "One dashboard for what changed, what failed, and what runs next",
      ],
    },
    how: {
      kicker: "How it works",
      title: "Set it up once. It keeps the history forever.",
      copy: "Each profile is a small contract: these folders, this destination, this schedule. NextHive keeps the contract and shows its work.",
      stepLabel: "Step",
      steps: [
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
      ],
      folders: [
        ["Documents", true],
        ["Projects / clients", true],
        ["Design / brand", true],
        ["node_modules", false],
      ],
      scanLog: [
        "metadata compare · 12,402 files · 0.8s",
        "unchanged skipped · 12,365 files",
        "re-hash changed · 37 files",
        "SHA-256 verified · 37 / 37",
        "no source file written",
      ],
      push: {
        commit: "commit 2026-08-08",
        commitNote: "37 files",
        pushLine: "push → nexthive-documents",
        pushNote: "private",
        confirmed: "Confirmed by remote",
      },
    },
    schedule: {
      tabs: [
        "Documents",
        "Client work",
        "Design",
        "Finance",
        "Photos",
        "Research",
      ],
      feed: [
        { time: "02:00", text: "Scheduled run missed — machine was asleep" },
        {
          time: "09:04",
          text: "Caught up automatically on wake",
          chip: "37 files",
        },
        {
          time: "09:04",
          text: "Commit written: 2026-08-08",
          chip: "readable history",
        },
        { time: "09:05", text: "Pushed to private remote", chip: "confirmed" },
      ],
      kicker: "Scheduling",
      title: "Automate the routine you never remember.",
      copy: "Schedules survive sleep and shutdowns: a missed 02:00 run catches up quietly the next time your machine is awake.",
      features: [
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
      ],
    },
    integrations: {
      kicker: "Your destination",
      title: "Your account. Your repository. Your history.",
      copyBefore:
        "Connect personal and work identities, choose an existing private repository, or let NextHive create ",
      copyAfter: ".",
      availableHeading: "Available today",
      available: [
        ["GitHub", "Private repos · LFS built in"],
        ["GitLab", "GitLab.com or self-managed"],
        ["Gitea / Forgejo", "Your own infrastructure"],
        ["Codeberg", "Community-run hosting"],
      ],
      plannedHeading: "On the way",
      planned: ["Google Drive", "Yandex Disk", "MEGA", "SFTP / FTPS"],
      plannedChip: "Planned",
      plannedNote: "Shown honestly as planned — not promised dates.",
      everyHeading: "Every destination gets",
      every: [
        ["lock", "Token in the OS credential vault"],
        ["shield", "Private visibility by default"],
        ["key", "Push permission verified up front"],
        ["file", "LFS handling for large files"],
      ],
    },
    trust: {
      kicker: "Accuracy",
      title: "Verified, or it does not count as a backup.",
      copy: "NextHive reports real stages and concrete changes instead of inventing progress it cannot measure — and a run succeeds only after the remote accepts the push.",
      items: [
        "Fast metadata comparison avoids rehashing unchanged files",
        "SHA-256 verifies every file that actually changed",
        "The dated structure is readable on any machine, without NextHive",
      ],
      diff: [
        ["A", "design/launch-notes.md", "+ 18 KB"],
        ["M", "src/features/sync.ts", "SHA verified"],
        ["D", "archive/old-draft.pdf", "removed"],
      ],
      confirmed: "Push confirmed by remote — run recorded as successful",
    },
    faq: {
      title: "FAQs",
      copyBefore: "Still have questions? Read the source, or open an issue on ",
      copyLink: "GitHub",
      copyAfter: ".",
      items: [
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
      ],
    },
    security: {
      kicker: "Security by boundary",
      title: "Secrets stay in Rust. Files stay out of the web layer.",
      copy: "The interface can ask for work without gaining broad filesystem access or ever receiving your provider token.",
      note: "A private Git repository is access-controlled storage, not end-to-end encrypted storage. NextHive states that boundary clearly.",
      badges: [
        "Tokens in the OS credential vault",
        "Typed Rust commands only",
        "Private repositories by default",
        "libgit2 — no shell-built Git",
      ],
    },
    counter: {
      kicker: "Bytes of your files stored on NextHive servers, to date",
      copy: "Backups travel from your machine straight to repositories you own. The only thing nexthive.app can ever count is an optional, anonymous daily ping — a version number and an OS name, with an off switch.",
    },
  },

  download: {
    meta: {
      title: "Download NextHive — Windows",
      description:
        "Download NextHive {version} for Windows: a local-first backup app that builds readable, dated Git history in private repositories you control.",
      ogTitle: "Download NextHive — Windows",
      ogDescription:
        "Get the early-access Windows build. Open source, no account, no tracking.",
    },
    hero: {
      kicker: "Download",
      title: "Get NextHive for Windows.",
      copy: "Version {version}, early access. One installer, no account, no tracking — your first backup can be running in a few minutes.",
      button: "Download NextHive {version}",
      allReleases: "All releases",
      note: "Served from GitHub Releases — the same place the app checks for updates.",
    },
    card: {
      installerLabel: "Windows installer",
      version: "Version",
      versionValue: "{version} · early access",
      platform: "Platform",
      platformValue: "Windows 10 / 11, 64-bit",
      license: "License",
      licenseValue: "Open source",
      source: "Source",
      activeToday: "Active devices today",
      direct: "Direct download",
    },
    steps: {
      kicker: "From download to first backup",
      title: "Three steps, no surprises.",
      copy: "The installer sets up the app and nothing else — no services you did not ask for, no background updaters outside the app.",
      label: "Step",
      items: [
        {
          number: "01",
          title: "Run the installer",
          copy: "Double-click {installer} once the download finishes. No Git, no runtimes, no extra tools to set up first.",
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
      ],
    },
    needsHeading: "What you need",
    needs: [
      "64-bit Windows 10 or 11",
      "An account at GitHub, GitLab, Gitea, Forgejo, or Codeberg for destinations",
      "An internet connection when pushing backups",
    ],
    notNeedsHeading: "What you will not need",
    notNeeds: [
      "No Git installation — libgit2 is built in",
      "No NextHive account — there is nothing to sign up for",
      "No subscription — open source, free",
    ],
    telemetry: {
      kicker: "Counted, not tracked",
      title: "One anonymous ping a day. That is the whole story.",
      copyBefore: "While NextHive is running, it reports once per day that ",
      copyEm: "a",
      copyAfter:
        " device is alive — an app version and an OS name, nothing else. No identifier, no hardware info, no file names. The server keeps only day totals, and the count you see on this page is the same number we see.",
      points: [
        "Turn it off any time: Settings → Privacy → Anonymous usage ping",
        "Both ends are open source — the ping and the counter are in the repository",
      ],
      endpoint: "POST nexthive.app/api/ping",
      rows: [
        ["Identifiers sent", "none"],
        ["IP address stored", "no"],
        ["Stored server-side", "+1 to today's total"],
      ],
      countedToday: "Devices counted today",
    },
    platforms: {
      kicker: "Other platforms",
      title: "Windows first. The rest, honestly later.",
      copy: "macOS and Linux builds are not available yet. Watch the repository or the releases page — when they land, they will appear there first.",
      notAvailable: "Not available yet",
      follow: "Follow releases on GitHub",
    },
  },
};
