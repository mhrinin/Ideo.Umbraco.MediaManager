import { tryExecute } from "@umbraco-cms/backoffice/resources";
import { umbHttpClient } from "@umbraco-cms/backoffice/http-client";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type {
  CleanupResult,
  ScanJobStatus,
  ScanResult,
  ScanType,
  StartScanResponse,
  StorageReport,
} from "../types.d.js";

const BEARER = [{ scheme: "bearer", type: "http" }] as const;

export class MediaManagerRepository {
  private readonly apiBaseUrl = "/umbraco/media-manager/api/v1";

  constructor(private host: UmbControllerHost) {}

  async startScan(type: ScanType): Promise<string> {
    const { data, error } = await tryExecute(
      this.host,
      umbHttpClient.post<StartScanResponse>({
        url: `${this.apiBaseUrl}/scan?type=${type}`,
        security: [...BEARER],
      }),
    );
    if (error) throw error;
    if (!data) throw new Error("Failed to start scan");
    return data.jobId;
  }

  async getStatus(jobId: string): Promise<ScanJobStatus | null> {
    const { data } = await tryExecute(
      this.host,
      umbHttpClient.get<ScanJobStatus>({
        url: `${this.apiBaseUrl}/scan/${jobId}/status`,
        security: [...BEARER],
      }),
    );
    return data ?? null;
  }

  async getResult(jobId: string): Promise<ScanResult | null> {
    const { data } = await tryExecute(
      this.host,
      umbHttpClient.get<ScanResult>({
        url: `${this.apiBaseUrl}/scan/${jobId}/result`,
        security: [...BEARER],
      }),
    );
    return data ?? null;
  }

  async deleteMedia(keys: string[], dryRun: boolean): Promise<CleanupResult | null> {
    const { data, error } = await tryExecute(
      this.host,
      umbHttpClient.post<CleanupResult>({
        url: `${this.apiBaseUrl}/cleanup/media`,
        body: { keys, dryRun },
        security: [...BEARER],
      }),
    );
    if (error) throw error;
    return data ?? null;
  }

  async getStorageReport(): Promise<StorageReport | null> {
    const { data, error } = await tryExecute(
      this.host,
      umbHttpClient.get<StorageReport>({
        url: `${this.apiBaseUrl}/report/storage`,
        security: [...BEARER],
      }),
    );
    if (error) throw error;
    return data ?? null;
  }

  async deleteFiles(paths: string[], dryRun: boolean): Promise<CleanupResult | null> {
    const { data, error } = await tryExecute(
      this.host,
      umbHttpClient.post<CleanupResult>({
        url: `${this.apiBaseUrl}/cleanup/files`,
        body: { paths, dryRun },
        security: [...BEARER],
      }),
    );
    if (error) throw error;
    return data ?? null;
  }
}
