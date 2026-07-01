import {
  css,
  html,
  nothing,
  state,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { umbConfirmModal } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MediaManagerRepository } from "../../services/media-manager.repository.js";
import type {
  FileCandidate,
  MediaCandidate,
  ScanResult,
  ScanType,
} from "../../types.d.js";

interface Row {
  id: string;
  primary: string;
  secondary: string;
  sizeBytes: number;
}

const POLL_INTERVAL_MS = 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@customElement("media-manager-dashboard")
export class MediaManagerDashboardElement extends UmbLitElement {
  #repository = new MediaManagerRepository(this);
  #notification?: UmbNotificationContext;

  @state() private _scanning = false;
  @state() private _busy = false;
  @state() private _processed = 0;
  @state() private _scanType?: ScanType;
  @state() private _result?: ScanResult;
  @state() private _selected = new Set<string>();

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notification = context;
    });
  }

  async #scan(type: ScanType) {
    this._scanning = true;
    this._scanType = type;
    this._result = undefined;
    this._selected = new Set();
    this._processed = 0;

    try {
      const jobId = await this.#repository.startScan(type);

      while (true) {
        await sleep(POLL_INTERVAL_MS);
        const status = await this.#repository.getStatus(jobId);
        if (!status) {
          continue;
        }
        this._processed = status.processed;

        if (status.state === "Completed") {
          this._result = (await this.#repository.getResult(jobId)) ?? undefined;
          break;
        }
        if (status.state === "Failed" || status.state === "Cancelled") {
          this.#notification?.peek("danger", {
            data: { message: `Scan ${status.state}${status.error ? `: ${status.error}` : ""}` },
          });
          break;
        }
      }
    } catch (error) {
      this.#notification?.peek("danger", { data: { message: "Scan failed to start." } });
      console.error(error);
    } finally {
      this._scanning = false;
    }
  }

  get #rows(): Row[] {
    if (!this._result) {
      return [];
    }
    if (this._scanType === "OrphanedMedia") {
      return this._result.media.map((m: MediaCandidate) => ({
        id: m.key,
        primary: m.name,
        secondary: m.path ?? "",
        sizeBytes: m.sizeBytes,
      }));
    }
    return this._result.files.map((f: FileCandidate) => ({
      id: f.path,
      primary: f.path,
      secondary: "",
      sizeBytes: f.sizeBytes,
    }));
  }

  #toggle(id: string) {
    const next = new Set(this._selected);
    next.has(id) ? next.delete(id) : next.add(id);
    this._selected = next;
  }

  #toggleAll(rows: Row[]) {
    this._selected =
      this._selected.size === rows.length
        ? new Set()
        : new Set(rows.map((r) => r.id));
  }

  async #deleteSelected() {
    const ids = [...this._selected];
    if (ids.length === 0) {
      return;
    }

    const isMedia = this._scanType === "OrphanedMedia";
    await umbConfirmModal(this, {
      headline: `Delete ${ids.length} item(s)`,
      content: isMedia
        ? "The selected media will be moved to the Recycle Bin (recoverable)."
        : "The selected physical files will be permanently deleted. This cannot be undone.",
      color: "danger",
      confirmLabel: "Delete",
    });

    this._busy = true;
    try {
      const result = isMedia
        ? await this.#repository.deleteMedia(ids, false)
        : await this.#repository.deleteFiles(ids, false);

      const affected = result?.affected ?? 0;
      const errors = result?.errors ?? [];
      this.#notification?.peek(errors.length ? "warning" : "positive", {
        data: {
          message: `${affected} item(s) processed${errors.length ? `, ${errors.length} error(s)` : ""}.`,
        },
      });

      if (this._scanType) {
        await this.#scan(this._scanType);
      }
    } catch (error) {
      this.#notification?.peek("danger", { data: { message: "Delete failed." } });
      console.error(error);
    } finally {
      this._busy = false;
    }
  }

  #formatBytes(bytes: number): string {
    if (bytes <= 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }

  override render() {
    return html`
      <uui-box headline="Media Manager">
        <div class="actions">
          <uui-button
            look="primary"
            label="Scan orphaned media"
            .state=${this._scanning && this._scanType === "OrphanedMedia" ? "waiting" : undefined}
            ?disabled=${this._scanning || this._busy}
            @click=${() => this.#scan("OrphanedMedia")}
          ></uui-button>
          <uui-button
            look="primary"
            label="Scan orphaned files"
            .state=${this._scanning && this._scanType === "OrphanedFiles" ? "waiting" : undefined}
            ?disabled=${this._scanning || this._busy}
            @click=${() => this.#scan("OrphanedFiles")}
          ></uui-button>
        </div>

        ${this._scanning
          ? html`<div class="status"><uui-loader-circle></uui-loader-circle> Scanning… (${this._processed} processed)</div>`
          : nothing}
        ${this._result ? this.#renderResult() : nothing}
      </uui-box>
    `;
  }

  #renderResult() {
    const rows = this.#rows;
    return html`
      <div class="summary">
        <strong>${rows.length}</strong> orphaned ${this._scanType === "OrphanedMedia" ? "media item(s)" : "file(s)"} —
        reclaimable <strong>${this.#formatBytes(this._result?.reclaimableBytes ?? 0)}</strong>
      </div>

      ${rows.length === 0
        ? html`<p>Nothing to clean up. 🎉</p>`
        : html`
            <div class="toolbar">
              <uui-button
                look="secondary"
                color="danger"
                label="Delete selected (${this._selected.size})"
                ?disabled=${this._selected.size === 0 || this._busy}
                @click=${() => this.#deleteSelected()}
              ></uui-button>
            </div>
            <uui-table>
              <uui-table-head>
                <uui-table-head-cell style="width:40px">
                  <uui-checkbox
                    label="Select all"
                    ?checked=${this._selected.size === rows.length && rows.length > 0}
                    @change=${() => this.#toggleAll(rows)}
                  ></uui-checkbox>
                </uui-table-head-cell>
                <uui-table-head-cell>${this._scanType === "OrphanedMedia" ? "Name" : "Path"}</uui-table-head-cell>
                <uui-table-head-cell>${this._scanType === "OrphanedMedia" ? "Path" : ""}</uui-table-head-cell>
                <uui-table-head-cell style="width:120px">Size</uui-table-head-cell>
              </uui-table-head>
              ${rows.map(
                (row) => html`
                  <uui-table-row>
                    <uui-table-cell>
                      <uui-checkbox
                        label="Select"
                        ?checked=${this._selected.has(row.id)}
                        @change=${() => this.#toggle(row.id)}
                      ></uui-checkbox>
                    </uui-table-cell>
                    <uui-table-cell>${row.primary}</uui-table-cell>
                    <uui-table-cell>${row.secondary}</uui-table-cell>
                    <uui-table-cell>${this.#formatBytes(row.sizeBytes)}</uui-table-cell>
                  </uui-table-row>
                `,
              )}
            </uui-table>
          `}
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }
      .actions {
        display: flex;
        gap: var(--uui-size-space-3);
        margin-bottom: var(--uui-size-space-4);
      }
      .status,
      .summary,
      .toolbar {
        margin: var(--uui-size-space-4) 0;
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
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
