const TEMPLATE_REGEX = /^\s*\[\[\[\s*([\s\S]*?)\s*\]\]\]\s*$/;

function createTemplateHelpers(states) {
  return {
    state: (entityId) => states[entityId]?.state,
    attr: (entityId, attribute) => states[entityId]?.attributes?.[attribute],
    hasEntity: (entityId) => Boolean(states[entityId]),
  };
}

export function evaluateTemplate(value, { config, hass, stateObject }) {
  if (typeof value !== "string") {
    return value;
  }

  const match = value.match(TEMPLATE_REGEX);
  if (!match) {
    return value;
  }

  const states = hass?.states ?? {};
  const helpers = createTemplateHelpers(states);

  try {
    return Function(
      "hass",
      "entity",
      "states",
      "config",
      "user",
      "helpers",
      `"use strict";\n${match[1]}`,
    )(hass, stateObject, states, config, hass?.user, helpers);
  } catch (error) {
    console.error("[js-entities-row] Template error:", error, value);
    return "Template error";
  }
}

export function evaluateDeep(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => evaluateDeep(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        evaluateDeep(item, context),
      ]),
    );
  }

  return evaluateTemplate(value, context);
}

export function readBoolean(value, fallback, context, optionName) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const evaluated = evaluateTemplate(value, context);
  if (typeof evaluated === "boolean") {
    return evaluated;
  }

  console.warn(
    `[js-entities-row] ${optionName} must be a boolean or a JavaScript template that returns a boolean.`,
  );
  return fallback;
}
