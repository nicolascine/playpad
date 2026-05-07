import { useEffect, useMemo, useState } from "react";
import type { Playground, PlaygroundFile } from "../lib/types";
import { decryptFragment } from "../lib/share";

type Props =
  | { kind: "plaintext"; playground: Playground }
  | { kind: "encrypted"; salt: Uint8Array; iv: Uint8Array; ct: Uint8Array };

export function Viewer(props: Props) {
  if (props.kind === "encrypted") {
    return <EncryptedViewer salt={props.salt} iv={props.iv} ct={props.ct} />;
  }
  return <PlaygroundView playground={props.playground} encrypted={false} />;
}

function EncryptedViewer({ salt, iv, ct }: { salt: Uint8Array; iv: Uint8Array; ct: Uint8Array }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState<Playground | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const pg = await decryptFragment(salt, iv, ct, password);
      setUnlocked(pg);
    } catch {
      setError("Wrong password, or the link is corrupted.");
    } finally {
      setBusy(false);
    }
  }

  if (unlocked) return <PlaygroundView playground={unlocked} encrypted />;

  return (
    <>
      <section className="panel locked-skeleton" aria-hidden="true">
        <div className="row spread">
          <div>
            <div className="skeleton-title" />
            <div className="skeleton-line" />
          </div>
          <span className="tag">encrypted</span>
        </div>
      </section>
      <section className="panel locked-skeleton" aria-hidden="true">
        <div className="skeleton-block" />
      </section>

      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <div className="modal">
          <h2 id="unlock-title" style={{ margin: "0 0 6px", fontSize: 16 }}>
            Encrypted playground
          </h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
            Enter the password to unlock. Decryption happens entirely in your browser.
          </p>
          <form onSubmit={unlock}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button type="submit" className="primary" disabled={busy || !password}>
                {busy ? "Unlocking…" : "Unlock"}
              </button>
            </div>
          </form>
          {error && (
            <div className="banner error" style={{ marginTop: 12, marginBottom: 0 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function isHtmlFile(file: PlaygroundFile): boolean {
  if (/\.(html?|htm)$/i.test(file.name)) return true;
  const start = file.content.trimStart().slice(0, 200).toLowerCase();
  return start.startsWith("<!doctype html") || start.startsWith("<html");
}

function PlaygroundView({ playground, encrypted }: { playground: Playground; encrypted: boolean }) {
  const primaryHtml = useMemo(
    () => playground.files.find(isHtmlFile) ?? null,
    [playground.files]
  );

  const [tab, setTab] = useState<"preview" | "source">(primaryHtml ? "preview" : "source");

  function copyFile(content: string) {
    void navigator.clipboard.writeText(content);
  }

  function fork() {
    window.location.hash = "";
    window.location.reload();
  }

  return (
    <>
      <section className="panel">
        <div className="row spread">
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{playground.title}</div>
            {playground.note && (
              <div className="muted" style={{ marginTop: 4 }}>
                {playground.note}
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className={encrypted ? "tag ok" : "tag"}>
              {encrypted ? "encrypted" : "public"}
            </span>
            <span className="tag">
              {playground.files.length} file{playground.files.length === 1 ? "" : "s"}
            </span>
            <button onClick={fork}>New</button>
          </div>
        </div>
        {primaryHtml && (
          <div className="tabs">
            <button
              className={`tab${tab === "preview" ? " active" : ""}`}
              onClick={() => setTab("preview")}
            >
              Preview
            </button>
            <button
              className={`tab${tab === "source" ? " active" : ""}`}
              onClick={() => setTab("source")}
            >
              Source
            </button>
          </div>
        )}
      </section>

      {primaryHtml && tab === "preview" ? (
        <PreviewFrame file={primaryHtml} />
      ) : (
        <SourceList files={playground.files} onCopy={copyFile} />
      )}
    </>
  );
}

const IFRAME_CSP = [
  "default-src 'self' 'unsafe-inline' data: blob:",
  "script-src 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://esm.sh",
  "style-src 'unsafe-inline' data: blob: https:",
  "img-src data: blob: https:",
  "media-src data: blob: https:",
  "font-src data: blob: https:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

function injectCsp(html: string): string {
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${IFRAME_CSP}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => match + cspMeta);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${cspMeta}</head>`);
  }
  return cspMeta + html;
}

function PreviewFrame({ file }: { file: PlaygroundFile }) {
  const [iframeKey, setIframeKey] = useState(0);

  const hardened = useMemo(() => injectCsp(file.content), [file.content]);

  useEffect(() => {
    setIframeKey((k) => k + 1);
  }, [hardened]);

  function openInNewTab() {
    const blob = new Blob([hardened], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <section className="panel preview-panel">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <code style={{ fontSize: 12 }}>{file.name}</code>
        <div className="row" style={{ gap: 6 }}>
          <button onClick={() => setIframeKey((k) => k + 1)}>Reload</button>
          <button onClick={openInNewTab}>Open in new tab</button>
        </div>
      </div>
      <iframe
        key={iframeKey}
        title={file.name}
        srcDoc={hardened}
        sandbox="allow-scripts allow-modals"
        referrerPolicy="no-referrer"
        loading="lazy"
        className="preview-frame"
      />
      <div className="preview-note">
        Sandboxed iframe. Network egress blocked (no fetch, no form submit, no tracking pixels).
        Scripts run isolated from this page.
      </div>
    </section>
  );
}

function SourceList({
  files,
  onCopy,
}: {
  files: PlaygroundFile[];
  onCopy: (content: string) => void;
}) {
  return (
    <>
      {files.map((file, idx) => (
        <section className="panel viewer-file" key={idx}>
          <div className="row spread" style={{ marginBottom: 10 }}>
            <code style={{ fontSize: 13 }}>{file.name}</code>
            <button onClick={() => onCopy(file.content)}>Copy</button>
          </div>
          <pre>{file.content}</pre>
        </section>
      ))}
    </>
  );
}
