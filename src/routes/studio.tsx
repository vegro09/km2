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

const DEFAULT_JS = `// Custom GSAP Animation Script
gsap.to("#streak-icon", {
  y: -15,
  scale: 1.2,
  duration: 0.8,
  ease: "back.out(1.7)"
});`;

type AspectRatioMode = "16:9" | "9:16" | "1:1";

const ASPECT_RATIO_CONFIGS: Record<AspectRatioMode, { label: string; maxWidth: string; aspectClass: string; resolution: string }> = {
  "16:9": {
    label: "16:9 Desktop",
    maxWidth: "max-w-[960px]",
    aspectClass: "aspect-video",
    resolution: "1920 × 1080"
  },
  "9:16": {
    label: "9:16 Mobile",
    maxWidth: "max-w-[380px]",
    aspectClass: "aspect-[9/16]",
    resolution: "1080 × 1920"
  },
  "1:1": {
    label: "1:1 Square",
    maxWidth: "max-w-[540px]",
    aspectClass: "aspect-square",
    resolution: "1080 × 1080"
  }
};

function Studio() {
  // Project Info State
  const [projectTitle, setProjectTitle] = useState("Daily Streak Widget Editor");

  // Left Panel States
  const [activeLeftTab, setActiveLeftTab] = useState<"code" | "dom">("code");
  const [activeCodeTab, setActiveCodeTab] = useState<"html" | "css" | "js">("html");
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);

  // Viewport Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("16:9");

  // Right Panel States & Tabs
  const [activeRightTab, setActiveRightTab] = useState<"spatial" | "manual">("spatial");
  const [manualCode, setManualCode] = useState(DEFAULT_JS);
  const [manualGsapError, setManualGsapError] = useState<string | null>(null);

  // Center Canvas & Animation States
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(2.0);
  const [isLooping, setIsLooping] = useState(false);

  const [, setIsDraggingScrubber] = useState(false);
  const wasPlayingBeforeDrag = useRef(false);

  // Right Panel & Export States
  const [spatialManifest, setSpatialManifest] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const [framerate, setFramerate] = useState<30 | 60>(30);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm" | "lottie">("mp4");
  const [isRendering, setIsRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // Persist project data into localStorage for Dashboard sync
  useEffect(() => {
    try {
      const existingRaw = localStorage.getItem("kanto_projects");
      let list = existingRaw ? JSON.parse(existingRaw) : [];
      const currentId = "streak-card-proj";
      const updatedProj = {
        id: currentId,
        title: projectTitle,
        updatedAt: "Just now",
        html: htmlCode,
        css: cssCode,
        js: manualCode,
        kind: "streak"
      };
      const idx = list.findIndex((p: any) => p.id === currentId);
      if (idx >= 0) {
        list[idx] = updatedProj;
      } else {
        list.unshift(updatedProj);
      }
      localStorage.setItem("kanto_projects", JSON.stringify(list));
    } catch {
      // Ignore quota restrictions
    }
  }, [projectTitle, htmlCode, cssCode, manualCode]);

  // ---------------------------------------------------------------------------
  // Helper: Retrieve Active GSAP Instance from Timeline or Iframe Window
  // ---------------------------------------------------------------------------
  const getActiveTimeline = useCallback(() => {
    if (timelineRef.current) return timelineRef.current;
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow as any;
      if (win.gsap?.globalTimeline) return win.gsap.globalTimeline;
    }
    return null;
  }, []);

  // Helper: Extract finite single-iteration duration
  const getCleanDuration = useCallback((tl: any) => {
    if (!tl) return 2.0;
    const rawDur = typeof tl.duration === "function" ? tl.duration() : 2.0;
    if (typeof rawDur === "number" && isFinite(rawDur) && rawDur > 0) {
      return rawDur;
    }
    return 2.0;
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Live Canvas DOM Injection & GSAP Auto-Injection into Iframe
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
          <!-- GSAP Auto-Injection into Canvas Iframe Head -->
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
  // 2. Client-Side Live GSAP Animation Preview Engine
  // ---------------------------------------------------------------------------
  const buildLiveAnimation = useCallback((keyframeSequence?: any[]) => {
    if (!iframeRef.current) return;
    const iframeWin = iframeRef.current.contentWindow as any;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeWin || !iframeDoc) return;

    const gsapObj = iframeWin.gsap || gsap;

    if (gsapObj && gsapObj.killTweensOf) {
      gsapObj.killTweensOf("*");
    }
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    if (iframeDoc.body) {
      const targets = iframeDoc.querySelectorAll('[id], [data-animate="true"], div, img, h1, h2, h3, p, span, svg');
      targets.forEach((el: any) => {
        if (gsapObj && gsapObj.set) {
          gsapObj.set(el, { clearProps: "all" });
        }
        el.removeAttribute("style");
      });
    }

    const tl = gsapObj.timeline({
      paused: false,
      repeat: isLooping ? -1 : 0,
      onUpdate: () => {
        const singleDur = getCleanDuration(tl);
        const t = tl.time() % singleDur;
        setCurrentTime(t);
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

    const cleanDur = getCleanDuration(tl);
    setDuration(cleanDur);
    timelineRef.current = tl;
    setIsPlaying(true);
    return tl;
  }, [isLooping, getCleanDuration]);

  // ---------------------------------------------------------------------------
  // 3. Dynamic Script Injection Pipeline & Iframe Scope Execution Engine
  // ---------------------------------------------------------------------------
  const handleApplyManualMotion = useCallback(() => {
    if (!iframeRef.current) return;
    const iframeWin = iframeRef.current.contentWindow as any;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeWin || !iframeDoc) return;

    const gsapObj = iframeWin.gsap || gsap;

    if (gsapObj && gsapObj.killTweensOf) {
      gsapObj.killTweensOf("*");
    }
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    if (iframeDoc.body) {
      const targets = iframeDoc.querySelectorAll('[id], [data-animate="true"], div, img, h1, h2, h3, p, span, svg');
      targets.forEach((el: any) => {
        if (gsapObj && gsapObj.set) {
          gsapObj.set(el, { clearProps: "all" });
        }
        el.removeAttribute("style");
      });
    }

    setManualGsapError(null);

    try {
      const existingScript = iframeDoc.getElementById("user-motion-script");
      if (existingScript) {
        existingScript.remove();
      }

      const runInIframeScope = iframeWin.Function('gsap', 'document', 'window', manualCode);
      runInIframeScope(gsapObj, iframeDoc, iframeWin);

      const newScript = iframeDoc.createElement("script");
      newScript.id = "user-motion-script";
      newScript.textContent = `/* Kanto User Motion Script */\n${manualCode}`;
      iframeDoc.body.appendChild(newScript);

      let cleanDur = 2.0;
      if (gsapObj.globalTimeline) {
        cleanDur = getCleanDuration(gsapObj.globalTimeline);
      }
      
      setDuration(cleanDur);
      setIsPlaying(true);
    } catch (err: any) {
      setManualGsapError(err.message || "Syntax or Execution Error in GSAP Code");
    }
  }, [manualCode, getCleanDuration]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "KANTO_GSAP_ERROR") {
        setManualGsapError(event.data.message);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!manualCode || !manualCode.trim()) return;
    const timer = setTimeout(() => {
      handleApplyManualMotion();
    }, 450);
    return () => clearTimeout(timer);
  }, [manualCode, handleApplyManualMotion]);

  // ---------------------------------------------------------------------------
  // 4. Player Controls: Play/Pause, Replay, Loop, Scrubber Seeking
  // ---------------------------------------------------------------------------
  const togglePlayPause = () => {
    const activeTL = getActiveTimeline();
    if (activeTL) {
      if (activeTL.paused()) {
        activeTL.play();
        setIsPlaying(true);
      } else {
        activeTL.pause();
        setIsPlaying(false);
      }
    } else {
      if (manualCode && manualCode.trim()) {
        handleApplyManualMotion();
      } else {
        buildLiveAnimation();
      }
    }
  };

  const handleReset = () => {
    const activeTL = getActiveTimeline();
    if (activeTL && typeof activeTL.restart === "function") {
      activeTL.restart();
      setIsPlaying(true);
    } else if (manualCode && manualCode.trim()) {
      handleApplyManualMotion();
    } else {
      const tl = buildLiveAnimation();
      if (tl) {
        tl.restart();
        setIsPlaying(true);
      }
    }
  };

  const toggleLooping = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    const activeTL = getActiveTimeline();
    if (activeTL && typeof activeTL.repeat === "function") {
      activeTL.repeat(nextLoop ? -1 : 0);
    }
  };

  const handleScrubberStart = () => {
    const activeTL = getActiveTimeline();
    if (activeTL) {
      wasPlayingBeforeDrag.current = !activeTL.paused();
      activeTL.pause();
    } else {
      wasPlayingBeforeDrag.current = isPlaying;
    }
    setIsDraggingScrubber(true);
    setIsPlaying(false);
  };

  const handleScrubberChange = (val: number) => {
    setCurrentTime(val);
    const activeTL = getActiveTimeline();
    if (activeTL) {
      const cleanDur = getCleanDuration(activeTL);
      const normalizedProgress = Math.min(Math.max(val / cleanDur, 0), 1);
      
      if (typeof activeTL.progress === "function") {
        activeTL.progress(normalizedProgress);
      } else if (typeof activeTL.seek === "function") {
        activeTL.seek(val);
      }
    }
  };

  const handleScrubberEnd = () => {
    setIsDraggingScrubber(false);
    const activeTL = getActiveTimeline();
    if (wasPlayingBeforeDrag.current && activeTL) {
      activeTL.play();
      setIsPlaying(true);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Render & Download Video Button
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
          manualCode: manualCode
        })
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        const fullUrl = `http://localhost:7007${data.videoUrl}`;
        setRenderedVideoUrl(fullUrl);

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

  const handleCopyJSON = () => {
    const jsonStr = JSON.stringify(spatialManifest, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parsedDomElements = Object.keys(spatialManifest).map((key) => ({
    id: key,
    tag: key.startsWith("#") ? "elem" : "div",
    depth: key === "#streak-card" ? 0 : 1
  }));

  const activeAspectConfig = ASPECT_RATIO_CONFIGS[aspectRatio];

  return (
    <div id="studio-screen" data-animate="true" className="flex h-screen flex-col bg-background select-none">
      {/* Task 2: Top Navigation Bar Refactoring */}
      <header id="studio-topbar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        {/* Top-Left: Clean Back Arrow Icon Button to Projects Dashboard */}
        <div className="flex items-center gap-2">
          <Link
            id="studio-back-button"
            data-animate="true"
            to="/dashboard"
            aria-label="Back to Dashboard"
            title="Back to Projects Dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        {/* Top-Center: Editable Project Title Display */}
        <div className="flex items-center justify-center">
          <input
            id="studio-project-title-input"
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="Project Title..."
            className="bg-transparent text-center text-[13.5px] font-semibold text-foreground border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-3 py-1 transition-colors rounded-lg"
          />
        </div>

        {/* Top-Right: Clean Header Actions */}
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
              {/* Code Editor Sub-Tabs ([HTML] | [CSS] | [JS]) */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("html")}
                    className={`px-3 py-1 text-[11px] font-mono rounded-md transition-colors ${
                      activeCodeTab === "html"
                        ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
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
                        ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("js")}
                    className={`px-3 py-1 text-[11px] font-mono rounded-md transition-colors ${
                      activeCodeTab === "js"
                        ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    JS
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Live Editing
                </span>
              </div>

              {/* Editable Textarea */}
              <div className="relative flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-background">
                {activeCodeTab === "html" && (
                  <textarea
                    id="html-code-input"
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    placeholder="Enter HTML markup here..."
                    className="h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-[12px] leading-5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
                  />
                )}
                {activeCodeTab === "css" && (
                  <textarea
                    id="css-code-input"
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    placeholder="Enter CSS styles here..."
                    className="h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-[12px] leading-5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
                  />
                )}
                {activeCodeTab === "js" && (
                  <div className="flex flex-col h-full">
                    <textarea
                      id="js-code-input"
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value);
                        if (manualGsapError) setManualGsapError(null);
                      }}
                      placeholder="Enter GSAP animation script here..."
                      className="flex-1 w-full resize-none border-0 bg-transparent p-3 font-mono text-[12px] leading-5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
                    />

                    {manualGsapError && (
                      <div className="m-2 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="font-mono text-[10.5px] leading-3.5 break-all">{manualGsapError}</span>
                      </div>
                    )}

                    <div className="p-2 border-t border-border bg-surface-2/50 rounded-b-xl flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        GSAP v3.12 Live Engine
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyManualMotion}
                        className="px-3 py-1 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Run JS Motion
                      </button>
                    </div>
                  </div>
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
          {/* Top Bar Aspect Ratio Switcher */}
          <div id="canvas-toolbar" data-animate="true" className="flex h-12 items-center justify-between border-b border-border px-4">
            <div className="flex gap-1">
              {(["16:9", "9:16", "1:1"] as AspectRatioMode[]).map((mode) => (
                <button
                  key={mode}
                  id={`aspect-${mode.replace(":", "-")}`}
                  data-animate="true"
                  type="button"
                  onClick={() => setAspectRatio(mode)}
                  className={`h-8 rounded-lg px-3 text-[12px] font-medium transition-all duration-200 ${
                    aspectRatio === mode
                      ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                      : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ASPECT_RATIO_CONFIGS[mode].label}
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
              <span id="canvas-resolution" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-[11.5px] font-mono text-muted-foreground">
                {activeAspectConfig.resolution}
              </span>
            </div>
          </div>

          {/* Dynamic Viewport Container with Smooth CSS Resize Transition */}
          <div className="grid-bg flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
            <div
              id="canvas-stage"
              data-animate="true"
              className={`flex w-full ${activeAspectConfig.maxWidth} ${activeAspectConfig.aspectClass} items-center justify-center rounded-2xl border border-border bg-background shadow-2xl overflow-hidden transition-all duration-300 ease-in-out`}
            >
              <iframe
                ref={iframeRef}
                title="Live DOM Canvas"
                className="w-full h-full border-0 bg-transparent"
              />
            </div>
          </div>

          {/* Live GSAP Playback Controls & Real-Time Scrubber */}
          <div id="playback-control-bar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
            <div className="flex items-center gap-2">
              {/* Play / Pause Toggle Button */}
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
              {/* Replay Button */}
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
              {/* Loop Toggle Button */}
              <button
                id="playback-loop"
                data-animate="true"
                type="button"
                onClick={toggleLooping}
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

            {/* Interactive Timeline Scrubber Slider */}
            <div className="flex items-center gap-3 flex-1 max-w-xs mx-4">
              <input
                id="timeline-scrubber"
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onMouseDown={handleScrubberStart}
                onTouchStart={handleScrubberStart}
                onChange={(e) => handleScrubberChange(parseFloat(e.target.value))}
                onMouseUp={handleScrubberEnd}
                onTouchEnd={handleScrubberEnd}
                className="w-full accent-primary h-1.5 bg-surface-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Dynamic Time Counter Display */}
            <span id="playback-time-counter" data-animate="true" className="rounded-lg border border-border bg-surface-2 px-3 py-1 font-mono text-[11.5px] tabular-nums text-muted-foreground">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>
        </main>

        {/* RIGHT PANEL: Tabbed Inspector & Video Export (AI Section Removed) */}
        <aside id="right-sidebar" data-animate="true" className="flex w-[360px] shrink-0 flex-col overflow-auto border-l border-border bg-surface">
          {/* Task 1: Tabbed Inspector shifted directly to the top of Right Sidebar */}
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
