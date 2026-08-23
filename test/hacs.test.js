import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HACS manifest points to the committed dashboard bundle", async () => {
  const manifest = JSON.parse(await readFile("hacs.json", "utf8"));
  const bundle = await readFile(`dist/${manifest.filename}`, "utf8");

  assert.equal(manifest.name, "JS Entities Row");
  assert.equal(manifest.content_in_root, false);
  assert.equal(manifest.filename, "js-entities-row.js");
  assert.match(bundle, /customElements\.define/);
  assert.match(bundle, /js-entities-row/);
});
