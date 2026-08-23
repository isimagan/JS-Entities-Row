import { runConfiguredAction } from "./actions.js";
import { createRowModel } from "./model.js";
import { ROW_STYLES } from "./styles.js";

const HOLD_DELAY = 500;
const DOUBLE_TAP_DELAY = 250;

export class JsEntitiesRow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = undefined;
    this._hass = undefined;
    this._holdTimer = undefined;
    this._tapTimer = undefined;
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
      action,
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
      [model.name, model.state].filter(Boolean).join(": "),
    );
    this._bindInteractions(row, button);
  }

  static getStubConfig() {
    return { entity: "sun.sun" };
  }
}
