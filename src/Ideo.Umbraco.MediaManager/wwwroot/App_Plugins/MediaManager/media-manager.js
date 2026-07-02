const a = [
  {
    type: "dashboard",
    alias: "Ideo.Umbraco.MediaManager.Dashboard",
    name: "Media Manager Dashboard",
    element: () => import("./media-manager-dashboard.element-aCcudcCD.js"),
    elementName: "media-manager-dashboard",
    weight: 10,
    meta: {
      label: "Media Manager",
      pathname: "media-manager"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Media"
      }
    ]
  }
], e = [...a];
export {
  e as manifests
};
//# sourceMappingURL=media-manager.js.map
