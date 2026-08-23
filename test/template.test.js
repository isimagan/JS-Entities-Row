import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDeep, evaluateTemplate } from "../src/template.js";

const entity = { entity_id: "sensor.example", state: "ready", attributes: {} };
const hass = { states: { [entity.entity_id]: entity }, user: { name: "Ada" } };
const context = { config: { entity: entity.entity_id }, hass, stateObject: entity };

test("evaluates JavaScript templates with Home Assistant context", () => {
  assert.equal(
    evaluateTemplate("[[[ return `${user.name}: ${entity.state}`; ]]]", context),
    "Ada: ready",
  );
});

test("evaluates nested action data", () => {
  assert.deepEqual(
    evaluateDeep(
      {
        action: "perform-action",
        data: { value: "[[[ return entity.state; ]]]" },
      },
      context,
    ),
    { action: "perform-action", data: { value: "ready" } },
  );
});
