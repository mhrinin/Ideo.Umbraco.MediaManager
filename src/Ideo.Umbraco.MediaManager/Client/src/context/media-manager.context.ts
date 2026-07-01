import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MediaManagerRepository } from "../services/media-manager.repository.js";
import type {
  MediaManagerTab,
  ScanResult,
  ScanType,
  StorageReport,
} from "../types.d.js";

export type ScanState = "idle" | "scanning" | "done" | "failed";

export interface ScanSlice {
  state: ScanState;
  processed: number;
  result?: ScanResult;
  selected: string[];
}

export type Slices = Record<ScanType, ScanSlice>;

export type ReportState = "idle" | "loading" | "done" | "failed";

export interface ReportSlice {
  state: ReportState;
  result?: StorageReport;
}

const emptySlice = (): ScanSlice => ({ state: "idle", processed: 0, selected: [] });

const POLL_INTERVAL_MS = 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MediaManagerContext extends UmbControllerBase {
  #repository = new MediaManagerRepository(this);
  #notification?: UmbNotificationContext;

  #slices = new UmbObjectState<Slices>({
    UnusedMedia: emptySlice(),
    OrphanedFiles: emptySlice(),
    BrokenMedia: emptySlice(),
  });
  #activeTab = new UmbObjectState<MediaManagerTab>("UnusedMedia");
  #report = new UmbObjectState<ReportSlice>({ state: "idle" });

  readonly slices = this.#slices.asObservable();
  readonly activeTab = this.#activeTab.asObservable();
  readonly report = this.#report.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, "Ideo.Umbraco.MediaManager.Context");
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notification = context;
    });
  }

  getSlices(): Slices {
    return this.#slices.getValue();
  }

  setActiveTab(tab: MediaManagerTab): void {
    this.#activeTab.setValue(tab);
  }

  async loadReport(force = false): Promise<void> {
    const current = this.#report.getValue();
    if (!force && (current.state === "loading" || current.state === "done")) {
      return;
    }

    this.#report.setValue({ state: "loading" });
    try {
      const result = (await this.#repository.getStorageReport()) ?? undefined;
      this.#report.setValue({ state: "done", result });
    } catch (error) {
      this.#report.setValue({ state: "failed" });
      this.#notification?.peek("danger", { data: { message: "Failed to generate the storage report." } });
      console.error(error);
    }
  }

  setSelection(type: ScanType, selected: string[]): void {
    this.#patch(type, { selected });
  }

  async scanAll(): Promise<void> {
    await Promise.all([
      this.scan("UnusedMedia"),
      this.scan("OrphanedFiles"),
      this.scan("BrokenMedia"),
    ]);
  }

  async scan(type: ScanType): Promise<void> {
    this.#patch(type, { state: "scanning", processed: 0, result: undefined, selected: [] });

    try {
      const jobId = await this.#repository.startScan(type);

      while (true) {
        await sleep(POLL_INTERVAL_MS);
        const status = await this.#repository.getStatus(jobId);
        if (!status) {
          continue;
        }
        this.#patch(type, { processed: status.processed });

        if (status.state === "Completed") {
          const result = (await this.#repository.getResult(jobId)) ?? undefined;
          this.#patch(type, { state: "done", result });
          break;
        }
        if (status.state === "Failed" || status.state === "Cancelled") {
          this.#patch(type, { state: "failed" });
          this.#notification?.peek("danger", {
            data: { message: `Scan ${status.state}${status.error ? `: ${status.error}` : ""}` },
          });
          break;
        }
      }
    } catch (error) {
      this.#patch(type, { state: "failed" });
      this.#notification?.peek("danger", { data: { message: "Scan failed to start." } });
      console.error(error);
    }
  }

  async deleteSelected(type: ScanType): Promise<void> {
    const ids = this.#slices.getValue()[type].selected;
    if (ids.length === 0) {
      return;
    }

    try {
      // Orphaned files are physical files; every other scan targets media nodes.
      const result =
        type === "OrphanedFiles"
          ? await this.#repository.deleteFiles(ids, false)
          : await this.#repository.deleteMedia(ids, false);

      const affected = result?.affected ?? 0;
      const errors = result?.errors ?? [];
      this.#notification?.peek(errors.length ? "warning" : "positive", {
        data: {
          message: `${affected} item(s) processed${errors.length ? `, ${errors.length} error(s)` : ""}.`,
        },
      });

      // A deleted item can appear in more than one scan (e.g. orphaned AND broken), so refresh
      // every scan to keep all tabs and stat cards consistent.
      await this.scanAll();
    } catch (error) {
      this.#notification?.peek("danger", { data: { message: "Delete failed." } });
      console.error(error);
    }
  }

  #patch(type: ScanType, patch: Partial<ScanSlice>): void {
    const current = this.#slices.getValue();
    this.#slices.setValue({ ...current, [type]: { ...current[type], ...patch } });
  }
}

export { MediaManagerContext as api };
