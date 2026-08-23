import { evaluateDeep } from "./template.js";

const ACTION_PROPERTY = Object.freeze({
  tap: "tap_action",
  hold: "hold_action",
  double_tap: "double_tap_action",
});

function defaultAction(action, hasEntity) {
  if (action === "tap") {
    return { action: hasEntity ? "more-info" : "none" };
  }
  return { action: "none" };
}

function parseDelay(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value !== "string") {
    return 0;
  }
  const match = value.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(ms|s)?$/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function actionConfig(config, action, context) {
  const property = ACTION_PROPERTY[action];
  return evaluateDeep(
    config[property] ?? defaultAction(action, Boolean(config.entity)),
    context,
  );
}

function confirmAction(config, configuredAction) {
  const confirmation = configuredAction?.confirmation ?? config.confirmation;
  if (!confirmation) {
    return true;
  }
  const message =
    typeof confirmation === "string"
      ? confirmation
      : confirmation.text ?? "Are you sure?";
  return globalThis.confirm?.(message) ?? true;
}

function fireHassAction(host, config, action, configuredAction) {
  const event = new Event("hass-action", { bubbles: true, composed: true });
  event.detail = {
    config: {
      ...config,
      [ACTION_PROPERTY[action]]: configuredAction,
    },
    action,
  };
  host.dispatchEvent(event);
}

async function runService(hass, configuredAction) {
  const serviceName = configuredAction.perform_action ?? configuredAction.service;
  if (!serviceName || !hass?.callService || !serviceName.includes(".")) {
    console.warn("[js-entities-row] Invalid service action:", configuredAction);
    return;
  }
  const [domain, service] = serviceName.split(".", 2);
  await hass.callService(
    domain,
    service,
    configuredAction.data ?? configuredAction.service_data ?? {},
    configuredAction.target,
  );
}

async function runStep(host, hass, config, context, configuredAction) {
  if (!configuredAction || configuredAction.action === "none") {
    return;
  }
  if (Object.hasOwn(configuredAction, "delay")) {
    await delay(parseDelay(configuredAction.delay));
    return;
  }
  if (["multi-action", "multi-actions"].includes(configuredAction.action)) {
    for (const step of configuredAction.actions ?? configuredAction.sequence ?? []) {
      await runStep(host, hass, config, context, evaluateDeep(step, context));
    }
    return;
  }
  if (["perform-action", "call-service", "call_service"].includes(configuredAction.action)) {
    await runService(hass, configuredAction);
    return;
  }
  fireHassAction(host, config, "tap", configuredAction);
}

export async function runConfiguredAction(host, hass, config, context, action) {
  const configuredAction = actionConfig(config, action, context);
  if (!configuredAction || configuredAction.action === "none") {
    return;
  }
  if (!confirmAction(config, configuredAction)) {
    return;
  }
  if (["multi-action", "multi-actions"].includes(configuredAction?.action)) {
    await runStep(host, hass, config, context, configuredAction);
    return;
  }
  if (["perform-action", "call-service", "call_service"].includes(configuredAction?.action)) {
    await runService(hass, configuredAction);
    return;
  }
  fireHassAction(host, config, action, configuredAction);
}
