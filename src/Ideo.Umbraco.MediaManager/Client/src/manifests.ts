export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "dashboard",
    alias: "Ideo.Umbraco.MediaManager.Dashboard",
    name: "Media Manager Dashboard",
    element: () =>
      import("./components/dashboards/media-manager-dashboard.element.js"),
    elementName: "media-manager-dashboard",
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
  {
    type: "localization",
    alias: "Ideo.Umbraco.MediaManager.Localize.En",
    name: "English",
    meta: {
      culture: "en",
    },
    js: () => import("./localization/en.js"),
  },
];
