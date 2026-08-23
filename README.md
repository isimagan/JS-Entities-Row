# JS Entities Row

A customizable row for Home Assistant's Entities card with JavaScript template
support.

```yaml
type: entities
entities:
  - type: custom:js-entities-row
    entity: sensor.example
```

## Features

- Uses the entity name, formatted state, icon and picture automatically
- Supports JavaScript templates for row content, color and visibility
- Supports tap, hold and double-tap actions
- Supports action buttons and multi-action sequences
- Uses Home Assistant theme variables and native entity icons

## Installation

JS Entities Row is intentionally distributed only as a HACS custom repository.
It is not submitted to the default HACS catalog.

1. Open HACS.
2. Select the three-dot menu and **Custom repositories**.
3. Add `https://github.com/isimagan/JS-Entities-Row`.
4. Select **Dashboard** as the category.
5. Install **JS Entities Row**.
6. Refresh Home Assistant.

HACS normally adds the dashboard resource automatically. If it does not, add
`/hacsfiles/JS-Entities-Row/js-entities-row.js` as a JavaScript module under
**Settings → Dashboards → Resources**.

## Basic usage

```yaml
type: entities
entities:
  - type: custom:js-entities-row
    entity: light.living_room
```

## JavaScript templates

Templates use triple brackets and must return a value.

```yaml
type: entities
entities:
  - type: custom:js-entities-row
    entity: sensor.battery
    name: "[[[ return `${entity.attributes.friendly_name}`; ]]]"
    state: "[[[ return `${entity.state} %`; ]]]"
    icon: "[[[ return Number(entity.state) < 20 ? 'mdi:battery-alert' : 'mdi:battery'; ]]]"
    color: "[[[ return Number(entity.state) < 20 ? 'red' : 'green'; ]]]"
    show_row: "[[[ return entity.state !== 'unavailable'; ]]]"
```

Available variables:

- `entity` — the configured entity's state object
- `states` — all Home Assistant state objects
- `hass` — the Home Assistant frontend object
- `config` — this row's configuration
- `user` — the current Home Assistant user
- `helpers` — `state()`, `attr()` and `hasEntity()` helpers

JavaScript templates run in your browser. Only use templates you trust.

## Options

| Option | Default | Description | JavaScript |
| --- | --- | --- | :---: |
| `entity` | Required | Home Assistant entity ID | No |
| `name` | Entity name | Row name | Yes |
| `state` | Formatted state | State text override | Yes |
| `secondary_info` | Empty | Additional information or custom text | Yes |
| `icon` | Entity icon | Material Design icon | Yes |
| `image` | Entity picture | Picture URL | Yes |
| `color` | Theme color | `state`, `none`, CSS color or color token | Yes |
| `show_row` | `true` | Show or hide the entire row | Yes |
| `show_unit` | `true` | Include the unit in the default state | Yes |
| `time_format` | `relative` | Timestamp format and style | No |
| `action_name` | Empty | Show a button instead of the state | Yes |
| `tap_action` | `more-info` | Action when tapped | Yes, nested values |
| `hold_action` | `none` | Action when held | Yes, nested values |
| `double_tap_action` | `none` | Action when double-tapped | Yes, nested values |
| `confirmation` | Empty | Confirmation text or configuration | No |

`secondary_info` supports custom text and the Home Assistant-style values
`entity-id`, `last-changed`, `last-updated`, `area`, `last-triggered`,
`position`, `tilt-position` and `brightness`.

`time_format` accepts `relative`, `total`, `date`, `time` or `datetime`. It can
also use a map with `type` and `style` (`long` or `short`):

```yaml
secondary_info: last-updated
time_format:
  type: datetime
  style: short
```

## Actions

```yaml
type: entities
entities:
  - type: custom:js-entities-row
    entity: light.living_room
    tap_action:
      action: toggle
    hold_action:
      action: more-info
    double_tap_action:
      action: navigate
      navigation_path: /lovelace/lights
```

An action button can replace the state value:

```yaml
type: custom:js-entities-row
entity: script.good_night
action_name: Run
tap_action:
  action: perform-action
  perform_action: script.turn_on
  target:
    entity_id: script.good_night
confirmation:
  text: Run the good-night script?
```

## License

MIT
