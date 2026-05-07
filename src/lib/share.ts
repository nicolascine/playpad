import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Playground, Encrypted } from "./types";

const PLAINTEXT_PREFIX = "d=";
const ENCRYPTED_PREFIX = "e=";

export function encodePlaintext(playground: Playground): string {
  return PLAINTEXT_PREFIX + compressToEncodedURIComponent(JSON.stringify(playground));
}

export function encodeEncrypted(blob: Encrypted): string {
  return ENCRYPTED_PREFIX + compressToEncodedURIComponent(JSON.stringify(blob));
}

export type DecodedFragment =
  | { kind: "plaintext"; playground: Playground }
  | { kind: "encrypted"; blob: Encrypted }
  | { kind: "empty" }
  | { kind: "invalid"; reason: string };

export function decodeFragment(fragment: string): DecodedFragment {
  const hash = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!hash) return { kind: "empty" };

  if (hash.startsWith(PLAINTEXT_PREFIX)) {
    const raw = decompressFromEncodedURIComponent(hash.slice(PLAINTEXT_PREFIX.length));
    if (!raw) return { kind: "invalid", reason: "could not decompress link" };
    try {
      return { kind: "plaintext", playground: JSON.parse(raw) as Playground };
    } catch {
      return { kind: "invalid", reason: "link is not a valid playground" };
    }
  }

  if (hash.startsWith(ENCRYPTED_PREFIX)) {
    const raw = decompressFromEncodedURIComponent(hash.slice(ENCRYPTED_PREFIX.length));
    if (!raw) return { kind: "invalid", reason: "could not decompress encrypted link" };
    try {
      return { kind: "encrypted", blob: JSON.parse(raw) as Encrypted };
    } catch {
      return { kind: "invalid", reason: "link is not a valid encrypted bundle" };
    }
  }

  return { kind: "invalid", reason: "unknown link format" };
}

export function buildShareUrl(origin: string, fragmentPayload: string): string {
  return `${origin}/#${fragmentPayload}`;
}
