# Playpad

> Pastebin for AI-coding playgrounds. One link, zero servers.

Playpad lets you bundle the files of a Claude Code (or any AI-coding) playground —
prompts, `CLAUDE.md`, `settings.json`, hooks, snippets — and share them as a single
link. The recipient opens the link and sees the playground. That's it.

## Why

Sharing AI-coding setups today means zipping folders, pasting into Notion,
or hoping a Gist renders right. Playpad is the "throw it over the wall" option —
like pastebin, but built for multi-file playgrounds.

## How it works

Playpad is **stateless**. There is no database, no user accounts, no backend.

The entire playground is compressed and stuffed into the URL fragment (`#…`).
Browsers never send fragments to the server, so the host never sees your content.
Optionally, the bundle is encrypted client-side with a password (PBKDF2-SHA256
→ AES-GCM-256) before it goes into the URL — only someone with the password can
read it.

```
https://playpad.dev/#d=<lz-compressed-json>            # plaintext, public link
https://playpad.dev/#e=<encrypted-blob>                 # password-protected
```

Because it's a static site, hosting is free on Cloudflare Pages, Vercel,
Netlify, or GitHub Pages. Infra cost: $0.

## Features

- **Drag-and-drop a folder** or paste files manually
- **Optional password** — encryption happens in the browser
- **Multi-file** bundles with a title and per-file syntax view
- **Copy single file** or **download the whole bundle** as a zip
- **No tracking, no accounts, no cookies**

## Limits

URLs aren't infinite. Playpad keeps bundles under ~100 KB compressed —
roughly a small repo's worth of text. Larger than that, use a Gist.

## Getting started

```bash
pnpm install
pnpm dev
```

Build and preview:

```bash
pnpm build
pnpm preview
```

## Deploy

Any static host works. The build output is `dist/`.

- **Cloudflare Pages**: connect the repo, build command `pnpm build`, output `dist`
- **Vercel**: `vercel --prod`
- **GitHub Pages**: push `dist/` to `gh-pages`

## License

MIT
