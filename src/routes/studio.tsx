import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Motion Studio Editor — Kanto Motion" },
      {
        name: "description",
        content:
          "Three-panel motion workspace: code editor, live canvas viewport with GSAP animation engine, spatial manifest inspector, and video export.",
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

const DEFAULT_HTML = `<div id="streak-card" data-animate="true" class="card">
  <div id="streak-icon" data-animate="true" class="icon">🔥</div>
  <div class="content">
    <h3 id="streak-title" data-animate="true" class="title">7 Day Streak</h3>
    <p id="streak-caption" data-animate="true" class="caption">Keep it going</p>
  </div>
</div>`;

const DEFAULT_CSS = `/* Base Canvas Styles */
.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  background: #111115;
  border: 1px solid #27272a;
  border-radius: 16px;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  font-family: system-ui, -apple-system, sans-serif;
}
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: #1e1e24;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  font-size: 28px;
}
.content {
  display: flex;
  flex-direction: column;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f4f4f5;
}
.caption {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #a1a1aa;
}`;

const DEFAULT_PROMPT = "Make the streak icon float up slightly with a gentle bounce, then scale the streak title.";

function Studio() {
  // Left Panel States
  const [activeLeftTab, setActiveLeftTab] = useState<"code" | "dom">("code");
  const [activeCodeTab, setActiveCodeTab] = useState<"html" | "css">("html");
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);

  // Right Panel States & Tabs
  const [activeRightTab, setActiveRightTab] = useState<"spatial" | "manual">("spatial");
  const [motionPrompt, setMotionPrompt] = useState(DEFAULT_PROMPT);
  const [manualCode, setManualCode] = useState("gsap.to('#streak-icon', { y: -20, scale: 1.2, duration: 0.8, ease: 'back.out(1.7)' });");
  const [manualGsapError, setManualGsapError] = useState<string | null>(null);

  // Center Canvas & Animation States
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(2.0);
  const [isLooping, setIsLooping] = useState(false);

  // Right Panel & Export States
  const [spatialManifest, setSpatialManifest] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const [framerate, setFramerate] = useState<30 | 60>(30);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm" | "lottie">("mp4");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Live Canvas DOM Injection & Spatial Manifest Extraction
  // ---------------------------------------------------------------------------
  const updateCanvasAndSpatial = useCallback(() => {
    if (!iframeRef.current) return;
    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    const fullDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: transparent;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              overflow: hidden;
            }
            ${cssCode}
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
        </head>
        <body>
          ${htmlCode}
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(fullDoc);
    iframeDoc.close();

    // Recalculate spatial coordinates once loaded
    setTimeout(() => {
      if (!iframeDoc.body) return;
      const targets = Array.from(iframeDoc.querySelectorAll('[id], [data-animate="true"]'));
      const manifest: Record<string, any> = {};

      targets.forEach((el) => {
        const id = el.id ? `#${el.id}` : `[data-animate="${el.getAttribute('data-animate')}"]`;
        const rect = el.getBoundingClientRect();
        manifest[id] = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        };
      });

      setSpatialManifest(manifest);
    }, 150);
  }, [htmlCode, cssCode]);

  useEffect(() => {
    updateCanvasAndSpatial();
  }, [updateCanvasAndSpatial]);

  // ---------------------------------------------------------------------------
  // 2. Client-Side Live GSAP Animation Preview
  // ---------------------------------------------------------------------------
  const buildLiveAnimation = useCallback((keyframeSequence?: any[]) => {
    if (!iframeRef.current) return;
    const iframeWin = iframeRef.current.contentWindow as any;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeWin || !iframeDoc) return;

    const gsapObj = iframeWin.gsap || gsap;

    // Reset previous timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsapObj.timeline({
      paused: true,
      repeat: isLooping ? -1 : 0,
      onUpdate: () => {
        setCurrentTime(tl.time());
      },
      onComplete: () => {
        if (!isLooping) setIsPlaying(false);
      }
    });

    if (keyframeSequence && Array.isArray(keyframeSequence) && keyframeSequence.length > 0) {
      keyframeSequence.forEach((elemMotion: any) => {
        const target = iframeDoc.getElementById(elemMotion.element_id) || 
                       iframeDoc.querySelector(`[data-animate="${elemMotion.element_id}"]`);
        if (!target) return;

        elemMotion.keyframes.forEach((kf: any) => {
          const timeSec = kf.time_ms / 1000;
          tl.to(target, {
            x: kf.delta_x,
            y: kf.delta_y,
            scale: kf.scale,
            opacity: kf.opacity,
            ease: kf.easing || "power1.out",
            duration: 0.4
          }, timeSec);
        });
      });
    } else {
      // Fallback default client-side animation preview
      const icon = iframeDoc.getElementById("streak-icon");
      const title = iframeDoc.getElementById("streak-title");

      if (icon) {
        tl.to(icon, { y: -24, scale: 1.25, duration: 0.6, ease: "back.out(1.7)" }, 0);
        tl.to(icon, { y: 0, scale: 1.0, duration: 0.5, ease: "power2.inOut" }, 0.8);
      }
      if (title) {
        tl.to(title, { scale: 1.08, color: "#3b82f6", duration: 0.4, ease: "power1.out" }, 0.3);
        tl.to(title, { scale: 1.0, color: "#f4f4f5", duration: 0.4, ease: "power1.in" }, 0.9);
      }
    }

    setDuration(tl.duration() || 2.0);
    timelineRef.current = tl;
    return tl;
  }, [isLooping]);

  // ---------------------------------------------------------------------------
  // 3. Apply Manual Motion Direct Execution Handler
  // ---------------------------------------------------------------------------
  const handleApplyManualMotion = useCallback(() => {
    if (!iframeRef.current) return;
    const iframeWin = iframeRef.current.contentWindow as any;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeWin || !iframeDoc) return;

    // First reset canvas DOM to clean state
    updateCanvasAndSpatial();

    setTimeout(() => {
      try {
        const gsapObj = iframeWin.gsap || gsap;

        if (timelineRef.current) {
          timelineRef.current.kill();
        }

        setManualGsapError(null);

        const tl = gsapObj.timeline({
          repeat: isLooping ? -1 : 0,
          onUpdate: () => {
            setCurrentTime(tl.time());
          },
          onComplete: () => {
            if (!isLooping) setIsPlaying(false);
          }
        });

        // Evaluate user manual code passing gsap, timeline, and document context
        const runUserGsap = new Function('gsap', 'tl', 'document', manualCode);
        runUserGsap(gsapObj, tl, iframeDoc);

        setDuration(tl.duration() || 2.0);
        timelineRef.current = tl;
        tl.play();
        setIsPlaying(true);
      } catch (err: any) {
        setManualGsapError(err.message || "Syntax or Execution Error in GSAP Code");
      }
    }, 100);
  }, [manualCode, updateCanvasAndSpatial, isLooping]);

  // Handle Play/Pause
  const togglePlayPause = () => {
    if (!timelineRef.current) {
      if (manualCode && manualCode.trim() && activeRightTab === "manual") {
        handleApplyManualMotion();
      } else {
        const tl = buildLiveAnimation();
        if (tl) {
          tl.play();
          setIsPlaying(true);
        }
      }
      return;
    }

    if (isPlaying) {
      timelineRef.current.pause();
      setIsPlaying(false);
    } else {
      if (timelineRef.current.progress() === 1) {
        timelineRef.current.restart();
      } else {
        timelineRef.current.play();
      }
      setIsPlaying(true);
    }
  };

  // Handle Reset / Replay
  const handleReset = () => {
    if (manualCode && manualCode.trim() && activeRightTab === "manual") {
      handleApplyManualMotion();
      return;
    }

    if (timelineRef.current) {
      timelineRef.current.restart();
      setIsPlaying(true);
    } else {
      const tl = buildLiveAnimation();
      if (tl) {
        tl.restart();
        setIsPlaying(true);
      }
    }
  };

  // Handle Scrubber Change
  const handleScrubberChange = (val: number) => {
    setCurrentTime(val);
    if (timelineRef.current) {
      timelineRef.current.pause();
      timelineRef.current.time(val);
      setIsPlaying(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Generate Motion Code Button (Triggers Live Preview Animation)
  // ---------------------------------------------------------------------------
  const handleGenerateMotionCode = async () => {
    setIsGenerating(true);
    try {
      // Re-initialize canvas to clean state
      updateCanvasAndSpatial();

      // Call Motion Engine API for Motion Plan
      const res = await fetch("http://localhost:7007/api/generate-motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: htmlCode,
          css: cssCode,
          prompt: motionPrompt,
          manualCode: manualCode
        })
      });

      const data = await res.json();
      if (data.success && data.motionPlan) {
        const keyframes = data.motionPlan.elements_motion;
        const tl = buildLiveAnimation(keyframes);
        if (tl) {
          tl.play();
          setIsPlaying(true);
        }
      } else {
        // Fallback live animation preview if server unavailable
        const tl = buildLiveAnimation();
        if (tl) {
          tl.play();
          setIsPlaying(true);
        }
      }
    } catch {
      // Fallback client-side GSAP preview if backend fetch fails
      const tl = buildLiveAnimation();
      if (tl) {
        tl.play();
        setIsPlaying(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Render & Download Video Button (Triggers Puppeteer/FFmpeg Pipeline)
  // ---------------------------------------------------------------------------
  const handleRenderDownloadVideo = async () => {
    setIsRendering(true);
    try {
      const res = await fetch("http://localhost:7007/api/generate-motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: htmlCode,
          css: cssCode,
          prompt: motionPrompt,
          manualCode: manualCode
        })
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        const fullUrl = `http://localhost:7007${data.videoUrl}`;
        setRenderedVideoUrl(fullUrl);

        // Trigger file download
        const a = document.createElement("a");
        a.href = fullUrl;
        a.download = `kanto_motion_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Render failed: " + (data.error || "Unknown server error"));
      }
    } catch (err: any) {
      alert("Render request error: " + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Copy JSON Handler
  // ---------------------------------------------------------------------------
  const handleCopyJSON = () => {
    const jsonStr = JSON.stringify(spatialManifest, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract DOM element list for left panel inspector
  const parsedDomElements = Object.keys(spatialManifest).map((key) => ({
    id: key,
    tag: key.startsWith("#") ? "elem" : "div",
    depth: key === "#streak-card" ? 0 : 1
  }));

  return (
    <div id="studio-screen" data-animate="true" className="flex h-screen flex-col bg-background select-none">
      {/* Top Header */}
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
            Daily Streak Widget Editor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {renderedVideoUrl && (
            <a
              href={renderedVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
            >
              Latest Video Rendered 🎬
            </a>
          )}
          <span id="studio-save-state" data-animate="true" className="rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] text-muted-foreground">
            Live Preview Active
          </span>
          <span id="studio-avatar" data-animate="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-[11px]">
            VG
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* LEFT PANEL: Interactive Code Editor */}
        <aside id="left-sidebar" data-animate="true" className="flex w-[340px] shrink-0 flex-col border-r border-border bg-surface">
          <div id="left-tab-switcher" data-animate="true" className="flex gap-1 border-b border-border p-2">
            <button
              id="tab-code-editor"
              data-animate="true"
              type="button"
              onClick={() => setActiveLeftTab("code")}
              className={`h-8 flex-1 rounded-lg text-[12px] font-medium transition-colors ${
                activeLeftTab === "code"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              Code Editor
            </button>
            <button
              id="tab-dom-tree"
              data-animate="true"
              type="button"
              onClick={() => setActiveLeftTab("dom")}
              className={`h-8 flex-1 rounded-lg text-[12px] font-medium transition-colors ${
                activeLeftTab === "dom"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              DOM Elements ({parsedDomElements.length})
            </button>
          </div>

          {activeLeftTab === "code" ? (
            <div className="flex min-h-0 flex-1 flex-col p-3">
              {/* Code Editor Sub-Tabs (HTML vs CSS) */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("html")}
                    className={`px-3 py-1 text-[11px] font-mono rounded-md transition-colors ${
                      activeCodeTab === "html"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("css")}
                    className={`px-3 py-1 text-[11px] font-mono rounded-md transition-colors ${
                      activeCodeTab === "css"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    CSS
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Live Editing
                </span>
              </div>

              {/* Editable Textarea */}
              <div className="relative flex-1 min-h-0 rounded-xl border border-border bg-background">
                {activeCodeTab === "html" ? (
                  <textarea
                    id="html-code-input"
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    placeholder="Enter HTML markup here..."
                    className="h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-[12px] leading-5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
                  />
                ) : (
                  <textarea
                    id="css-code-input"
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    placeholder="Enter CSS styles here..."
                    className="h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-[12px] leading-5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
                  />
                )}
              </div>
            </div>
          ) : (
            <div id="element-inspector" data-animate="true" className="min-h-0 flex-1 overflow-auto p-3">
              <p className="px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Target Elements
              </p>
              <ul className="mt-2 space-y-1.5">
                {parsedDomElements.map((el) => (
                  <li
                    key={el.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2"
                    style={{ marginLeft: el.depth * 12 }}
                  >
                    <span className="font-mono text-[11.5px] text-primary">{el.id}</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">&lt;{el.tag}&gt;</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* CENTER PANEL: Live DOM Canvas Viewport */}
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
              <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                Live DOM Preview
              </span>
              <span id="canvas-zoom" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-[11.5px] text-muted-foreground">
                100%
              </span>
              <span id="canvas-resolution" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-[11.5px] text-muted-foreground">
                1920 × 1080
              </span>
            </div>
          </div>

          {/* Live DOM Preview Container (Iframe Canvas) */}
          <div className="grid-bg flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
            <div
              id="canvas-stage"
              data-animate="true"
              className="flex aspect-video w-full max-w-[860px] items-center justify-center rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
            >
              <iframe
                ref={iframeRef}
                title="Live DOM Canvas"
                className="w-full h-full border-0 bg-transparent"
              />
            </div>
          </div>

          {/* Live GSAP Playback Controls */}
          <div id="playback-control-bar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
            <div className="flex items-center gap-2">
              <button
                id="playback-play-pause"
                data-animate="true"
                type="button"
                onClick={togglePlayPause}
                aria-label="Play / Pause"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                id="playback-reset"
                data-animate="true"
                type="button"
                onClick={handleReset}
                aria-label="Reset / Replay"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
              </button>
              <button
                id="playback-loop"
                data-animate="true"
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                aria-label="Loop"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  isLooping 
                    ? "border-primary bg-primary/20 text-primary" 
                    : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m17 2 4 4-4 4" />
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                  <path d="m7 22-4-4 4-4" />
                  <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            </div>

            {/* Timeline Scrubber Input */}
            <div className="flex items-center gap-3 flex-1 max-w-xs mx-4">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onChange={(e) => handleScrubberChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-surface-2 rounded-lg cursor-pointer"
              />
            </div>

            <span id="playback-time-counter" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 font-mono text-[11.5px] tabular-nums text-muted-foreground">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>
        </main>

        {/* RIGHT PANEL: Tabbed Inspector & Video Export */}
        <aside id="right-sidebar" data-animate="true" className="flex w-[360px] shrink-0 flex-col overflow-auto border-l border-border bg-surface">
          {/* AI Motion Director Prompt Section */}
          <section id="ai-motion-prompt" data-animate="true" className="border-b border-border p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">AI Motion Director</p>
            <textarea
              id="motion-prompt-input"
              data-animate="true"
              rows={4}
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              placeholder="Describe motion intent..."
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-[12px] leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              id="generate-motion-button"
              data-animate="true"
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateMotionCode}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Generating Motion...
                </>
              ) : (
                "Generate Motion Code (Live Preview)"
              )}
            </button>
          </section>

          {/* TABBED CONTAINER: Tab 1: Spatial JSON | Tab 2: Manual GSAP */}
          <section id="tabbed-inspector-section" data-animate="true" className="border-b border-border p-4">
            {/* Tab Switcher Header */}
            <div className="flex items-center gap-1 border-b border-border pb-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveRightTab("spatial")}
                className={`h-8 flex-1 rounded-lg text-[12px] font-medium transition-colors ${
                  activeRightTab === "spatial"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                }`}
              >
                Spatial JSON
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab("manual")}
                className={`h-8 flex-1 rounded-lg text-[12px] font-medium transition-colors ${
                  activeRightTab === "manual"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual GSAP
              </button>
            </div>

            {/* TAB 1: Spatial JSON */}
            {activeRightTab === "spatial" ? (
              <div id="spatial-tab-content">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    DOM Coordinate Tree
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Refresh Button */}
                    <button
                      id="spatial-refresh"
                      data-animate="true"
                      type="button"
                      onClick={updateCanvasAndSpatial}
                      aria-label="Refresh coordinates"
                      title="Recalculate Spatial Coordinates"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 3-6.7" />
                        <path d="M3 4v5h5" />
                      </svg>
                    </button>

                    {/* COPY JSON BUTTON */}
                    <button
                      id="spatial-copy-json"
                      data-animate="true"
                      type="button"
                      onClick={handleCopyJSON}
                      aria-label="Copy JSON"
                      title="Copy Spatial JSON"
                      className="flex h-7 px-2.5 items-center gap-1.5 rounded-md border border-border bg-surface-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Selectable / Copyable JSON Pre */}
                <pre
                  id="spatial-manifest"
                  data-animate="true"
                  className="overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11.5px] leading-5 text-code-str select-all cursor-text focus:outline-none max-h-56"
                >
                  {JSON.stringify(spatialManifest, null, 2)}
                </pre>
              </div>
            ) : (
              /* TAB 2: Manual GSAP Code Editor */
              <div id="manual-gsap-tab-content">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Custom GSAP Override Code
                  </span>
                  <span className="text-[10px] text-primary/80 font-mono">
                    Priority Override
                  </span>
                </div>
                <textarea
                  id="manual-code-editor"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    if (manualGsapError) setManualGsapError(null);
                  }}
                  placeholder="e.g. gsap.to('#streak-icon', { y: -30, duration: 1 });"
                  rows={6}
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-[12px] leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />

                {/* Primary Action Button: Apply Manual Motion */}
                <button
                  id="apply-manual-motion-button"
                  type="button"
                  onClick={handleApplyManualMotion}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[12.5px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Apply Manual Motion
                </button>

                {/* Error Badge for GSAP Syntax/Execution Errors */}
                {manualGsapError && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-[11px] text-red-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="font-mono text-[11px] leading-4 break-all">{manualGsapError}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Render Settings & Video Export Section */}
          <section id="render-settings" data-animate="true" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Timeline &amp; Video Export
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[30, 60].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFramerate(f as 30 | 60)}
                  className={`h-9 rounded-lg text-[12px] font-medium transition-colors ${
                    framerate === f
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f} FPS
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["mp4", "webm", "lottie"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`h-9 rounded-lg text-[12px] font-medium uppercase transition-colors ${
                    exportFormat === fmt
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Render & Download Video Button */}
            <button
              id="render-download-button"
              data-animate="true"
              type="button"
              disabled={isRendering}
              onClick={handleRenderDownloadVideo}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {isRendering ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Rendering MP4 via Puppeteer...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                  Render &amp; Download Video
                </>
              )}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
