import { useMemo, useRef, useState } from "react";
import type { Playground, PlaygroundFile } from "../lib/types";
import { encodeEncrypted, encodePlaintext, buildShareUrl } from "../lib/share";
import { encryptPlayground } from "../lib/crypto";

const MAX_FILE_BYTES = 256 * 1024;
const URL_HARD_LIMIT = 60_000;
const URL_WARN_LIMIT = 8_000;

export function Editor() {
  const [title, setTitle] = useState("Untitled playground");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PlaygroundFile[]>([]);
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalChars = useMemo(
    () => files.reduce((n, f) => n + f.name.length + f.content.length, 0),
    [files]
  );

  function updateFile(idx: number, patch: Partial<PlaygroundFile>) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function addBlankFile() {
    setFiles((prev) => [
      ...prev,
      { name: prev.length === 0 ? "CLAUDE.md" : `file-${prev.length + 1}.txt`, content: "" },
    ]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function ingestFileList(list: FileList | File[]) {
    const arr = Array.from(list);
    const next: PlaygroundFile[] = [];
    const skipped: string[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_BYTES) {
        skipped.push(`${f.name} (too large)`);
        continue;
      }
      try {
        const content = await f.text();
        const relPath = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
        next.push({ name: relPath, content });
      } catch {
        skipped.push(`${f.name} (could not read)`);
      }
    }
    if (next.length > 0) setFiles((prev) => [...prev, ...next]);
    if (skipped.length > 0) {
      setError(`Skipped: ${skipped.join(", ")}`);
    } else {
      setError(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) {
      void ingestFileList(e.dataTransfer.files);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target) setDragging(false);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void ingestFileList(e.target.files);
    e.target.value = "";
  }

  async function handleShare() {
    setError(null);
    setWarning(null);
    setShareUrl(null);
    setCopied(false);

    if (files.length === 0) {
      setError("Add at least one file before sharing.");
      return;
    }

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

      if (url.length > URL_HARD_LIMIT) {
        throw new Error(
          `Bundle is ${url.length.toLocaleString()} chars, past the safe browser ceiling of ${URL_HARD_LIMIT.toLocaleString()}. Trim files or split into multiple playgrounds.`
        );
      }

      if (url.length > URL_WARN_LIMIT) {
        setWarning(
          `Long link (${url.length.toLocaleString()} chars). Browsers handle it fine, but some chat apps and email clients may truncate URLs over ~8,000 chars. Test before sharing widely.`
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
          <span className="muted">
            {files.length} file{files.length === 1 ? "" : "s"} · {totalChars.toLocaleString()} chars
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={onPickFiles}
        />

        <div
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          {files.length === 0 ? (
            <div className="dropzone-empty">
              <h3>Drop files to start</h3>
              <p>Or pick files from disk, or create one from scratch.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button onClick={openFilePicker}>Choose files</button>
                <button className="primary" onClick={addBlankFile}>
                  + New file
                </button>
              </div>
            </div>
          ) : (
            <div className="dropzone-list">
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
                      title="Remove file"
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
              <div className="row" style={{ marginTop: 4 }}>
                <button onClick={addBlankFile}>+ New file</button>
                <button onClick={openFilePicker}>Add from disk</button>
                <span className="muted" style={{ marginLeft: "auto" }}>
                  Or drop more files anywhere here
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Share</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Set a password to encrypt the bundle in your browser. Without one, the link is
          public, but still never touches a server.
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

        {warning && !error && (
          <div className="banner warn" style={{ marginTop: 12 }}>
            {warning}
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
