import assert from "node:assert/strict";
import test from "node:test";

import { createRowModel } from "../src/model.js";

const entity = {
  entity_id: "sensor.example",
  state: "4",
  last_changed: "2026-08-23T00:00:00Z",
  last_updated: "2026-08-23T00:05:00Z",
  attributes: {
    friendly_name: "Example sensor",
    icon: "mdi:counter",
    unit_of_measurement: "visitors",
    brightness: 128,
  },
};

const hass = {
  states: { [entity.entity_id]: entity },
  locale: { language: "en" },
  formatEntityState() {
    return "4 visitors";
  },
};

test("uses native entity values by default", () => {
  const model = createRowModel({ entity: entity.entity_id }, hass);

  assert.equal(model.name, "Example sensor");
  assert.equal(model.state, "4 visitors");
  assert.equal(model.icon, "mdi:counter");
  assert.equal(model.showRow, true);
});

test("templates can customize row values and visibility", () => {
  const model = createRowModel(
    {
      entity: entity.entity_id,
      name: '[[[ return `Count: ${entity.state}`; ]]]',
      state: "[[[ return Number(entity.state) * 2; ]]]",
      color: "[[[ return Number(entity.state) > 3 ? 'green' : 'red'; ]]]",
      show_row: "[[[ return entity.state !== '0'; ]]]",
    },
    hass,
  );

  assert.equal(model.name, "Count: 4");
  assert.equal(model.state, "8");
  assert.equal(model.color, "green");
  assert.equal(model.showRow, true);
});

test("entity metadata is never evaluated as a JavaScript template", () => {
  globalThis.entityMetadataTemplateExecuted = false;
  const metadataTemplate =
    "[[[ globalThis.entityMetadataTemplateExecuted = true; return 'unsafe'; ]]]";
  const metadataEntity = {
    ...entity,
    attributes: {
      ...entity.attributes,
      friendly_name: metadataTemplate,
      icon: metadataTemplate,
      entity_picture: metadataTemplate,
    },
  };
  const metadataHass = {
    ...hass,
    states: { [metadataEntity.entity_id]: metadataEntity },
  };

  const model = createRowModel({ entity: metadataEntity.entity_id }, metadataHass);

  assert.equal(globalThis.entityMetadataTemplateExecuted, false);
  assert.equal(model.name, metadataTemplate);
  assert.equal(model.icon, metadataTemplate);
  assert.equal(model.image, metadataTemplate);
  delete globalThis.entityMetadataTemplateExecuted;
});

test("show_unit and native secondary information are supported", () => {
  const model = createRowModel(
    {
      entity: entity.entity_id,
      show_unit: false,
      secondary_info: "brightness",
    },
    hass,
  );

  assert.equal(model.state, "4");
  assert.equal(model.secondaryInfo, "50%");
});
