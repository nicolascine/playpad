import type { Encrypted, Playground } from "./types";

const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function randomBytes(n: number): ArrayBuffer {
  const buf = new ArrayBuffer(n);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const passBuf = new ArrayBuffer(password.length * 4);
  const written = enc.encodeInto(password, new Uint8Array(passBuf));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passBuf.slice(0, written.written),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPlayground(playground: Playground, password: string): Promise<Encrypted> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(password, salt);
  const json = JSON.stringify(playground);
  const ptBuf = new ArrayBuffer(json.length * 4);
  const { written } = enc.encodeInto(json, new Uint8Array(ptBuf));
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ptBuf.slice(0, written));
  return {
    v: 1,
    salt: toB64(new Uint8Array(salt)),
    iv: toB64(new Uint8Array(iv)),
    ct: toB64(new Uint8Array(ctBuf)),
  };
}

export async function decryptPlayground(blob: Encrypted, password: string): Promise<Playground> {
  const salt = fromB64(blob.salt);
  const iv = fromB64(blob.iv);
  const ct = fromB64(blob.ct);
  const key = await deriveKey(password, salt);
  const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(dec.decode(ptBuf)) as Playground;
}
