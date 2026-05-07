#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import pako from "pako";

const ORIGIN = process.env.ORIGIN || "https://playpad-f3h.pages.dev";

function base64url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/build-share.mjs <file-or-dir>");
  console.error("Env: TITLE, NOTE, ORIGIN");
  process.exit(1);
}

const stats = statSync(target);
const files = stats.isFile()
  ? [{ name: basename(target), content: readFileSync(target, "utf8") }]
  : readdirSync(target)
      .filter((f) => statSync(join(target, f)).isFile())
      .map((f) => ({ name: f, content: readFileSync(join(target, f), "utf8") }));

const playground = {
  v: 1,
  title: process.env.TITLE || basename(target),
  files,
  note: process.env.NOTE || undefined,
  createdAt: Date.now(),
};

const compressed = pako.deflateRaw(JSON.stringify(playground), { level: 9 });
const url = `${ORIGIN}/#d=${base64url(compressed)}`;

const totalChars = files.reduce((n, f) => n + f.name.length + f.content.length, 0);
console.error(`source chars:   ${totalChars.toLocaleString()}`);
console.error(`compressed:     ${compressed.length.toLocaleString()} bytes`);
console.error(`url length:     ${url.length.toLocaleString()} chars`);
console.error(`compression:    ${((1 - compressed.length / totalChars) * 100).toFixed(1)}%`);
console.error("");
console.log(url);
