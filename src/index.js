import versionInfo from "../version.json" with { type: "json" };
import { JsEntitiesRow } from "./js-entities-row.js";

const ELEMENT_NAME = "js-entities-row";

if (!customElements.get(ELEMENT_NAME)) {
  customElements.define(ELEMENT_NAME, JsEntitiesRow);
}

console.info(
  `%cJS Entities Row ${versionInfo.version}`,
  "color: var(--primary-color); font-weight: bold;",
);
