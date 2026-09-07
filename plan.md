# Building plan
Based on: [lovelace template entity row](https://github.com/thomasloven/lovelace-template-entity-row)

## Template entity row structure
| Parameter | Type | Description |
|---|---|---|
| `icon` | string | - |
| `name` | string | - |
| `state` | string | - |
| `secondary` | string | - |
| `image` | string | - |
| `active` | boolean | if this evaluates to "true" or "false", the icon gets will always look active or inactive respectively |
| `entity` | entity | if this evaluates to an entity id, `icon`, `name`, `state` and `image` will be taken from that entity unless manually overridden. Specifying an entity will also let you use action |
| `condition` | boolean | if this is set but does not evaluate to "true", the row is not displayed |
| `toggle` | boolean | if this evaluates to "true" a toggle is shown instead of the state. The toggle is connected to the `entity`. This will only show a toggle, nothing else. No sliders, no dropdowns, no media controls. `toggle` means Toggle.
| `tap_action` | action | can be templated if the template evaluates to a valid action configuration in python format. Standard YAML without templates works too. |
| `hold_action` | action | can be templated if the template evaluates to a valid action configuration in python format. Standard YAML without templates works too. |
| `double_tap_action` | action | can be templated if the template evaluates to a valid action configuration in python format. Standard YAML without templates works too. |
| `color` | string | the CSS color of the icon |

## My structure
| Parameter | Required | Type | JS | Standard | Standard if entity is defined | Description |
|---|---|---|---|---|---|---|
| `entity` | no | entity | no | - | - | - |
| `name` | no | string | yes | Row | Entity's name | - |
| `icon` | no | string | yes | mdi:ab-testing | Entity's icon | - |
| `state` | no | string | yes | - | Entity state | - |
| `secondary` | no | string | yes | - | - | - |
| `image` | | | | | | ChatGPT help |
| `active` | no | boolean | yes | - | Overwritten by entity | If entity switches between active and inactive, this will overwrite this parameter |
| `condition` | no | boolean | yes | true | true | if this evaluates to "true" or "false", the icon gets will always look active or inactive respectively |
| `tap_action` | no | action | yes | none | more-info | Tap on name |
| `hold_action` | no | action | yes | none | none | Hold on name |
| `double_tap_action` | no | action | yes | none | none | Double tap on name |
| ~~`toggle`~~ | | | | | | Comes in a future update |

### In the future
`state` can be action button, toggle or string, in that order and prioritation. But as three different parameters.

| Parameter | Type | Description |
|---|---|---|
| `button_text` | string / JS | If parameter is defined, the state will be an action button with this text |
| `toggle` | boolean | If this is true, then a toggle is shown |
| `state` | string / JS | As shown in table over |

With these parameters comes actions:
| Parameter | Type |
|---|---|
| `toggle_action` | action / JS |
| `button_action` | action / JS |

All actions (tap, hold, double tap, toggle and button) shall be able to use multi-actions (as in "Custom card")
