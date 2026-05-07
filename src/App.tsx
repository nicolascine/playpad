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
        <a
          className="brand-link"
          href="https://github.com/nicolascine/playpad"
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.68.8.56C20.21 21.39 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5Z"/>
          </svg>
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
      {decoded.kind === "encrypted" && (
        <Viewer kind="encrypted" salt={decoded.salt} iv={decoded.iv} ct={decoded.ct} />
      )}

      <footer>
        Stateless · End-to-end encrypted · No accounts · No tracking
      </footer>
    </div>
  );
}
