<p align="center">
  <img src="public/og.jpg" alt="Playpad" width="100%" />
</p>

# Playpad

Pastebin for AI-coding playgrounds. One link, zero servers.

## Why

I wanted to share Claude Code setups with friends without zipping folders or pasting into Notion. So I built this. Drop in your prompts, configs, hooks, whatever. Get a link. Send it.

## How it works

There's no backend. The bundle is compressed and packed into the URL fragment (everything after `#`). Browsers never send fragments to a server, so the content stays on your machine.

If you set a password, the bundle is encrypted in your browser first. Key derivation is PBKDF2-SHA256 at 600,000 iterations (OWASP 2023+), the cipher is AES-GCM-256. Only people with the password can read it.

```
https://playpad.dev/#d=<gzip+base64url>      plaintext
https://playpad.dev/#e=<salt|iv|ciphertext>  password-protected
```

Hosting is free on Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

## Security

Recipients render shared HTML inside a sandboxed iframe with a strict CSP injected into the document. The sandbox blocks DOM access to the host page; the CSP blocks network egress (no fetch, XHR, WebSocket, sendBeacon), form submissions, tracking pixels, nested iframes, and workers. Crypto runs through the Web Crypto API. No third-party crypto code in the bundle.

What the host sees: nothing. The fragment is user-agent-only by URL semantics (RFC 3986 §3.5) and is excluded from the HTTP request-target (RFC 9110 §7.1), so browsers strip it before sending. The host serves the same `index.html` to everyone.

Trust model: like a Gist or a Google Doc. The technology isolates your machine from whatever runs in the iframe, but it cannot tell whether the sender is who they claim to be. Treat a playground link the same way you treat code from a stranger.

### Things to know before you ship sensitive content

- **Visual phishing is possible.** A playground can render a fake login form. Exfiltration channels are blocked, but a confused recipient might still type a password into the form. Treat password fields inside playgrounds as untrusted UI.
- **Encrypted bundles are subject to offline brute-force.** Anyone with the link has the ciphertext. PBKDF2 at 600K iterations puts a single guess at roughly 500ms on modern hardware, which is expensive but not infeasible if the password is weak. Use a strong password.
- **The full URL is in the recipient's browser history.** Anyone with access to that browser can open the playground without asking again.
- **No revocation, no expiration.** The fragment is the data. If a link leaks, the password is the only protection. Rotate by re-encrypting and re-sharing.
- **CDN allowlist for scripts.** The iframe CSP allows scripts from `jsdelivr`, `unpkg`, `cdnjs`, and `esm.sh` so legitimate demos using Mermaid, D3, and friends keep working. A determined attacker could host a payload on one of those CDNs.
- **iframe is "allow-modals" enabled.** A playground can pop `alert()` / `confirm()` dialogs. Annoying but not exfiltration; close the tab.

### Things that are NOT problems

- Host reading your bundle. Cannot. Fragment never reaches it.
- Iframe stealing your Playpad cookies. Cannot. Sandbox uses null origin and Playpad has no cookies anyway.
- Iframe redirecting your tab. Cannot. No `allow-top-navigation`.
- Iframe submitting your data anywhere. Cannot. No `connect-src`, no `form-action`, no external image hosts.

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
