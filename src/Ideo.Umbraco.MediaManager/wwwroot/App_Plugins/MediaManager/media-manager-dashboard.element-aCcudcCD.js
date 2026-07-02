var ve = (e) => {
  throw TypeError(e);
};
var oe = (e, t, a) => t.has(e) || ve("Cannot " + a);
var l = (e, t, a) => (oe(e, t, "read from private field"), a ? a.call(e) : t.get(e)), z = (e, t, a) => t.has(e) ? ve("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), B = (e, t, a, i) => (oe(e, t, "write to private field"), i ? i.call(e, a) : t.set(e, a), a), m = (e, t, a) => (oe(e, t, "access private method"), a);
import { css as j, property as X, customElement as H, nothing as $e, html as u, state as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as J } from "@umbraco-cms/backoffice/lit-element";
import { UmbControllerBase as Ke } from "@umbraco-cms/backoffice/class-api";
import { UmbObjectState as me } from "@umbraco-cms/backoffice/observable-api";
import { UMB_NOTIFICATION_CONTEXT as Ye } from "@umbraco-cms/backoffice/notification";
import { tryExecute as L } from "@umbraco-cms/backoffice/resources";
import { umbHttpClient as W } from "@umbraco-cms/backoffice/http-client";
import { UmbContextToken as je } from "@umbraco-cms/backoffice/context-api";
import { umbConfirmModal as Xe } from "@umbraco-cms/backoffice/modal";
import { UmbModalRouteRegistrationController as He } from "@umbraco-cms/backoffice/router";
import { UMB_WORKSPACE_MODAL as Je } from "@umbraco-cms/backoffice/workspace";
import { UMB_MEDIA_ENTITY_TYPE as Qe, UMB_EDIT_MEDIA_WORKSPACE_PATH_PATTERN as Ze } from "@umbraco-cms/backoffice/media";
import "@umbraco-cms/backoffice/components";
const G = [{ scheme: "bearer", type: "http" }];
class et {
  constructor(t) {
    this.host = t, this.apiBaseUrl = "/umbraco/media-manager/api/v1";
  }
  async startScan(t, a) {
    const { data: i, error: s } = await L(
      this.host,
      W.post({
        url: `${this.apiBaseUrl}/scan?type=${t}`,
        security: [...G]
      }),
      { disableNotifications: !0, abortSignal: a }
    );
    if (s) throw s;
    if (!i) throw new Error("Failed to start scan");
    return i.jobId;
  }
  async getStatus(t, a) {
    const { data: i } = await L(
      this.host,
      W.get({
        url: `${this.apiBaseUrl}/scan/${t}/status`,
        security: [...G]
      }),
      { disableNotifications: !0, abortSignal: a }
    );
    return i ?? null;
  }
  async getResult(t, a) {
    const { data: i } = await L(
      this.host,
      W.get({
        url: `${this.apiBaseUrl}/scan/${t}/result`,
        security: [...G]
      }),
      { disableNotifications: !0, abortSignal: a }
    );
    return i ?? null;
  }
  async deleteMedia(t, a) {
    const { data: i, error: s } = await L(
      this.host,
      W.post({
        url: `${this.apiBaseUrl}/cleanup/media`,
        body: { keys: t, dryRun: a },
        security: [...G]
      }),
      { disableNotifications: !0 }
    );
    if (s) throw s;
    return i ?? null;
  }
  async deleteFiles(t, a, i) {
    const { data: s, error: r } = await L(
      this.host,
      W.post({
        url: `${this.apiBaseUrl}/cleanup/files`,
        body: { jobId: t, paths: a, dryRun: i },
        security: [...G]
      }),
      { disableNotifications: !0 }
    );
    if (r) throw r;
    return s ?? null;
  }
}
const tt = ["UnusedMedia", "OrphanedFiles", "BrokenMedia", "Duplicates"], V = () => ({ state: "idle", processed: 0, selected: [] }), at = 1e3, it = 5, st = (e) => new Promise((t) => setTimeout(t, e));
var _, x, $, h, D, p, q, R;
class rt extends Ke {
  constructor(a) {
    super(a, "Ideo.Umbraco.MediaManager.Context");
    z(this, p);
    z(this, _);
    z(this, x);
    z(this, $);
    z(this, h);
    z(this, D);
    B(this, _, new et(this)), B(this, $, /* @__PURE__ */ new Map()), B(this, h, new me({
      UnusedMedia: V(),
      OrphanedFiles: V(),
      BrokenMedia: V(),
      Duplicates: V(),
      StorageReport: V()
    })), B(this, D, new me("UnusedMedia")), this.slices = l(this, h).asObservable(), this.activeTab = l(this, D).asObservable(), this.isScanning = l(this, h).asObservablePart(
      (i) => Object.values(i).some((s) => s.state === "scanning")
    ), this.consumeContext(Ye, (i) => {
      B(this, x, i);
    });
  }
  destroy() {
    for (const a of l(this, $).values())
      a.abort();
    l(this, $).clear(), super.destroy();
  }
  getSlices() {
    return l(this, h).getValue();
  }
  setActiveTab(a) {
    l(this, D).setValue(a), a === "StorageReport" && l(this, h).getValue().StorageReport.state === "idle" && this.scan("StorageReport");
  }
  setSelection(a, i) {
    m(this, p, R).call(this, a, { selected: i });
  }
  async scanAll() {
    const a = [...tt];
    l(this, h).getValue().StorageReport.state !== "idle" && a.push("StorageReport"), await Promise.all(a.map((i) => this.scan(i)));
  }
  async scan(a) {
    var r;
    if (l(this, h).getValue()[a].state === "scanning")
      return;
    (r = l(this, $).get(a)) == null || r.abort();
    const i = new AbortController();
    l(this, $).set(a, i);
    const s = i.signal;
    m(this, p, R).call(this, a, { state: "scanning", processed: 0, result: void 0, selected: [] });
    try {
      const n = await l(this, _).startScan(a, s);
      let v = 0;
      for (; !s.aborted; ) {
        if (await st(at), s.aborted)
          return;
        const o = await l(this, _).getStatus(n, s);
        if (s.aborted)
          return;
        if (!o) {
          if (++v >= it) {
            m(this, p, q).call(this, a, "The scan is no longer available on the server. Please rescan.");
            return;
          }
          continue;
        }
        if (v = 0, m(this, p, R).call(this, a, { processed: o.processed }), o.state === "Completed") {
          const f = await l(this, _).getResult(n, s) ?? void 0;
          if (s.aborted)
            return;
          if (!f) {
            m(this, p, q).call(this, a, "The scan result could not be retrieved. Please rescan.");
            return;
          }
          m(this, p, R).call(this, a, { state: "done", result: f });
          return;
        }
        if (o.state === "Failed" || o.state === "Cancelled") {
          m(this, p, q).call(this, a, `Scan ${o.state.toLowerCase()}${o.error ? `: ${o.error}` : ""}.`);
          return;
        }
      }
    } catch (n) {
      s.aborted || (m(this, p, q).call(this, a, "The scan could not be started."), console.error(n));
    }
  }
  async deleteSelected(a) {
    var r, n, v;
    const i = l(this, h).getValue()[a], s = i.selected;
    if (s.length !== 0)
      try {
        const o = a === "OrphanedFiles" ? await l(this, _).deleteFiles(((r = i.result) == null ? void 0 : r.jobId) ?? "", s, !1) : await l(this, _).deleteMedia(s, !1), f = (o == null ? void 0 : o.affected) ?? 0, A = (o == null ? void 0 : o.errors) ?? [];
        (n = l(this, x)) == null || n.peek(A.length ? "warning" : "positive", {
          data: {
            message: `${f} item(s) processed${A.length ? `, ${A.length} error(s)` : ""}.`
          }
        }), await this.scanAll();
      } catch (o) {
        (v = l(this, x)) == null || v.peek("danger", { data: { message: "Delete failed." } }), console.error(o);
      }
  }
}
_ = new WeakMap(), x = new WeakMap(), $ = new WeakMap(), h = new WeakMap(), D = new WeakMap(), p = new WeakSet(), q = function(a, i) {
  var s;
  m(this, p, R).call(this, a, { state: "failed", result: void 0 }), (s = l(this, x)) == null || s.peek("danger", { data: { message: i } });
}, R = function(a, i) {
  const s = l(this, h).getValue();
  l(this, h).setValue({ ...s, [a]: { ...s[a], ...i } });
};
const se = new je(
  "Ideo.Umbraco.MediaManager.Context"
), fe = ["B", "KB", "MB", "GB", "TB"];
function k(e) {
  if (!e || e <= 0)
    return "0 B";
  const t = Math.min(
    Math.floor(Math.log(e) / Math.log(1024)),
    fe.length - 1
  );
  return `${(e / 1024 ** t).toFixed(t === 0 ? 0 : 1)} ${fe[t]}`;
}
var nt = Object.defineProperty, ot = Object.getOwnPropertyDescriptor, F = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? ot(t, a) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (s = (i ? n(t, a, s) : n(s)) || s);
  return i && s && nt(t, a, s), s;
};
let w = class extends J {
  constructor() {
    super(...arguments), this.icon = "", this.label = "", this.value = "", this.description = "", this.loading = !1;
  }
  render() {
    return u`
      <uui-box>
        <div class="value">
          ${this.loading ? u`<uui-loader-circle></uui-loader-circle>` : this.value}
        </div>
        <div class="label">
          <uui-icon name=${this.icon}></uui-icon>
          <span>${this.label}</span>
        </div>
        ${this.description ? u`<div class="description">${this.description}</div>` : $e}
      </uui-box>
    `;
  }
};
w.styles = [
  j`
      :host {
        display: block;
      }
      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }
      .value {
        font-size: var(--uui-type-h2-size, 2rem);
        font-weight: 700;
        line-height: 1.1;
        min-height: 2rem;
      }
      .label {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin-top: var(--uui-size-space-2);
        font-weight: 600;
      }
      .description {
        margin-top: var(--uui-size-space-1);
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size, 0.8rem);
        line-height: 1.3;
      }
    `
];
F([
  X()
], w.prototype, "icon", 2);
F([
  X()
], w.prototype, "label", 2);
F([
  X()
], w.prototype, "value", 2);
F([
  X()
], w.prototype, "description", 2);
F([
  X({ type: Boolean })
], w.prototype, "loading", 2);
w = F([
  H("media-manager-stat-card")
], w);
var lt = Object.defineProperty, ct = Object.getOwnPropertyDescriptor, Me = (e) => {
  throw TypeError(e);
}, we = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? ct(t, a) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (s = (i ? n(t, a, s) : n(s)) || s);
  return i && s && lt(t, a, s), s;
}, Se = (e, t, a) => t.has(e) || Me("Cannot " + a), Te = (e, t, a) => (Se(e, t, "read from private field"), a ? a.call(e) : t.get(e)), ut = (e, t, a) => t.has(e) ? Me("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Q = (e, t, a) => (Se(e, t, "access private method"), a), y, ze, K, Ee;
const xe = "—";
let te = class extends J {
  constructor() {
    super(), ut(this, y), this.consumeContext(se, (e) => {
      this.observe(e == null ? void 0 : e.slices, (t) => {
        this._slices = t;
      });
    });
  }
  render() {
    return u`
      <div class="grid">
        ${Te(this, y, Ee).map(
      (e) => u`
            <media-manager-stat-card
              icon=${e.icon}
              label=${e.label}
              value=${e.value}
              description=${e.description}
              ?loading=${e.loading}
            ></media-manager-stat-card>
          `
    )}
      </div>
    `;
  }
};
y = /* @__PURE__ */ new WeakSet();
ze = function() {
  var r, n, v;
  const e = (r = this._slices) == null ? void 0 : r.UnusedMedia.result, t = (n = this._slices) == null ? void 0 : n.OrphanedFiles.result, a = (v = this._slices) == null ? void 0 : v.Duplicates.result, i = new Set(((e == null ? void 0 : e.media) ?? []).map((o) => o.key)), s = ((a == null ? void 0 : a.media) ?? []).filter((o) => i.has(o.key)).reduce((o, f) => o + f.sizeBytes, 0);
  return ((e == null ? void 0 : e.reclaimableBytes) ?? 0) + ((t == null ? void 0 : t.reclaimableBytes) ?? 0) + ((a == null ? void 0 : a.reclaimableBytes) ?? 0) - s;
};
K = function(e, t) {
  return (e == null ? void 0 : e.state) === "failed" ? xe : `${t}`;
};
Ee = function() {
  var v, o, f, A, ue, de, he, pe;
  const e = (v = this._slices) == null ? void 0 : v.UnusedMedia, t = (o = this._slices) == null ? void 0 : o.OrphanedFiles, a = (f = this._slices) == null ? void 0 : f.BrokenMedia, i = (A = this._slices) == null ? void 0 : A.Duplicates, s = [e, t, a, i], r = s.some((T) => (T == null ? void 0 : T.state) === "scanning"), n = s.some((T) => (T == null ? void 0 : T.state) === "failed");
  return [
    {
      icon: "icon-picture",
      label: "Unused media",
      value: Q(this, y, K).call(this, e, ((ue = e == null ? void 0 : e.result) == null ? void 0 : ue.media.length) ?? 0),
      description: "Media not referenced by any content.",
      loading: (e == null ? void 0 : e.state) === "scanning"
    },
    {
      icon: "icon-documents",
      label: "Duplicates",
      value: Q(this, y, K).call(this, i, ((de = i == null ? void 0 : i.result) == null ? void 0 : de.media.length) ?? 0),
      description: "Redundant copies of identical files.",
      loading: (i == null ? void 0 : i.state) === "scanning"
    },
    {
      icon: "icon-alert",
      label: "Broken media",
      value: Q(this, y, K).call(this, a, ((he = a == null ? void 0 : a.result) == null ? void 0 : he.media.length) ?? 0),
      description: "Media whose file is missing on disk.",
      loading: (a == null ? void 0 : a.state) === "scanning"
    },
    {
      icon: "icon-document",
      label: "Orphaned files",
      value: Q(this, y, K).call(this, t, ((pe = t == null ? void 0 : t.result) == null ? void 0 : pe.files.length) ?? 0),
      description: "Files on disk with no matching media item.",
      loading: (t == null ? void 0 : t.state) === "scanning"
    },
    {
      icon: "icon-trash",
      label: "Reclaimable space",
      value: n ? xe : k(Te(this, y, ze)),
      description: "Disk space recovered by cleaning these up.",
      loading: r
    }
  ];
};
te.styles = [
  j`
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--uui-size-space-4);
      }
    `
];
we([
  S()
], te.prototype, "_slices", 2);
te = we([
  H("media-manager-stats")
], te);
var dt = Object.defineProperty, ht = Object.getOwnPropertyDescriptor, Ce = (e) => {
  throw TypeError(e);
}, re = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? ht(t, a) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (s = (i ? n(t, a, s) : n(s)) || s);
  return i && s && dt(t, a, s), s;
}, ce = (e, t, a) => t.has(e) || Ce("Cannot " + a), d = (e, t, a) => (ce(e, t, "read from private field"), a ? a.call(e) : t.get(e)), ge = (e, t, a) => t.has(e) ? Ce("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), pt = (e, t, a, i) => (ce(e, t, "write to private field"), t.set(e, a), a), M = (e, t, a) => (ce(e, t, "access private method"), a), I, c, C, Oe, Ae, ae, Be, le, Re, Pe, Ue, De, ke;
const vt = [
  { name: "Name", alias: "name" },
  { name: "Path", alias: "path" },
  { name: "Size", alias: "size" }
], mt = [
  { name: "Path", alias: "path" },
  { name: "Size", alias: "size" }
];
let N = class extends J {
  constructor() {
    super(), ge(this, c), ge(this, I), this._activeTab = "UnusedMedia", new He(this, Je).addUniquePaths(["unique"]).onSetup((e) => ({
      data: { entityType: Qe, preset: { unique: e.unique } }
    })).observeRouteBuilder((e) => {
      this._mediaEditBuilder = e;
    }), this.consumeContext(se, (e) => {
      pt(this, I, e), this.observe(e == null ? void 0 : e.activeTab, (t) => {
        t && t !== "StorageReport" && (this._activeTab = t, this._slice = e == null ? void 0 : e.getSlices()[t]);
      }), this.observe(e == null ? void 0 : e.slices, (t) => {
        this._slice = t == null ? void 0 : t[this._activeTab];
      });
    });
  }
  render() {
    const e = this._slice;
    return !e || e.state === "idle" || e.state === "scanning" ? M(this, c, Pe).call(this, (e == null ? void 0 : e.processed) ?? 0) : e.state === "failed" ? M(this, c, Ue).call(this) : d(this, c, ae).length === 0 ? M(this, c, De).call(this) : M(this, c, ke).call(this, e);
  }
};
I = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakSet();
C = function() {
  return this._activeTab !== "OrphanedFiles";
};
Oe = function() {
  return { allowSelection: !0, hideIcon: !1 };
};
Ae = function() {
  return d(this, c, C) ? vt : mt;
};
ae = function() {
  var t;
  const e = (t = this._slice) == null ? void 0 : t.result;
  return e ? d(this, c, C) ? e.media.map((a) => ({
    id: a.key,
    icon: "icon-picture",
    data: [
      { columnAlias: "name", value: M(this, c, Be).call(this, a.key, a.name) },
      { columnAlias: "path", value: u`<span class="path">${a.path ?? ""}</span>` },
      { columnAlias: "size", value: k(a.sizeBytes) }
    ]
  })) : e.files.map((a) => ({
    id: a.path,
    icon: "icon-document",
    data: [
      { columnAlias: "path", value: u`<span class="path">${a.path}</span>` },
      { columnAlias: "size", value: k(a.sizeBytes) }
    ]
  })) : [];
};
Be = function(e, t) {
  if (!this._mediaEditBuilder)
    return t;
  const a = this._mediaEditBuilder({ unique: e }) + Ze.generateLocal({ unique: e });
  return u`<uui-button look="link" compact label=${t} href=${a}>${t}</uui-button>`;
};
le = function(e) {
  var a;
  const t = e.target;
  (a = d(this, I)) == null || a.setSelection(this._activeTab, t.selection ?? []);
};
Re = async function() {
  var t, a;
  const e = ((t = this._slice) == null ? void 0 : t.selected.length) ?? 0;
  e !== 0 && (await Xe(this, {
    headline: `Delete ${e} item(s)`,
    content: d(this, c, C) ? "The selected media will be moved to the Recycle Bin, where they can be restored." : "The selected physical files will be permanently deleted. This cannot be undone.",
    color: "danger",
    confirmLabel: d(this, c, C) ? "Move to Recycle Bin" : "Delete permanently"
  }), await ((a = d(this, I)) == null ? void 0 : a.deleteSelected(this._activeTab)));
};
Pe = function(e) {
  return u`
      <uui-box>
        <div class="state">
          <uui-loader-circle></uui-loader-circle>
          <span>Scanning… (${e} processed)</span>
        </div>
      </uui-box>
    `;
};
Ue = function() {
  return u`
      <uui-box>
        <div class="state">
          <uui-icon name="icon-alert" class="failed-icon"></uui-icon>
          <span>The scan failed.</span>
          <uui-button
            look="secondary"
            label="Retry"
            @click=${() => {
    var e;
    return (e = d(this, I)) == null ? void 0 : e.scan(this._activeTab);
  }}
          >
            Retry
          </uui-button>
        </div>
      </uui-box>
    `;
};
De = function() {
  return u`
      <uui-box>
        <div class="state">
          <uui-icon name="icon-check" class="empty-icon"></uui-icon>
          <span>Nothing to clean up here.</span>
        </div>
      </uui-box>
    `;
};
ke = function(e) {
  const t = e.selected.length, a = d(this, c, ae).length;
  return u`
      <uui-box class="results">
        <div class="toolbar">
          <span class="summary">
            ${t > 0 ? `${t} selected` : `${a} item(s)`}
          </span>
          <uui-button
            look="primary"
            color="danger"
            label=${d(this, c, C) ? "Move to Recycle Bin" : "Delete files"}
            ?disabled=${t === 0}
            @click=${M(this, c, Re)}
          >
            ${d(this, c, C) ? "Move to Recycle Bin" : "Delete files"}
          </uui-button>
        </div>
        <umb-table
          .config=${d(this, c, Oe)}
          .columns=${d(this, c, Ae)}
          .items=${d(this, c, ae)}
          .selection=${e.selected}
          @selected=${M(this, c, le)}
          @deselected=${M(this, c, le)}
        ></umb-table>
      </uui-box>
    `;
};
N.styles = [
  j`
      :host {
        display: block;
      }
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-3);
        margin-bottom: var(--uui-size-space-4);
      }
      .summary {
        color: var(--uui-color-text-alt);
      }
      .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-4);
        text-align: center;
        color: var(--uui-color-text-alt);
      }
      .empty-icon {
        font-size: 2rem;
        color: var(--uui-color-positive);
      }
      .failed-icon {
        font-size: 2rem;
        color: var(--uui-color-danger);
      }
      .path {
        color: var(--uui-color-text-alt);
        font-family: var(--uui-font-monospace, monospace);
        font-size: var(--uui-type-small-size, 0.8rem);
        word-break: break-all;
      }
    `
];
re([
  S()
], N.prototype, "_activeTab", 2);
re([
  S()
], N.prototype, "_slice", 2);
re([
  S()
], N.prototype, "_mediaEditBuilder", 2);
N = re([
  H("media-manager-results")
], N);
var ft = Object.defineProperty, gt = Object.getOwnPropertyDescriptor, Ie = (e) => {
  throw TypeError(e);
}, Ne = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? gt(t, a) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (s = (i ? n(t, a, s) : n(s)) || s);
  return i && s && ft(t, a, s), s;
}, Fe = (e, t, a) => t.has(e) || Ie("Cannot " + a), Z = (e, t, a) => (Fe(e, t, "read from private field"), a ? a.call(e) : t.get(e)), _e = (e, t, a) => t.has(e) ? Ie("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), _t = (e, t, a, i) => (Fe(e, t, "write to private field"), t.set(e, a), a), Y, ee, Le, We;
const be = { allowSelection: !1, hideIcon: !1 }, bt = [
  { name: "Media type", alias: "type" },
  { name: "Items", alias: "count" },
  { name: "Size", alias: "size" }
], yt = [
  { name: "Name", alias: "name" },
  { name: "Path", alias: "path" },
  { name: "Size", alias: "size" }
];
let ie = class extends J {
  constructor() {
    super(), _e(this, ee), _e(this, Y), this.consumeContext(se, (e) => {
      _t(this, Y, e), this.observe(e == null ? void 0 : e.slices, (t) => {
        this._slice = t == null ? void 0 : t.StorageReport;
      });
    });
  }
  render() {
    var a;
    const e = this._slice;
    if (!e || e.state === "idle" || e.state === "scanning")
      return u`
        <uui-box>
          <div class="state">
            <uui-loader-circle></uui-loader-circle>
            <span>Generating storage report… (${(e == null ? void 0 : e.processed) ?? 0} processed)</span>
          </div>
        </uui-box>
      `;
    const t = (a = e.result) == null ? void 0 : a.report;
    return e.state === "failed" || !t ? u`
        <uui-box>
          <div class="state">
            <span>The report could not be generated.</span>
            <uui-button look="secondary" label="Retry" @click=${() => {
      var i;
      return (i = Z(this, Y)) == null ? void 0 : i.scan("StorageReport");
    }}>
              Retry
            </uui-button>
          </div>
        </uui-box>
      ` : u`
      <div class="report">
        <uui-box>
          <div class="totals">
            <div>
              <div class="total-value">${k(t.totalBytes)}</div>
              <div class="total-label">across ${t.totalCount} media files</div>
            </div>
            <uui-button
              look="secondary"
              label="Refresh"
              @click=${() => {
      var i;
      return (i = Z(this, Y)) == null ? void 0 : i.scan("StorageReport");
    }}
            >
              <uui-icon name="icon-sync"></uui-icon>
              Refresh
            </uui-button>
          </div>
        </uui-box>

        <uui-box headline="By media type">
          <umb-table .config=${be} .columns=${bt} .items=${Z(this, ee, Le)}></umb-table>
        </uui-box>

        <uui-box headline="Largest files">
          <umb-table .config=${be} .columns=${yt} .items=${Z(this, ee, We)}></umb-table>
        </uui-box>
      </div>
    `;
  }
};
Y = /* @__PURE__ */ new WeakMap();
ee = /* @__PURE__ */ new WeakSet();
Le = function() {
  var e, t, a;
  return (((a = (t = (e = this._slice) == null ? void 0 : e.result) == null ? void 0 : t.report) == null ? void 0 : a.byType) ?? []).map((i) => ({
    id: i.typeAlias,
    icon: i.icon,
    data: [
      { columnAlias: "type", value: i.typeAlias },
      { columnAlias: "count", value: `${i.count}` },
      { columnAlias: "size", value: k(i.bytes) }
    ]
  }));
};
We = function() {
  var e, t, a;
  return (((a = (t = (e = this._slice) == null ? void 0 : e.result) == null ? void 0 : t.report) == null ? void 0 : a.largest) ?? []).map((i) => ({
    id: i.key,
    icon: "icon-picture",
    data: [
      { columnAlias: "name", value: i.name },
      { columnAlias: "path", value: u`<span class="path">${i.path ?? ""}</span>` },
      { columnAlias: "size", value: k(i.sizeBytes) }
    ]
  }));
};
ie.styles = [
  j`
      :host {
        display: block;
      }
      .report {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }
      .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-4);
        color: var(--uui-color-text-alt);
      }
      .totals {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-4);
      }
      .total-value {
        font-size: var(--uui-type-h2-size, 2rem);
        font-weight: 700;
        line-height: 1.1;
      }
      .total-label {
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-1);
      }
      .path {
        color: var(--uui-color-text-alt);
        font-family: var(--uui-font-monospace, monospace);
        font-size: var(--uui-type-small-size, 0.8rem);
        word-break: break-all;
      }
    `
];
Ne([
  S()
], ie.prototype, "_slice", 2);
ie = Ne([
  H("media-manager-report")
], ie);
var $t = Object.defineProperty, Mt = Object.getOwnPropertyDescriptor, Ge = (e) => {
  throw TypeError(e);
}, ne = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? Mt(t, a) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (s = (i ? n(t, a, s) : n(s)) || s);
  return i && s && $t(t, a, s), s;
}, Ve = (e, t, a) => t.has(e) || Ge("Cannot " + a), E = (e, t, a) => (Ve(e, t, "read from private field"), a ? a.call(e) : t.get(e)), ye = (e, t, a) => t.has(e) ? Ge("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), P = (e, t, a) => (Ve(e, t, "access private method"), a), g, b, qe, U;
let O = class extends J {
  constructor() {
    super(), ye(this, b), ye(this, g, new rt(this)), this._activeTab = "UnusedMedia", this._isScanning = !1, this.provideContext(se, E(this, g)), this.observe(E(this, g).slices, (e) => {
      this._slices = e;
    }), this.observe(E(this, g).activeTab, (e) => {
      this._activeTab = e;
    }), this.observe(E(this, g).isScanning, (e) => {
      this._isScanning = e;
    });
  }
  firstUpdated() {
    E(this, g).scanAll();
  }
  render() {
    return u`
      <div class="dashboard">
        <div class="header">
          <div class="titles">
            <h1>Media Manager</h1>
            <p>Find and safely remove unused media and orphaned files.</p>
          </div>
          <uui-button
            look="outline"
            label="Rescan"
            ?disabled=${this._isScanning}
            @click=${() => E(this, g).scanAll()}
          >
            <uui-icon name="icon-sync"></uui-icon>
            Rescan
          </uui-button>
        </div>

        <media-manager-stats></media-manager-stats>

        <uui-tab-group>
          ${P(this, b, U).call(this, "UnusedMedia", "Unused media")}
          ${P(this, b, U).call(this, "Duplicates", "Duplicates")}
          ${P(this, b, U).call(this, "BrokenMedia", "Broken media")}
          ${P(this, b, U).call(this, "OrphanedFiles", "Orphaned files")}
          ${P(this, b, U).call(this, "StorageReport", "Storage report")}
        </uui-tab-group>

        ${this._activeTab === "StorageReport" ? u`<media-manager-report></media-manager-report>` : u`<media-manager-results></media-manager-results>`}
      </div>
    `;
  }
};
g = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakSet();
qe = function(e) {
  var a, i, s;
  if (e === "StorageReport")
    return;
  const t = (a = this._slices) == null ? void 0 : a[e];
  if ((t == null ? void 0 : t.state) === "done")
    return e === "OrphanedFiles" ? ((i = t.result) == null ? void 0 : i.files.length) ?? 0 : ((s = t.result) == null ? void 0 : s.media.length) ?? 0;
};
U = function(e, t) {
  const a = P(this, b, qe).call(this, e);
  return u`
      <uui-tab
        label=${t}
        ?active=${this._activeTab === e}
        @click=${() => E(this, g).setActiveTab(e)}
      >
        <span class="tab-label">
          ${t}
          ${a === void 0 ? $e : u`<span class="count ${a > 0 ? "has-items" : ""}">${a}</span>`}
        </span>
      </uui-tab>
    `;
};
O.styles = [
  j`
      :host {
        display: block;
        height: 100%;
        overflow: auto;
        background: var(--uui-color-background);
      }
      .dashboard {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
        padding: var(--uui-size-layout-1);
        max-width: 1400px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-4);
        flex-wrap: wrap;
      }
      .titles h1 {
        margin: 0;
        font-size: var(--uui-type-h3-size, 1.5rem);
        line-height: 1.2;
        font-weight: 700;
      }
      .titles p {
        margin: var(--uui-size-space-2) 0 0;
        color: var(--uui-color-text-alt);
        line-height: 1.4;
        max-width: 60ch;
      }
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-divider);
      }
      .tab-label {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }
      .count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 var(--uui-size-space-1);
        border-radius: 1rem;
        font-size: 0.75rem;
        font-weight: 700;
        line-height: 1;
        background: var(--uui-color-surface-alt);
        color: var(--uui-color-text-alt);
      }
      .count.has-items {
        background: var(--uui-color-danger);
        color: var(--uui-color-danger-contrast);
      }
    `
];
ne([
  S()
], O.prototype, "_slices", 2);
ne([
  S()
], O.prototype, "_activeTab", 2);
ne([
  S()
], O.prototype, "_isScanning", 2);
O = ne([
  H("media-manager-dashboard")
], O);
const kt = O;
export {
  O as MediaManagerDashboardElement,
  kt as default
};
//# sourceMappingURL=media-manager-dashboard.element-aCcudcCD.js.map
