import { useState } from "react";
import type { Encrypted, Playground } from "../lib/types";
import { decryptPlayground } from "../lib/crypto";

type Props =
  | { kind: "plaintext"; playground: Playground }
  | { kind: "encrypted"; blob: Encrypted };

export function Viewer(props: Props) {
  if (props.kind === "encrypted") {
    return <EncryptedViewer blob={props.blob} />;
  }
  return <PlaygroundView playground={props.playground} encrypted={false} />;
}

function EncryptedViewer({ blob }: { blob: Encrypted }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState<Playground | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const pg = await decryptPlayground(blob, password);
      setUnlocked(pg);
    } catch {
      setError("Wrong password, or the link is corrupted.");
    } finally {
      setBusy(false);
    }
  }

  if (unlocked) return <PlaygroundView playground={unlocked} encrypted />;

  return (
    <section className="panel">
      <h2>Encrypted playground</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        This bundle is password-protected. Decryption happens in your browser.
      </p>
      <form className="row" onSubmit={unlock} style={{ gap: 10 }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{ flex: 1, minWidth: 220 }}
        />
        <button type="submit" className="primary" disabled={busy || !password}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
      {error && (
        <div className="banner error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </section>
  );
}

function PlaygroundView({ playground, encrypted }: { playground: Playground; encrypted: boolean }) {
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
            <span className="tag">{playground.files.length} files</span>
            <button onClick={fork}>New playground</button>
          </div>
        </div>
      </section>

      {playground.files.map((file, idx) => (
        <section className="panel viewer-file" key={idx}>
          <div className="row spread" style={{ marginBottom: 10 }}>
            <code style={{ fontSize: 13 }}>{file.name}</code>
            <button onClick={() => copyFile(file.content)}>Copy</button>
          </div>
          <pre>{file.content}</pre>
        </section>
      ))}
    </>
  );
}
