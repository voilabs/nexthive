# NextHive Web

**English** · [Türkçe](README.tr.md)

The public NextHive marketing, documentation and desktop-download website. This app is deployed independently and is never bundled into the Tauri installer or updater artifacts.

## Development

From the repository root:

```bash
bun install --cwd apps/web
npm run web:dev
```

Or work directly inside this package:

```bash
cd apps/web
bun install
bun run dev
bun run lint
bun run build
```

The marketing site uses Next.js and has its own Bun lockfile. Desktop releases are produced exclusively from `apps/desktop`.

## Languages

The site ships in English and Turkish. Locales are separated by Next.js sub-path routing: English is served from `/`, Turkish from `/tr` (for example `/download` and `/tr/download`). The configuration lives under `i18n` in `next.config.mjs`.

- Copy lives in `src/i18n/en.js` and `src/i18n/tr.js`. Both files must stay structurally identical.
- Pages and components read copy through the `useI18n()` hook in `src/i18n/index.js`; the active locale comes from the URL, so translations are server-rendered.
- Placeholders such as `{version}` are filled in with `fmt(text, { version })`.
- The header language dropdown is `src/components/site/LanguageSwitcher.js`. Its options are real links to the same page in the other locale, and the choice is written to the `NEXT_LOCALE` cookie.
- Every page emits `canonical` and `hreflang` links through the `LocaleAlternates` component.

To add a language, create the dictionary, register it in `DICTIONARIES` and `LOCALES` in `src/i18n/index.js`, and extend `i18n.locales` in `next.config.mjs`.
