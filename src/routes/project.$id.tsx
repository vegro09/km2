import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import {
  getProjectById,
  saveProject,
  Project,
  DEFAULT_HTML,
  DEFAULT_CSS,
  DEFAULT_JS
} from "../utils/projectsStore";

export const Route = createFileRoute("/project/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Edit Project ${params.id} — Kanto Motion` },
      {
        name: "description",
        content: "Interactive GSAP motion studio editor with real-time preview and auto-save.",
      },
    ],
  }),
  component: ProjectEditor,
});

type AspectRatioMode = "16:9" | "9:16" | "1:1";
type BgMode = "transparent" | "white" | "custom";

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

function ProjectEditor() {
  const { id: projectId } = Route.useParams();
  const navigate = useNavigate();

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

  // Export Background Style States
  const [bgMode, setBgMode] = useState<BgMode>("transparent");
  const [customBgColor, setCustomBgColor] = useState<string>("#111115");

  // Center Canvas & Animation States
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Production-Ready Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(2.0);
  const [scrubberProgress, setScrubberProgress] = useState(0); // 0 to 100 %
  const [isLooping, setIsLooping] = useState(false);

  const isLoopingRef = useRef(isLooping);
  const wasPlayingBeforeDragRef = useRef(false);

  // Keep ref synchronized with state
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  // Right Panel & Frame-Accurate Export States (Defaults: 30 FPS and MP4 Format)
  const [spatialManifest, setSpatialManifest] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const [framerate, setFramerate] = useState<30 | 60>(30);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm" | "lottie">("mp4");

  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [currentRenderFrame, setCurrentRenderFrame] = useState(0);
  const [totalRenderFrames, setTotalRenderFrames] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // Initial load of project by ID from localStorage
  useEffect(() => {
    if (!projectId) return;
    const loaded = getProjectById(projectId);
    if (loaded) {
      setProjectTitle(loaded.title || "Untitled Project");
      setHtmlCode(loaded.html || DEFAULT_HTML);
      setCssCode(loaded.css || DEFAULT_CSS);
      setManualCode(loaded.js || DEFAULT_JS);
      if (loaded.aspectRatio) setAspectRatio(loaded.aspectRatio);
    } else {
      const newProj: Project = {
        id: projectId,
        title: "Daily Streak Widget",
        html: DEFAULT_HTML,
        css: DEFAULT_CSS,
        js: DEFAULT_JS,
        aspectRatio: "16:9",
        updatedAt: new Date().toISOString()
      };
      saveProject(newProj);
      setProjectTitle(newProj.title);
    }
  }, [projectId]);

  // Auto-Save debounced by 500ms
  useEffect(() => {
    if (!projectId) return;
    const timer = setTimeout(() => {
      saveProject({
        id: projectId,
        title: projectTitle,
        html: htmlCode,
        css: cssCode,
        js: manualCode,
        aspectRatio: aspectRatio,
        updatedAt: new Date().toISOString()
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [projectId, projectTitle, htmlCode, cssCode, manualCode, aspectRatio]);

  // Back arrow handler forces immediate save before navigation
  const handleBackToDashboard = () => {
    if (projectId) {
      saveProject({
        id: projectId,
        title: projectTitle,
        html: htmlCode,
        css: cssCode,
        js: manualCode,
        aspectRatio: aspectRatio,
        updatedAt: new Date().toISOString()
      });
    }
    navigate({ to: "/dashboard" });
  };

  // Helper: Retrieve Active GSAP Instance
  const getActiveTimeline = useCallback(() => {
    if (timelineRef.current) return timelineRef.current;
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow as any;
      if (win.gsap?.globalTimeline) return win.gsap.globalTimeline;
    }
    return null;
  }, []);

  // Real Animation Duration Sanitizer
  const getCleanDuration = useCallback((tl: any): number => {
    if (!tl) return 2.0;

    try {
      if (typeof tl.duration === "function") {
        const d = tl.duration();
        if (isFinite(d) && !isNaN(d) && d > 0 && d < 100000) {
          return d;
        }
      }
    } catch {
      // ignore
    }

    if (typeof tl.getChildren === "function") {
      try {
        const children = tl.getChildren(true, true, true);
        if (children && children.length > 0) {
          const maxChildEnd = children.reduce((max: number, child: any) => {
            if (child === tl) return max;
            let childEnd = 0;
            if (typeof child.endTime === "function") {
              childEnd = child.endTime();
            } else if (typeof child.startTime === "function" && typeof child.duration === "function") {
              childEnd = child.startTime() + child.duration();
            }
            return Math.max(max, isFinite(childEnd) && childEnd < 100000 ? childEnd : 0);
          }, 0);

          if (maxChildEnd > 0) {
            return maxChildEnd;
          }
        }
      } catch {
        // ignore
      }
    }

    return 2.0;
  }, []);

  // Live Canvas DOM Injection
  const updateCanvasAndSpatial = useCallback(() => {
    if (!iframeRef.current) return;
    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    let bodyBg = "transparent";
    if (bgMode === "white") bodyBg = "#ffffff";
    else if (bgMode === "custom") bodyBg = customBgColor;

    const fullDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: ${bodyBg};
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            #kanto-root {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }
            ${cssCode}
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        </head>
        <body>
          <div id="kanto-root">${htmlCode}</div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(fullDoc);
    iframeDoc.close();

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
  }, [htmlCode, cssCode, bgMode, customBgColor]);

  useEffect(() => {
    updateCanvasAndSpatial();
  }, [updateCanvasAndSpatial]);

  // GSAP Animation Engine Execution
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
      repeat: 0,
      onUpdate: () => {
        const cur = tl.time();
        const p = tl.progress();
        setCurrentTime(cur);
        setScrubberProgress(p * 100);
      },
      onComplete: () => {
        if (isLoopingRef.current) {
          tl.restart();
        } else {
          setIsPlaying(false);
        }
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

    const singleDur = getCleanDuration(tl);
    setTotalDuration(singleDur);
    timelineRef.current = tl;
    setIsPlaying(true);
    return tl;
  }, [getCleanDuration]);

  // Dynamic JS Script Injection Pipeline
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

      if (gsapObj.globalTimeline && typeof gsapObj.globalTimeline.time === "function") {
        gsapObj.globalTimeline.clear();
        gsapObj.globalTimeline.time(0);
      }

      const runInIframeScope = iframeWin.Function('gsap', 'document', 'window', manualCode);
      runInIframeScope(gsapObj, iframeDoc, iframeWin);

      const newScript = iframeDoc.createElement("script");
      newScript.id = "user-motion-script";
      newScript.textContent = `/* Kanto User Motion Script */\n${manualCode}`;
      iframeDoc.body.appendChild(newScript);

      if (gsapObj.globalTimeline) {
        const globalTL = gsapObj.globalTimeline;
        const realDur = getCleanDuration(globalTL);
        setTotalDuration(realDur);

        globalTL.eventCallback("onUpdate", () => {
          const rawTime = globalTL.time();
          const cur = realDur > 0 ? (rawTime % realDur) : rawTime;
          const p = realDur > 0 ? (cur / realDur) : 0;
          setCurrentTime(cur);
          setScrubberProgress(p * 100);
        });

        globalTL.eventCallback("onComplete", () => {
          if (isLoopingRef.current) {
            globalTL.restart();
          } else {
            setIsPlaying(false);
          }
        });
      }
      
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

  // Play / Pause Toggle Engine
  const togglePlayPause = () => {
    const activeTL = getActiveTimeline();
    if (activeTL) {
      if (activeTL.paused()) {
        if (activeTL.progress() >= 0.99) {
          activeTL.restart();
        } else {
          activeTL.play();
        }
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

  // Restart & Loop Mechanics
  const handleRestart = () => {
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

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    isLoopingRef.current = nextLoop;

    const activeTL = getActiveTimeline();
    if (activeTL && typeof activeTL.eventCallback === "function") {
      activeTL.eventCallback("onComplete", () => {
        if (nextLoop) {
          activeTL.restart();
        } else {
          setIsPlaying(false);
        }
      });
    }
  };

  // Real-Time Scrubber Dragging Mechanics
  const handleScrubberStart = () => {
    const activeTL = getActiveTimeline();
    if (activeTL) {
      wasPlayingBeforeDragRef.current = !activeTL.paused();
      activeTL.pause();
    } else {
      wasPlayingBeforeDragRef.current = isPlaying;
    }
    setIsPlaying(false);
  };

  const handleScrubberInput = (pct: number) => {
    setScrubberProgress(pct);
    const normalizedProgress = Math.min(Math.max(pct / 100, 0), 1);
    setCurrentTime(normalizedProgress * totalDuration);

    const activeTL = getActiveTimeline();
    if (activeTL) {
      if (typeof activeTL.progress === "function") {
        activeTL.progress(normalizedProgress);
      } else if (typeof activeTL.seek === "function") {
        activeTL.seek(normalizedProgress * totalDuration);
      }
    }
  };

  const handleScrubberEnd = () => {
    const activeTL = getActiveTimeline();
    if (wasPlayingBeforeDragRef.current && activeTL) {
      activeTL.play();
      setIsPlaying(true);
    }
  };

  // ---------------------------------------------------------------------------
  // COMPLETE OVERHAUL: Iframe-Internal html2canvas Rasterization Pipeline
  // Root Fix: Capture GSAP inline transforms from iframe's own DOM context.
  // ---------------------------------------------------------------------------
  const handleRenderDownloadVideo = async () => {
    const iframe = iframeRef.current;
    if (!iframe) {
      setRenderError("Iframe canvas reference is not mounted.");
      return;
    }

    const iframeWin = iframe.contentWindow as any;
    const iframeDoc = iframe.contentDocument;
    if (!iframeWin || !iframeDoc || !iframeDoc.body) {
      setRenderError("Iframe document is not accessible. Ensure preview is loaded.");
      return;
    }

    // Verify html2canvas is loaded in iframe scope
    if (typeof iframeWin.html2canvas !== "function") {
      setRenderError(
        "html2canvas is not loaded in the canvas iframe. Please wait a moment and try again, or click 'Run JS Motion' to reload the preview."
      );
      return;
    }

    const activeTL = getActiveTimeline();
    if (!activeTL) {
      setRenderError("No active GSAP animation timeline detected. Run the animation first.");
      return;
    }

    // ── Setup render state ────────────────────────────────────────────────────
    setIsRendering(true);
    setRenderError(null);
    setCurrentRenderFrame(0);
    setRenderProgress(0);
    setRenderedVideoUrl(null);

    const wasPausedBefore = activeTL.paused();
    activeTL.pause();
    setIsPlaying(false);

    // Disable looping for clean single-cycle export
    if (typeof activeTL.repeat === "function") activeTL.repeat(0);
    if (typeof activeTL.eventCallback === "function") activeTL.eventCallback("onComplete", null);

    try {
      // ── Calculate exact frame bounds ─────────────────────────────────────────
      const exactDuration = getCleanDuration(activeTL);
      const selectedFPS = framerate;
      const totalFrames = Math.max(1, Math.ceil(exactDuration * selectedFPS));

      setTotalDuration(exactDuration);
      setTotalRenderFrames(totalFrames);

      // Target resolution for export
      let exportWidth = 1920;
      let exportHeight = 1080;
      if (aspectRatio === "9:16") { exportWidth = 1080; exportHeight = 1920; }
      else if (aspectRatio === "1:1") { exportWidth = 1080; exportHeight = 1080; }

      // ── Output canvas for MediaRecorder ──────────────────────────────────────
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = exportWidth;
      outputCanvas.height = exportHeight;
      const ctx = outputCanvas.getContext("2d", { alpha: bgMode === "transparent" });
      if (!ctx) throw new Error("Cannot create 2D canvas context for output.");

      // ── Detect best supported mimeType ────────────────────────────────────────
      const candidateMimes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mimeType = candidateMimes.find(
        (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
      ) ?? "video/webm";

      // ── Setup MediaRecorder on output canvas stream ───────────────────────────
      const stream = outputCanvas.captureStream(0);
      const track = stream.getVideoTracks()[0] as any;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 14_000_000 });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recorderDone = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          if (chunks.length === 0) {
            reject(new Error("MediaRecorder captured 0 bytes — no frames were encoded."));
          } else {
            resolve(new Blob(chunks, { type: mimeType }));
          }
        };
        recorder.onerror = (e: any) => reject(e.error ?? new Error("MediaRecorder stream error."));
      });

      recorder.start();

      // ── Target element to rasterize ───────────────────────────────────────────
      // CRITICAL: must be inside iframe so html2canvas sees GSAP inline transforms
      const targetEl: HTMLElement =
        iframeDoc.getElementById("kanto-root") ??
        iframeDoc.querySelector("#app-viewport") ??
        iframeDoc.body;

      // ── Measure target element's natural viewport size ────────────────────────
      const targetRect = targetEl.getBoundingClientRect();
      const captureW = Math.max(targetRect.width || iframeWin.innerWidth || 1920, 1);
      const captureH = Math.max(targetRect.height || iframeWin.innerHeight || 1080, 1);
      const scaleFactor = Math.max(exportWidth / captureW, exportHeight / captureH);

      // ── Wait for fonts to be ready inside iframe ──────────────────────────────
      if (iframeDoc.fonts && typeof iframeDoc.fonts.ready?.then === "function") {
        await iframeDoc.fonts.ready;
      }

      // ── html2canvas options ────────────────────────────────────────────────────
      const h2cOptions: Record<string, any> = {
        width: captureW,
        height: captureH,
        scale: scaleFactor,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: bgMode === "transparent" ? null
          : bgMode === "white" ? "#ffffff"
          : customBgColor,
        imageTimeout: 0,
        removeContainer: true,
        windowWidth: iframeWin.innerWidth || captureW,
        windowHeight: iframeWin.innerHeight || captureH,
      };

      let blankFrameCount = 0;

      // ── Deterministic frame-by-frame loop ─────────────────────────────────────
      for (let frame = 0; frame < totalFrames; frame++) {
        // Step 1: Advance GSAP to exact progress position
        const progress = totalFrames === 1 ? 0 : frame / (totalFrames - 1);
        activeTL.progress(progress);

        // Step 2: Double-rAF settle — wait for GSAP to flush layout recalculation
        await new Promise<void>((r) => iframeWin.requestAnimationFrame(() => iframeWin.requestAnimationFrame(() => r())));

        // Step 3: Rasterize target element inside iframe JS context
        // html2canvas runs in iframeWin.html2canvas — sees live computed styles
        let frameCanvas: HTMLCanvasElement | null = null;
        try {
          frameCanvas = await iframeWin.html2canvas(targetEl, h2cOptions);
        } catch (captureErr: any) {
          console.warn(`Frame ${frame}: html2canvas error — ${captureErr?.message}`);
          // On single-frame failure, draw last valid frame or blank
        }

        // Step 4: Pixel sanity check — detect blank/all-transparent frames
        let isValidFrame = false;
        if (frameCanvas && frameCanvas.width > 0 && frameCanvas.height > 0) {
          const frameCtx = frameCanvas.getContext("2d");
          if (frameCtx) {

            const pixelData = frameCtx.getImageData(
              Math.floor(frameCanvas.width / 4),
              Math.floor(frameCanvas.height / 4),
              Math.min(50, frameCanvas.width),
              Math.min(50, frameCanvas.height)
            ).data;
            // Check if there's any non-transparent pixel activity
            for (let i = 3; i < pixelData.length; i += 4) {
              if (pixelData[i] > 10) {
                isValidFrame = true;
                break;
              }
            }
            // Also accept if background mode is set (bg pixels count)
            if (!isValidFrame && bgMode !== "transparent") {
              for (let i = 0; i < pixelData.length; i += 4) {
                if (pixelData[i] > 0 || pixelData[i + 1] > 0 || pixelData[i + 2] > 0) {
                  isValidFrame = true;
                  break;
                }
              }
            }
          }
        }

        if (!isValidFrame) {
          blankFrameCount++;
          console.warn(`Frame ${frame + 1} failed pixel sanity check (blank). Blank count: ${blankFrameCount}`);
          if (blankFrameCount > Math.ceil(totalFrames * 0.9)) {
            throw new Error(
              `Export aborted: ${blankFrameCount} of ${totalFrames} frames are blank. " +
              "Ensure the animation content is visible in the preview canvas before exporting.`
            );
          }
        }

        // Step 5: Composite frameCanvas onto output canvas & push to MediaRecorder
        ctx.clearRect(0, 0, exportWidth, exportHeight);

        // Fill background if applicable
        if (bgMode === "white") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        } else if (bgMode === "custom") {
          ctx.fillStyle = customBgColor;
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }

        if (frameCanvas) {
          // Center-crop scale the captured frame onto the output canvas
          const scaleX = exportWidth / frameCanvas.width;
          const scaleY = exportHeight / frameCanvas.height;
          const drawScale = Math.max(scaleX, scaleY);
          const drawW = frameCanvas.width * drawScale;
          const drawH = frameCanvas.height * drawScale;
          const drawX = (exportWidth - drawW) / 2;
          const drawY = (exportHeight - drawH) / 2;
          ctx.drawImage(frameCanvas, drawX, drawY, drawW, drawH);
        }

        // Request frame from captureStream track
        if (track && typeof track.requestFrame === "function") {
          track.requestFrame();
        }

        // Step 6: Update progress UI
        const frameNum = frame + 1;
        setCurrentRenderFrame(frameNum);
        setRenderProgress(Math.round((frameNum / totalFrames) * 100));

        // Yield to React so modal can repaint
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      // ── Stop recorder & await final blob ─────────────────────────────────────
      recorder.stop();
      const videoBlob = await recorderDone;

      // ── Guaranteed Explicit Download Mechanism ────────────────────────────────
      const downloadUrl = URL.createObjectURL(videoBlob);
      const titleSlug = projectTitle.trim().replace(/\s+/g, "_") || "kanto_motion";
      // Always use .webm extension since MediaRecorder produces WebM
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const fileName = `${titleSlug}_${selectedFPS}fps.${ext}`;

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 15_000);
      setRenderedVideoUrl(downloadUrl);

      if (blankFrameCount > 0) {
        console.warn(`Export completed with ${blankFrameCount} blank frame(s) out of ${totalFrames}.`);
      }

    } catch (err: any) {
      console.error("Export Failed:", err);
      setRenderError(err.message ?? "Unknown error during frame-by-frame rendering.");
    } finally {
      // Always restore state regardless of success/failure
      setIsRendering(false);
      try {
        activeTL.progress(0);
        if (!wasPausedBefore) {
          activeTL.play();
          setIsPlaying(true);
        }
      } catch {
        // ignore cleanup errors
      }
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
      {/* Task 4: Render Status Modal Overlay with Explicit Metrics */}
      {isRendering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-inner">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-foreground">Rendering Video</h3>
            <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">
              Rendering Frame {currentRenderFrame} / {totalRenderFrames} ({renderProgress}%)
            </p>

            {/* Progress Bar */}
            <div className="mt-5 w-full bg-surface-2 rounded-full h-2.5 overflow-hidden border border-border">
              <div
                className="bg-primary h-full transition-all duration-75 ease-out rounded-full"
                style={{ width: `${renderProgress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>{totalDuration.toFixed(2)}s @ {framerate} FPS</span>
              <span className="text-primary font-semibold">{renderProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Task 4: Error Toast Notification */}
      {renderError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-950/90 px-4 py-3 text-red-200 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="text-[12px] font-medium">
            <p className="font-semibold text-red-300">Export Failed</p>
            <p className="text-[11px] text-red-300/80">{renderError}</p>
          </div>
          <button
            type="button"
            onClick={() => setRenderError(null)}
            className="ml-2 text-red-400 hover:text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <header id="studio-topbar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <button
            id="studio-back-button"
            data-animate="true"
            type="button"
            onClick={handleBackToDashboard}
            aria-label="Back to Dashboard"
            title="Back to Projects Dashboard (Immediate Auto-Save)"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

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

        <div className="flex items-center gap-2">
          {renderedVideoUrl && (
            <a
              href={renderedVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
            >
              Latest Rendered Video 🎬
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

          {/* Timeline Controller */}
          <div id="playback-control-bar" data-animate="true" className="glass flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
            <div className="flex items-center gap-2">
              <button
                id="playback-play-pause"
                data-animate="true"
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pause Timeline" : "Play Timeline"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                id="playback-restart"
                data-animate="true"
                type="button"
                onClick={handleRestart}
                aria-label="Restart Timeline"
                title="Restart Timeline (↻)"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
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
                onClick={toggleLoop}
                aria-label="Toggle Loop"
                title={isLooping ? "Loop Enabled (Auto-Restart)" : "Loop Disabled"}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  isLooping
                    ? "border-primary bg-primary/20 text-primary font-bold shadow-sm shadow-primary/20"
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

            <div className="flex items-center gap-3 flex-1 max-w-sm mx-6">
              <input
                id="timeline-scrubber"
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={scrubberProgress}
                onMouseDown={handleScrubberStart}
                onTouchStart={handleScrubberStart}
                onChange={(e) => handleScrubberInput(parseFloat(e.target.value))}
                onMouseUp={handleScrubberEnd}
                onTouchEnd={handleScrubberEnd}
                className="w-full accent-primary h-2 bg-surface-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                id="playback-time-counter"
                data-animate="true"
                className="rounded-lg border border-border bg-surface-2 px-3 py-1 font-mono text-[11.5px] tabular-nums text-muted-foreground"
              >
                {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </span>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: Tabbed Inspector & Export Engine */}
        <aside id="right-sidebar" data-animate="true" className="flex w-[360px] shrink-0 flex-col overflow-auto border-l border-border bg-surface">
          <section id="tabbed-inspector-section" data-animate="true" className="border-b border-border p-4">
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

            {activeRightTab === "spatial" ? (
              <div id="spatial-tab-content">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    DOM Coordinate Tree
                  </span>
                  <div className="flex items-center gap-1.5">
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

                <pre
                  id="spatial-manifest"
                  data-animate="true"
                  className="overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11.5px] leading-5 text-code-str select-all cursor-text focus:outline-none max-h-56"
                >
                  {JSON.stringify(spatialManifest, null, 2)}
                </pre>
              </div>
            ) : (
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

          {/* Export Settings & Background Controls (Default: MP4 & 30 FPS) */}
          <section id="render-settings" data-animate="true" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              High-Fidelity Export Engine
            </p>

            <div className="mt-3">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Background Style
              </p>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border border-border bg-surface-2">
                <button
                  id="bg-transparent-button"
                  type="button"
                  onClick={() => setBgMode("transparent")}
                  className={`h-8 rounded-lg text-[11.5px] font-medium transition-colors ${
                    bgMode === "transparent"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Transparent
                </button>
                <button
                  id="bg-white-button"
                  type="button"
                  onClick={() => setBgMode("white")}
                  className={`h-8 rounded-lg text-[11.5px] font-medium transition-colors ${
                    bgMode === "white"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  White
                </button>
                <button
                  id="bg-custom-button"
                  type="button"
                  onClick={() => setBgMode("custom")}
                  className={`h-8 rounded-lg text-[11.5px] font-medium transition-colors ${
                    bgMode === "custom"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom
                </button>
              </div>

              {bgMode === "custom" && (
                <div className="mt-2 flex items-center justify-between gap-3 p-2 rounded-xl border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground font-mono">Hex Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="bg-color-picker"
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="h-7 w-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-foreground uppercase">{customBgColor}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Target Framerate
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[30, 60].map((f) => (
                  <button
                    key={f}
                    id={`fps-${f}`}
                    type="button"
                    onClick={() => setFramerate(f as 30 | 60)}
                    className={`h-9 rounded-lg text-[12px] font-medium transition-colors ${
                      framerate === f
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f} FPS
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Export Format
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["mp4", "webm", "lottie"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    id={`fmt-${fmt}`}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`h-9 rounded-lg text-[12px] font-medium uppercase transition-colors ${
                      exportFormat === fmt
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

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
                  Rendering Frames...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                  Render &amp; Download {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
