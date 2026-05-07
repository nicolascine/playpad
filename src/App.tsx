import { useEffect, useState } from "react";
import { decodeFragment, type DecodedFragment } from "./lib/share";
import { Editor } from "./components/Editor";
import { Viewer } from "./components/Viewer";

export function App() {
  const [decoded, setDecoded] = useState<DecodedFragment>(() =>
    decodeFragment(window.location.hash)
  );

  useEffect(() => {
    function onHash() {
      setDecoded(decodeFragment(window.location.hash));
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="app">
      <header className="brand">
        <div>
          <div className="brand-name">Playpad</div>
          <div className="brand-tag">Share AI-coding playgrounds via a link.</div>
        </div>
        <a className="muted" href="https://github.com" target="_blank" rel="noreferrer">
          source
        </a>
      </header>

      {decoded.kind === "empty" && <Editor />}
      {decoded.kind === "invalid" && (
        <section className="panel">
          <div className="banner error">Invalid link: {decoded.reason}</div>
          <Editor />
        </section>
      )}
      {decoded.kind === "plaintext" && <Viewer kind="plaintext" playground={decoded.playground} />}
      {decoded.kind === "encrypted" && <Viewer kind="encrypted" blob={decoded.blob} />}

      <footer>
        Stateless · End-to-end encrypted · No accounts · No tracking
      </footer>
    </div>
  );
}
