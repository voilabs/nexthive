# NextHive Web

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
