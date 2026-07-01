import { css, html, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("media-manager-dashboard")
export class MediaManagerDashboardElement extends UmbLitElement {
  override render() {
    return html`
      <uui-box headline="Media Manager">
        <p>
          Scan your media library for orphaned media nodes and orphaned physical files.
          The dashboard UI is added in a later phase.
        </p>
      </uui-box>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }
    `,
  ];
}

export default MediaManagerDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "media-manager-dashboard": MediaManagerDashboardElement;
  }
}
