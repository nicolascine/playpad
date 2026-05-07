const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
const KEY_BITS = 256;

const enc = new TextEncoder();

function normalizePassword(password: string): string {
  return password.normalize("NFC");
}

function randomBytes(n: number): Uint8Array {
  const buf = new ArrayBuffer(n);
  crypto.getRandomValues(new Uint8Array(buf));
  return new Uint8Array(buf);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const normalized = normalizePassword(password);
  const passBuf = new ArrayBuffer(normalized.length * 4);
  const written = enc.encodeInto(normalized, new Uint8Array(passBuf));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passBuf.slice(0, written.written),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const saltCopy = new ArrayBuffer(salt.length);
  new Uint8Array(saltCopy).set(salt);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltCopy, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptBytes(
  data: Uint8Array,
  password: string
): Promise<{ salt: Uint8Array; iv: Uint8Array; ct: Uint8Array }> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(password, salt);

  const dataCopy = new ArrayBuffer(data.length);
  new Uint8Array(dataCopy).set(data);
  const ivCopy = new ArrayBuffer(iv.length);
  new Uint8Array(ivCopy).set(iv);

  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivCopy }, key, dataCopy);
  return { salt, iv, ct: new Uint8Array(ctBuf) };
}

export async function decryptBytes(
  salt: Uint8Array,
  iv: Uint8Array,
  ct: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const key = await deriveKey(password, salt);
  const ivCopy = new ArrayBuffer(iv.length);
  new Uint8Array(ivCopy).set(iv);
  const ctCopy = new ArrayBuffer(ct.length);
  new Uint8Array(ctCopy).set(ct);
  const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivCopy }, key, ctCopy);
  return new Uint8Array(ptBuf);
}
