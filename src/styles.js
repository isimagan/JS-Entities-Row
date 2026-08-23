export const ROW_STYLES = `
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
