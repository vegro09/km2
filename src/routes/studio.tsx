import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Motion Studio Editor — Kanto Motion" },
      {
        name: "description",
        content:
          "Three-panel motion workspace: code and DOM tree, live canvas viewport, AI motion director with spatial manifest and video render settings.",
      },
      { property: "og:title", content: "Motion Studio Editor — Kanto Motion" },
      {
        property: "og:description",
        content: "Direct UI motion with natural language and export deterministic video.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

const codeLines: Array<Array<[string, string]>> = [
  [["tag", "<div"], ["key", " id="], ["str", '"streak-card"'], ["tag", ">"]],
  [["tag", "  <div"], ["key", " id="], ["str", '"streak-icon"'], ["tag", ">🔥</div>"]],
  [["tag", "  <h3"], ["key", " id="], ["str", '"streak-title"'], ["tag", ">7 Day Streak</h3>"]],
  [["tag", "  <p"], ["key", " id="], ["str", '"streak-caption"'], ["tag", ">Keep it going</p>"]],
  [["tag", "</div>"]],
  [["com", ""]],
  [["com", "/* styles */"]],
  [["key", "#streak-card"], ["tag", " {"]],
  [["key", "  display"], ["tag", ": "], ["str", "flex"], ["tag", ";"]],
  [["key", "  border-radius"], ["tag", ": "], ["str", "16px"], ["tag", ";"]],
  [["key", "  background"], ["tag", ": "], ["str", "#09090b"], ["tag", ";"]],
  [["tag", "}"]],
];

const codeColor: Record<string, string> = {
  tag: "text-code-tag",
  key: "text-code-key",
  str: "text-code-str",
  com: "text-code-com",
};

const domElements = [
  { id: "#streak-card", tag: "div", depth: 0 },
  { id: "#streak-icon", tag: "div", depth: 1 },
  { id: "#streak-title", tag: "h3", depth: 1 },
  { id: "#streak-caption", tag: "p", depth: 1 },
];

function Studio() {
  return (
    <div id="studio-screen" data-animate="true" className="flex h-screen flex-col bg-background">
      <header id="studio-topbar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link id="studio-brand" data-animate="true" to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 text-[12px] font-semibold">
              K
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Kanto Motion</span>
          </Link>
          <span className="h-5 w-px bg-border" />
          <span id="studio-project-name" data-animate="true" className="text-[13px] text-muted-foreground">
            Daily Streak Widget
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span id="studio-save-state" data-animate="true" className="rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] text-muted-foreground">
            All changes saved
          </span>
          <span id="studio-avatar" data-animate="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-[11px]">
            VG
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* LEFT */}
        <aside id="left-sidebar" data-animate="true" className="flex w-[320px] shrink-0 flex-col border-r border-border bg-surface">
          <div id="left-tab-switcher" data-animate="true" className="flex gap-1 border-b border-border p-2">
            <button id="tab-code-editor" data-animate="true" type="button" className="h-8 flex-1 rounded-lg bg-primary text-[12px] font-medium text-primary-foreground">
              HTML / CSS Code
            </button>
            <button id="tab-dom-tree" data-animate="true" type="button" className="h-8 flex-1 rounded-lg border border-border bg-surface-2 text-[12px] text-muted-foreground">
              DOM Elements
            </button>
          </div>

          <div id="code-editor-panel" data-animate="true" className="min-h-0 flex-1 overflow-auto p-3">
            <div className="rounded-xl border border-border bg-background p-3 font-mono text-[11.5px] leading-6">
              {codeLines.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-5 shrink-0 select-none text-right text-code-com">{i + 1}</span>
                  <span className="whitespace-pre">
                    {line.map(([t, v], j) => (
                      <span key={j} className={codeColor[t]}>
                        {v}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div id="element-inspector" data-animate="true" className="border-t border-border p-3">
            <p className="px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Element Inspector
            </p>
            <ul className="mt-2 space-y-1">
              {domElements.map((el) => (
                <li
                  key={el.id}
                  id={`inspector-item-${el.id.slice(1)}`}
                  data-animate="true"
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2"
                  style={{ marginLeft: el.depth * 12 }}
                >
                  <span className="font-mono text-[11.5px]">{el.id}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">&lt;{el.tag}&gt;</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER */}
        <main id="canvas-panel" data-animate="true" className="flex min-w-0 flex-1 flex-col bg-background">
          <div id="canvas-toolbar" data-animate="true" className="flex h-12 items-center justify-between border-b border-border px-4">
            <div className="flex gap-1">
              {["16:9 Desktop", "9:16 Mobile", "1:1 Square"].map((r, i) => (
                <button
                  key={r}
                  id={`aspect-${r.split(" ")[0]!.replace(":", "-")}`}
                  data-animate="true"
                  type="button"
                  className={
                    i === 0
                      ? "h-8 rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground"
                      : "h-8 rounded-lg border border-border bg-surface-2 px-3 text-[12px] text-muted-foreground"
                  }
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span id="canvas-zoom" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-[11.5px] text-muted-foreground">
                Zoom 100%
              </span>
              <span id="canvas-resolution" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-[11.5px] text-muted-foreground">
                1920 × 1080
              </span>
            </div>
          </div>

          <div className="grid-bg flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
            <div
              id="canvas-stage"
              data-animate="true"
              className="flex aspect-video w-full max-w-[860px] items-center justify-center rounded-2xl border border-border bg-background"
            >
              <div
                id="streak-card"
                data-animate="true"
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6"
              >
                <span
                  id="streak-icon"
                  data-animate="true"
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-2 text-2xl"
                >
                  🔥
                </span>
                <div>
                  <h3 id="streak-title" data-animate="true" className="text-lg font-semibold">
                    7 Day Streak
                  </h3>
                  <p id="streak-caption" data-animate="true" className="mt-1 text-[13px] text-muted-foreground">
                    Keep it going
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div id="playback-control-bar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
            <div className="flex items-center gap-2">
              <button
                id="playback-play-pause"
                data-animate="true"
                type="button"
                aria-label="Play / Pause"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button
                id="playback-reset"
                data-animate="true"
                type="button"
                aria-label="Reset / Replay"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
              </button>
              <button
                id="playback-loop"
                data-animate="true"
                type="button"
                aria-label="Loop"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m17 2 4 4-4 4" />
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                  <path d="m7 22-4-4 4-4" />
                  <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            </div>
            <span id="playback-time-counter" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 font-mono text-[11.5px] tabular-nums text-muted-foreground">
              02.4s / 05.0s
            </span>
          </div>
        </main>

        {/* RIGHT */}
        <aside id="right-sidebar" data-animate="true" className="flex w-[360px] shrink-0 flex-col overflow-auto border-l border-border bg-surface">
          <section id="ai-motion-prompt" data-animate="true" className="border-b border-border p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">AI Motion Director</p>
            <textarea
              id="motion-prompt-input"
              data-animate="true"
              rows={5}
              defaultValue="Make the streak icon float up slightly with a gentle bounce, then fade the caption in."
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-[12px] leading-5 text-foreground placeholder:text-muted-foreground"
            />
            <button
              id="generate-motion-button"
              data-animate="true"
              type="button"
              className="mt-3 h-11 w-full rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground"
            >
              Generate Motion Code
            </button>
          </section>

          <section id="spatial-inspector" data-animate="true" className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Spatial Coordinate Inspector
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  id="spatial-refresh"
                  data-animate="true"
                  type="button"
                  aria-label="Refresh / Recalculate coordinates"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 4v5h5" />
                  </svg>
                </button>
                <span id="spatial-toggle" data-animate="true" className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-[11px] text-muted-foreground">
                  −
                </span>
              </div>
            </div>
            <pre
              id="spatial-manifest"
              data-animate="true"
              className="mt-3 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11.5px] leading-5 text-code-str"
            >
{`{
  "#streak-card":  { "x": 712, "y": 452, "w": 496, "h": 176 },
  "#streak-icon":  { "x": 736, "y": 494, "w": 56,  "h": 56  },
  "#streak-title": { "x": 808, "y": 486, "w": 172, "h": 28  },
  "#streak-caption":{ "x": 808, "y": 518, "w": 128, "h": 20 }
}`}
            </pre>
          </section>

          <section id="render-settings" data-animate="true" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Timeline &amp; Render
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {["30 FPS", "60 FPS"].map((f, i) => (
                <button
                  key={f}
                  id={`framerate-${f.split(" ")[0]!}`}
                  data-animate="true"
                  type="button"
                  className={
                    i === 1
                      ? "h-9 rounded-lg bg-primary text-[12px] font-medium text-primary-foreground"
                      : "h-9 rounded-lg border border-border bg-surface-2 text-[12px] text-muted-foreground"
                  }
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {["MP4", "WebM", "Lottie"].map((f, i) => (
                <button
                  key={f}
                  id={`format-${f.toLowerCase()}`}
                  data-animate="true"
                  type="button"
                  className={
                    i === 0
                      ? "h-9 rounded-lg bg-primary text-[12px] font-medium text-primary-foreground"
                      : "h-9 rounded-lg border border-border bg-surface-2 text-[12px] text-muted-foreground"
                  }
                >
                  {f}
                </button>
              ))}
            </div>

            <div id="timeline-scrubber" data-animate="true" className="mt-4 rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>0.0s</span>
                <span id="timeline-playhead-value">2.4s</span>
                <span>5.0s</span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-surface-2">
                <div className="absolute inset-y-0 left-0 w-[48%] rounded-full bg-primary" />
                <span className="absolute -top-1 left-[48%] h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-border bg-primary" />
              </div>
              <div className="mt-3 space-y-1.5">
                {["#streak-icon", "#streak-title", "#streak-caption"].map((id, i) => (
                  <div key={id} id={`track-${id.slice(1)}`} data-animate="true" className="flex items-center gap-2">
                    <span className="flex w-28 shrink-0 items-center gap-1.5">
                      <button
                        id={`track-visibility-${id.slice(1)}`}
                        data-animate="true"
                        type="button"
                        aria-label={`Toggle visibility for ${id}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        id={`track-lock-${id.slice(1)}`}
                        data-animate="true"
                        type="button"
                        aria-label={`Toggle lock for ${id}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </button>
                      <span className="truncate font-mono text-[10.5px] text-muted-foreground">{id}</span>
                    </span>
                    <span className="relative h-2 flex-1 rounded-full bg-surface-2">
                      <span
                        className="absolute inset-y-0 rounded-full bg-muted-foreground"
                        style={{ left: `${i * 14}%`, width: `${52 - i * 8}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              id="render-download-button"
              data-animate="true"
              type="button"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Render &amp; Download Video
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
