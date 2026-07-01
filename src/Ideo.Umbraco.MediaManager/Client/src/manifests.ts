import type { UmbExtensionManifest } from "@umbraco-cms/backoffice/extension-api";

const dashboards: Array<UmbExtensionManifest> = [
  {
    type: "dashboard",
    alias: "Ideo.Umbraco.MediaManager.Dashboard",
    name: "Media Manager Dashboard",
    element: () =>
      import("./components/dashboards/media-manager-dashboard.element.js"),
    weight: 10,
    meta: {
      label: "Media Manager",
      pathname: "media-manager",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Media",
      },
    ],
  },
];

export const manifests: Array<UmbExtensionManifest> = [...dashboards];
