<p align="center">
  <img src="public/og.jpg" alt="Playpad" width="100%" />
</p>

# Playpad

Pastebin for AI-coding playgrounds. One link, zero servers.

## Why

I wanted to share Claude Code setups with friends without zipping folders or pasting into Notion. So I built this. Drop in your prompts, configs, hooks, whatever. Get a link. Send it.

## How it works

There's no backend. The bundle is compressed and packed into the URL fragment (everything after `#`). Browsers never send fragments to a server, so the content stays on your machine.

If you set a password, the bundle is encrypted in your browser first (PBKDF2-SHA256, then AES-GCM-256) before going into the URL. Only people with the password can read it.

```
https://playpad.dev/#d=<lz-compressed-json>     plaintext
https://playpad.dev/#e=<encrypted-blob>         password-protected
```

Hosting is free on Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

## Features

- Drag and drop files into the editor, or pick from disk
- Optional password, encrypted in the browser
- Multi-file bundles with title and per-file view
- Mobile-friendly light UI
- No tracking, no accounts, no cookies, no DB

## Limits

URLs aren't infinite. Playpad caps at ~60K chars, which modern browsers handle fine. Past 8K, some chat apps and email clients start truncating, and the editor warns you when a link crosses that. Roughly a few hundred KB of raw text after compression. For a whole repo, use a Gist.

## Getting started

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Deploy

Any static host works. Build output goes to `dist/`.

- Cloudflare Pages: connect the repo, build `npm run build`, output `dist`
- Vercel: `vercel --prod`
- Netlify: drop-in via `_redirects`
- GitHub Pages: push `dist/` to `gh-pages`

## License

MIT
