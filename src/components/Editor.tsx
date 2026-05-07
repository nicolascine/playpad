import { useMemo, useState } from "react";
import type { Playground, PlaygroundFile } from "../lib/types";
import { encodeEncrypted, encodePlaintext, buildShareUrl } from "../lib/share";
import { encryptPlayground } from "../lib/crypto";

const DEFAULT_FILE: PlaygroundFile = {
  name: "CLAUDE.md",
  content: "# Notes\n\nDescribe what this playground does.\n",
};

export function Editor() {
  const [title, setTitle] = useState("Untitled playground");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PlaygroundFile[]>([DEFAULT_FILE]);
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalChars = useMemo(
    () => files.reduce((n, f) => n + f.name.length + f.content.length, 0),
    [files]
  );

  function updateFile(idx: number, patch: Partial<PlaygroundFile>) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function addFile() {
    setFiles((prev) => [...prev, { name: `file-${prev.length + 1}.txt`, content: "" }]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleShare() {
    setError(null);
    setShareUrl(null);
    setCopied(false);
    setBusy(true);
    try {
      const playground: Playground = {
        v: 1,
        title: title.trim() || "Untitled playground",
        files: files.map((f) => ({ name: f.name.trim() || "untitled", content: f.content })),
        note: note.trim() || undefined,
        createdAt: Date.now(),
      };

      let fragment: string;
      if (password) {
        const blob = await encryptPlayground(playground, password);
        fragment = encodeEncrypted(blob);
      } else {
        fragment = encodePlaintext(playground);
      }
      const url = buildShareUrl(window.location.origin, fragment);

      if (url.length > 14_000) {
        throw new Error(
          `Bundle too large for a URL (${url.length} chars). Trim files or split into multiple playgrounds.`
        );
      }

      setShareUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <section className="panel">
        <h2>Bundle</h2>
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>
        <input
          placeholder="Optional note for the recipient"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <section className="panel">
        <div className="row spread" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Files</h2>
          <span className="muted">{totalChars.toLocaleString()} chars</span>
        </div>
        {files.map((file, idx) => (
          <div className="file" key={idx}>
            <div className="file-head">
              <input
                value={file.name}
                onChange={(e) => updateFile(idx, { name: e.target.value })}
                spellCheck={false}
              />
              <button
                className="ghost danger"
                onClick={() => removeFile(idx)}
                disabled={files.length === 1}
                title={files.length === 1 ? "Keep at least one file" : "Remove file"}
              >
                Remove
              </button>
            </div>
            <textarea
              value={file.content}
              onChange={(e) => updateFile(idx, { content: e.target.value })}
              spellCheck={false}
            />
          </div>
        ))}
        <button onClick={addFile}>+ Add file</button>
      </section>

      <section className="panel">
        <h2>Share</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Set a password to encrypt the bundle in your browser. Without it, the link is public —
          but still never touches our server.
        </p>
        <div className="row" style={{ gap: 10 }}>
          <input
            type="password"
            placeholder="Optional password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="primary" onClick={handleShare} disabled={busy}>
            {busy ? "Building…" : "Generate link"}
          </button>
        </div>

        {error && (
          <div className="banner error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        {shareUrl && (
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className={password ? "tag ok" : "tag"}>
                {password ? "encrypted" : "public link"}
              </span>
              <span className="muted">{shareUrl.length.toLocaleString()} chars</span>
            </div>
            <div className="share-box">
              <input value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
              <button className="primary" onClick={copyShareUrl}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
