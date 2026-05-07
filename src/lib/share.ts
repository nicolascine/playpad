import pako from "pako";
import type { Playground } from "./types";
import { encryptBytes, decryptBytes, SALT_BYTES, IV_BYTES } from "./crypto";

const PLAINTEXT_PREFIX = "d=";
const ENCRYPTED_PREFIX = "e=";

function base64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function compress(json: string): Uint8Array {
  return pako.deflateRaw(json, { level: 9 });
}

function decompress(bytes: Uint8Array): string {
  return pako.inflateRaw(bytes, { to: "string" });
}

export function encodePlaintext(playground: Playground): string {
  const compressed = compress(JSON.stringify(playground));
  return PLAINTEXT_PREFIX + base64urlEncode(compressed);
}

export async function encodeEncrypted(playground: Playground, password: string): Promise<string> {
  const compressed = compress(JSON.stringify(playground));
  const { salt, iv, ct } = await encryptBytes(compressed, password);

  const packed = new Uint8Array(salt.length + iv.length + ct.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(ct, salt.length + iv.length);

  return ENCRYPTED_PREFIX + base64urlEncode(packed);
}

export type DecodedFragment =
  | { kind: "plaintext"; playground: Playground }
  | { kind: "encrypted"; salt: Uint8Array; iv: Uint8Array; ct: Uint8Array }
  | { kind: "empty" }
  | { kind: "invalid"; reason: string };

export function decodeFragment(fragment: string): DecodedFragment {
  const hash = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!hash) return { kind: "empty" };

  if (hash.startsWith(PLAINTEXT_PREFIX)) {
    try {
      const compressed = base64urlDecode(hash.slice(PLAINTEXT_PREFIX.length));
      const json = decompress(compressed);
      return { kind: "plaintext", playground: JSON.parse(json) as Playground };
    } catch {
      return { kind: "invalid", reason: "could not decode link" };
    }
  }

  if (hash.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const packed = base64urlDecode(hash.slice(ENCRYPTED_PREFIX.length));
      if (packed.length < SALT_BYTES + IV_BYTES + 1) {
        return { kind: "invalid", reason: "encrypted link is too short" };
      }
      const salt = packed.slice(0, SALT_BYTES);
      const iv = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
      const ct = packed.slice(SALT_BYTES + IV_BYTES);
      return { kind: "encrypted", salt, iv, ct };
    } catch {
      return { kind: "invalid", reason: "could not decode encrypted link" };
    }
  }

  return { kind: "invalid", reason: "unknown link format" };
}

export async function decryptFragment(
  salt: Uint8Array,
  iv: Uint8Array,
  ct: Uint8Array,
  password: string
): Promise<Playground> {
  const compressed = await decryptBytes(salt, iv, ct, password);
  const json = decompress(compressed);
  return JSON.parse(json) as Playground;
}

export function buildShareUrl(origin: string, fragmentPayload: string): string {
  return `${origin}/#${fragmentPayload}`;
}
