import { manifests as entrypoints } from "./manifests.js";
import type { UmbExtensionManifest } from "@umbraco-cms/backoffice/extension-api";

export const manifests: Array<UmbExtensionManifest> = [...entrypoints];
