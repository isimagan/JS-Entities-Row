import { evaluateTemplate, readBoolean } from "./template.js";

function text(value) {
  if (value === undefined || value === null || value === false) {
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
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function timeFormat(config) {
  const setting = config.time_format;
  if (typeof setting === "string") {
    return { type: setting, style: "long" };
  }
  return {
    type: setting?.type ?? "relative",
    style: setting?.style ?? "long",
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
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const ranges = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [7, "day"],
      [4.345, "week"],
      [12, "month"],
      [Infinity, "year"],
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
      style: short ? "short" : "long",
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
      timeStyle: short ? "short" : "medium",
    }).format(date);
  }
  if (type === "total") {
    const totalSeconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`]
      .filter(Boolean)
      .join(" ");
  }

  return date.toLocaleString(locale);
}

function secondaryInfo(config, hass, stateObject, read) {
  const setting = config.secondary_info;
  if (setting === undefined || setting === null || setting === "") {
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
        stateObject?.attributes?.area_name ?? stateObject?.attributes?.area,
      );
    case "position":
      return text(stateObject?.attributes?.current_position);
    case "tilt-position":
      return text(stateObject?.attributes?.current_tilt_position);
    case "brightness": {
      const brightness = stateObject?.attributes?.brightness;
      return brightness === undefined
        ? ""
        : `${Math.round((Number(brightness) / 255) * 100)}%`;
    }
    default:
      return text(setting);
  }
}

export function createRowModel(config, hass) {
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
        config.name ??
          stateObject?.attributes?.friendly_name ??
          config.entity,
      ),
    ),
    state: text(
      configuredState === undefined
        ? formatState(config, hass, stateObject, showUnit)
        : read(configuredState),
    ),
    secondaryInfo: secondaryInfo(config, hass, stateObject, read),
    icon: text(read(config.icon ?? stateObject?.attributes?.icon)),
    image: text(
      read(config.image ?? stateObject?.attributes?.entity_picture),
    ),
    color: text(read(config.color)),
    actionName: text(read(config.action_name)),
  };
}
