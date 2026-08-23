// version.json
var version_default = {
  version: "1.0.0"
};

// src/template.js
var TEMPLATE_REGEX = /^\s*\[\[\[\s*([\s\S]*?)\s*\]\]\]\s*$/;
function createTemplateHelpers(states) {
  return {
    state: (entityId) => states[entityId]?.state,
    attr: (entityId, attribute) => states[entityId]?.attributes?.[attribute],
    hasEntity: (entityId) => Boolean(states[entityId])
  };
}
function evaluateTemplate(value, { config, hass, stateObject }) {
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
      `"use strict";
${match[1]}`
    )(hass, stateObject, states, config, hass?.user, helpers);
  } catch (error) {
    console.error("[js-entities-row] Template error:", error, value);
    return "Template error";
  }
}
function evaluateDeep(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => evaluateDeep(item, context));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        evaluateDeep(item, context)
      ])
    );
  }
  return evaluateTemplate(value, context);
}
function readBoolean(value, fallback, context, optionName) {
  if (value === void 0 || value === null) {
    return fallback;
  }
  const evaluated = evaluateTemplate(value, context);
  if (typeof evaluated === "boolean") {
    return evaluated;
  }
  console.warn(
    `[js-entities-row] ${optionName} must be a boolean or a JavaScript template that returns a boolean.`
  );
  return fallback;
}

// src/actions.js
var ACTION_PROPERTY = Object.freeze({
  tap: "tap_action",
  hold: "hold_action",
  double_tap: "double_tap_action"
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
  return Number(match[1]) * (match[2] === "s" ? 1e3 : 1);
}
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function actionConfig(config, action, context) {
  const property = ACTION_PROPERTY[action];
  return evaluateDeep(
    config[property] ?? defaultAction(action, Boolean(config.entity)),
    context
  );
}
function confirmAction(config, configuredAction) {
  const confirmation = configuredAction?.confirmation ?? config.confirmation;
  if (!confirmation) {
    return true;
  }
  const message = typeof confirmation === "string" ? confirmation : confirmation.text ?? "Are you sure?";
  return globalThis.confirm?.(message) ?? true;
}
function fireHassAction(host, config, action, configuredAction) {
  const event = new Event("hass-action", { bubbles: true, composed: true });
  event.detail = {
    config: {
      ...config,
      [ACTION_PROPERTY[action]]: configuredAction
    },
    action
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
    configuredAction.target
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
async function runConfiguredAction(host, hass, config, context, action) {
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

// src/model.js
function text(value) {
  if (value === void 0 || value === null || value === false) {
    return "";
  }
  return String(value);
}
function formatState(config, hass, stateObject, showUnit) {
  if (!stateObject) {
    return "Entity not found";
  }
  const unit = stateObject.attributes?.unit_of_measurement;
  if (!showUnit && unit) {
    return text(stateObject.state);
  }
  if (hass?.formatEntityState) {
    return hass.formatEntityState(stateObject);
  }
  return unit ? `${stateObject.state} ${unit}` : text(stateObject.state);
}
function parseDate(value) {
  if (!value) {
    return void 0;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? void 0 : date;
}
function timeFormat(config) {
  const setting = config.time_format;
  if (typeof setting === "string") {
    return { type: setting, style: "long" };
  }
  return {
    type: setting?.type ?? "relative",
    style: setting?.style ?? "long"
  };
}
function formatTime(value, config, hass) {
  const date = parseDate(value);
  if (!date) {
    return "";
  }
  const { type, style } = timeFormat(config);
  const locale = hass?.locale?.language ?? globalThis.navigator?.language ?? "en";
  const short = style === "short";
  if (type === "relative") {
    const seconds = Math.round((date.getTime() - Date.now()) / 1e3);
    const ranges = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [7, "day"],
      [4.345, "week"],
      [12, "month"],
      [Infinity, "year"]
    ];
    let valueInUnit = seconds;
    let unit = "second";
    for (const [limit, candidate] of ranges) {
      unit = candidate;
      if (Math.abs(valueInUnit) < limit) {
        break;
      }
      valueInUnit /= limit;
    }
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
      style: short ? "short" : "long"
    }).format(Math.round(valueInUnit), unit);
  }
  if (type === "date") {
    return new Intl.DateTimeFormat(locale, { dateStyle: short ? "short" : "long" }).format(date);
  }
  if (type === "time") {
    return new Intl.DateTimeFormat(locale, { timeStyle: short ? "short" : "medium" }).format(date);
  }
  if (type === "datetime") {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: short ? "short" : "medium",
      timeStyle: short ? "short" : "medium"
    }).format(date);
  }
  if (type === "total") {
    const totalSeconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1e3));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds % 86400 / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`].filter(Boolean).join(" ");
  }
  return date.toLocaleString(locale);
}
function secondaryInfo(config, hass, stateObject, read) {
  const setting = config.secondary_info;
  if (setting === void 0 || setting === null || setting === "") {
    return "";
  }
  const evaluated = read(setting);
  if (evaluated !== setting || typeof evaluated !== "string") {
    return text(evaluated);
  }
  switch (setting) {
    case "entity-id":
      return text(stateObject?.entity_id ?? config.entity);
    case "last-changed":
      return formatTime(stateObject?.last_changed, config, hass);
    case "last-updated":
      return formatTime(stateObject?.last_updated, config, hass);
    case "last-triggered":
      return formatTime(stateObject?.attributes?.last_triggered, config, hass);
    case "area":
      return text(
        stateObject?.attributes?.area_name ?? stateObject?.attributes?.area
      );
    case "position":
      return text(stateObject?.attributes?.current_position);
    case "tilt-position":
      return text(stateObject?.attributes?.current_tilt_position);
    case "brightness": {
      const brightness = stateObject?.attributes?.brightness;
      return brightness === void 0 ? "" : `${Math.round(Number(brightness) / 255 * 100)}%`;
    }
    default:
      return text(setting);
  }
}
function createRowModel(config, hass) {
  const stateObject = hass?.states?.[config.entity];
  const context = { config, hass, stateObject };
  const read = (value) => evaluateTemplate(value, context);
  const showUnit = readBoolean(config.show_unit, true, context, "show_unit");
  const configuredState = config.state;
  return {
    context,
    stateObject,
    showRow: readBoolean(config.show_row, true, context, "show_row"),
    name: text(
      read(
        config.name ?? stateObject?.attributes?.friendly_name ?? config.entity
      )
    ),
    state: text(
      configuredState === void 0 ? formatState(config, hass, stateObject, showUnit) : read(configuredState)
    ),
    secondaryInfo: secondaryInfo(config, hass, stateObject, read),
    icon: text(read(config.icon ?? stateObject?.attributes?.icon)),
    image: text(
      read(config.image ?? stateObject?.attributes?.entity_picture)
    ),
    color: text(read(config.color)),
    actionName: text(read(config.action_name))
  };
}

// src/styles.js
var ROW_STYLES = `
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none !important;
  }

  .row {
    display: flex;
    align-items: center;
    min-height: var(--paper-item-min-height, 48px);
    color: var(--primary-text-color);
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .row:focus-visible {
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: 0 0 0 2px var(--primary-color);
  }

  .visual {
    display: flex;
    flex: 0 0 40px;
    width: 40px;
    align-items: center;
    justify-content: flex-start;
  }

  ha-icon,
  ha-state-icon {
    --mdc-icon-size: 24px;
    color: var(--js-entities-row-icon-color, var(--state-icon-color));
  }

  .entity-picture {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }

  .info {
    min-width: 0;
    flex: 1 1 auto;
    padding: 8px 8px 8px 0;
  }

  .name,
  .secondary,
  .state {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    line-height: 20px;
  }

  .secondary {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 12px);
    line-height: 16px;
  }

  .state {
    flex: 0 0 auto;
    max-width: 45%;
    color: var(--secondary-text-color);
    text-align: right;
  }

  .action-button {
    flex: 0 0 auto;
    margin-inline-start: 8px;
    min-height: 32px;
    border: 0;
    border-radius: 16px;
    padding: 0 14px;
    background: var(--primary-color);
    color: var(--text-primary-color, white);
    font: inherit;
    cursor: pointer;
  }
`;

// src/js-entities-row.js
var HOLD_DELAY = 500;
var DOUBLE_TAP_DELAY = 250;
var JsEntitiesRow = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = void 0;
    this._hass = void 0;
    this._holdTimer = void 0;
    this._tapTimer = void 0;
    this._holdTriggered = false;
  }
  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("JS Entities Row requires a configuration object.");
    }
    if (!config.entity) {
      throw new Error("JS Entities Row requires an entity.");
    }
    this._config = config;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  get hass() {
    return this._hass;
  }
  connectedCallback() {
    this._render();
  }
  _run(action) {
    if (!this._config || !this._model) {
      return;
    }
    void runConfiguredAction(
      this,
      this._hass,
      this._config,
      this._model.context,
      action
    ).catch((error) => {
      console.error(`[js-entities-row] ${action} action failed:`, error);
    });
  }
  _bindInteractions(row, button) {
    row.addEventListener("pointerdown", () => {
      clearTimeout(this._holdTimer);
      this._holdTriggered = false;
      this._holdTimer = setTimeout(() => {
        this._holdTriggered = true;
        this._run("hold");
      }, HOLD_DELAY);
    });
    const cancelHold = () => clearTimeout(this._holdTimer);
    row.addEventListener("pointerup", cancelHold);
    row.addEventListener("pointerleave", cancelHold);
    row.addEventListener("pointercancel", cancelHold);
    row.addEventListener("click", (event) => {
      if (event.target === button || this._holdTriggered) {
        event.preventDefault();
        return;
      }
      clearTimeout(this._tapTimer);
      this._tapTimer = setTimeout(() => this._run("tap"), DOUBLE_TAP_DELAY);
    });
    row.addEventListener("dblclick", (event) => {
      if (event.target === button) {
        return;
      }
      event.preventDefault();
      clearTimeout(this._tapTimer);
      this._run("double_tap");
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._run("tap");
      }
    });
    button?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._run("tap");
    });
    button?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  }
  _appendVisual(container, model) {
    if (model.image) {
      const image = document.createElement("img");
      image.className = "entity-picture";
      image.src = model.image;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      container.appendChild(image);
      return;
    }
    if (model.icon) {
      const icon = document.createElement("ha-icon");
      icon.icon = model.icon;
      container.appendChild(icon);
      return;
    }
    if (model.stateObject) {
      const icon = document.createElement("ha-state-icon");
      icon.hass = this._hass;
      icon.stateObj = model.stateObject;
      container.appendChild(icon);
    }
  }
  _render() {
    if (!this.shadowRoot || !this._config) {
      return;
    }
    const model = createRowModel(this._config, this._hass);
    this._model = model;
    this.hidden = !model.showRow;
    if (!model.showRow) {
      this.shadowRoot.replaceChildren();
      return;
    }
    this.shadowRoot.innerHTML = `
      <style>${ROW_STYLES}</style>
      <div class="row" role="button" tabindex="0">
        <div class="visual" aria-hidden="true"></div>
        <div class="info">
          <div class="name"></div>
          <div class="secondary"></div>
        </div>
        <div class="state"></div>
      </div>
    `;
    const row = this.shadowRoot.querySelector(".row");
    const visual = this.shadowRoot.querySelector(".visual");
    const name = this.shadowRoot.querySelector(".name");
    const secondary = this.shadowRoot.querySelector(".secondary");
    const state = this.shadowRoot.querySelector(".state");
    name.textContent = model.name;
    secondary.textContent = model.secondaryInfo;
    secondary.hidden = !model.secondaryInfo;
    state.textContent = model.state;
    this._appendVisual(visual, model);
    if (model.color && model.color !== "state" && model.color !== "none") {
      row.style.setProperty("--js-entities-row-icon-color", model.color);
    }
    if (model.color === "none") {
      row.style.setProperty("--js-entities-row-icon-color", "var(--state-icon-color)");
    }
    let button;
    if (model.actionName) {
      state.remove();
      button = document.createElement("button");
      button.className = "action-button";
      button.type = "button";
      button.textContent = model.actionName;
      row.appendChild(button);
    }
    row.setAttribute(
      "aria-label",
      [model.name, model.state].filter(Boolean).join(": ")
    );
    this._bindInteractions(row, button);
  }
  static getStubConfig() {
    return { entity: "sun.sun" };
  }
};

// src/index.js
var ELEMENT_NAME = "js-entities-row";
if (!customElements.get(ELEMENT_NAME)) {
  customElements.define(ELEMENT_NAME, JsEntitiesRow);
}
console.info(
  `%cJS Entities Row ${version_default.version}`,
  "color: var(--primary-color); font-weight: bold;"
);
