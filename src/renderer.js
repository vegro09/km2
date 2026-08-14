/**
 * ============================================================================
 * KANTO MOTION — DETERMINISTIC FRAME-BY-FRAME HEADLESS RENDERING PIPELINE
 * ============================================================================
 * 
 * RESOLUTION OF THE STATIC-IMAGE / JITTER BUG:
 * ----------------------------------------------------------------------------
 * 1. PRE-CAPTURE ASSET READINESS:
 *    Waits for full DOM parsing, Web Fonts (`document.fonts.ready`), and all
 *    embedded `<img>` elements to finish downloading and decoding (`img.decode()`)
 *    before starting the frame loop, preventing blank or half-rendered initial frames.
 * 
 * 2. UNIVERSAL ANIMATION SCRUBBING:
 *    Freezes the real-time clock. Injects a deterministic time-seeking controller
 *    that directly scrubs `gsap.globalTimeline.time(currentTime)` and the native
 *    Web Animations API (`animation.currentTime`) to the exact fractional second
 *    corresponding to each sequential frame (`currentTime = frame / fps`).
 * 
 * 3. FORCED PAINT REFLOW (CRITICAL):
 *    Reading layout properties (`document.body.offsetHeight`, computed styles)
 *    and executing a double `requestAnimationFrame` cycle forces Chromium's
 *    Blink rendering engine and GPU rasterizer to flush layout calculations and
 *    repaint dirty visual surfaces BEFORE `page.screenshot()` captures the frame.
 * 
 * 4. FFMPEG MULTI-FORMAT COMPILATION:
 *    Assembles lossless sequential PNG frames into:
 *      - WebM (VP9 + Yuva420p) -> True Alpha Transparency for Web.
 *      - MP4 (H.264 + Yuv420p) -> Universal high-compatibility playback.
 *      - ProRes 4444 (.mov)    -> Lossless Master with Alpha for Premiere/AE/FCP.
 *      - PNG Sequence (.zip)   -> Compressed archive of numbered PNG frames.
 * ============================================================================
 */

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';
import { ZipArchive } from 'archiver';

/**
 * Renders an HTML/CSS/GSAP animation into a smooth, frame-accurate video file.
 * 
 * @param {Object} options
 * @param {string} [options.html=""] Raw HTML markup to animate
 * @param {string} [options.css=""] Raw CSS styling rules
 * @param {string} [options.js=""] Raw GSAP JavaScript animation code
 * @param {Object} [options.motionPlan=null] Optional AI keyframe motion plan
 * @param {number} [options.width=1920] Render canvas width (enforced even integer)
 * @param {number} [options.height=1080] Render canvas height (enforced even integer)
 * @param {number} [options.fps=30] Target frame rate (e.g., 30 or 60 FPS)
 * @param {number} [options.duration] Optional duration override (auto-extracted from GSAP if omitted)
 * @param {('mp4'|'webm'|'prores'|'png-sequence')} [options.format='mp4'] Output media format
 * @param {boolean} [options.transparent=false] Enable alpha channel transparency (omitBackground)
 * @param {string} [options.backgroundColor='#ffffff'] Canvas background color if not transparent
 * @param {string} [options.outputPath] Target file path for the rendered output
 * @param {Function} [options.onProgress] Progress callback ({ currentFrame, totalFrames, percent })
 * @returns {Promise<{ outputPath: string, duration: number, totalFrames: number, format: string, width: number, height: number, fps: number }>}
 */
export async function renderVideo(options = {}) {
  const htmlContent = options.html || '';
  const cssContent = options.css || '';
  const jsContent = options.js || '';
  const motionPlan = options.motionPlan || null;

  // Video encoders strictly require even dimensions (multiples of 2)
  let width = Math.floor((options.width || 1920) / 2) * 2;
  let height = Math.floor((options.height || 1080) / 2) * 2;
  const fps = Math.max(1, Math.min(120, Number(options.fps) || 30));
  const format = (options.format || 'mp4').toLowerCase();
  const transparent = Boolean(options.transparent);
  const backgroundColor = options.backgroundColor || '#ffffff';
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  // File extension mapping
  const extMap = {
    mp4: '.mp4',
    webm: '.webm',
    prores: '.mov',
    'png-sequence': '.zip'
  };
  const fileExt = extMap[format] || '.mp4';

  // Determine output path
  let outputPath = options.outputPath;
  if (!outputPath) {
    const rendersDir = path.resolve('./public/renders');
    if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    outputPath = path.join(rendersDir, `render_${timestamp}_${rand}${fileExt}`);
  }

  // Create temporary directory for sequential PNG frames
  const tempDirId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tempFrameDir = path.resolve(`./temp_frames_${tempDirId}`);
  if (!fs.existsSync(tempFrameDir)) {
    fs.mkdirSync(tempFrameDir, { recursive: true });
  }

  let browser = null;

  try {
    console.log(`[Renderer] Launching Headless Chrome (${width}x${height} @ ${fps} FPS, Format: ${format.toUpperCase()}, Alpha: ${transparent})...`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        '--mute-audio',
        `--window-size=${width},${height}`
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1
    });

    // Read bundled GSAP library from local node_modules
    const gsapPath = path.resolve('./node_modules/gsap/dist/gsap.min.js');
    const gsapScript = fs.existsSync(gsapPath) ? fs.readFileSync(gsapPath, 'utf8') : '';

    // Define background styling rules based on transparency configuration
    const bodyBgStyle = transparent
      ? 'background: transparent !important; background-color: transparent !important;'
      : `background: ${backgroundColor} !important; background-color: ${backgroundColor} !important;`;

    // Construct isolated, standalone HTML document
    const fullDocument = `
      <!DOCTYPE html>
      <html style="margin:0; padding:0; width:100%; height:100%; overflow:hidden; ${bodyBgStyle}">
        <head>
          <meta charset="utf-8" />
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              ${bodyBgStyle}
            }
            #kanto-root, #app-viewport {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            ${cssContent}
          </style>
          <script>${gsapScript}</script>
        </head>
        <body style="${bodyBgStyle}">
          <div id="kanto-root">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    // Step 1: Load Page and Await Full Document Parsing
    await page.setContent(fullDocument, { waitUntil: 'load', timeout: 25000 });

    // Step 1 (Cont.): Pre-Capture Asset Readiness (Fonts & Images)
    await page.evaluate(async () => {
      // 1. Wait for Web Fonts to finish layout loading
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 2. Wait for all external <img> tags to complete downloading and decoding
      const imageElements = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imageElements.map((img) => {
          if (img.complete) {
            return typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
          }
          return new Promise((resolve) => {
            img.onload = () => {
              (typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve()).then(resolve);
            };
            img.onerror = resolve; // Continue on 404 to avoid indefinite hang
          });
        })
      );
    });

    // Step 2: Initialize Universal Animation Controller & Duration Extraction
    const animationMeta = await page.evaluate(async ({ jsCode, plan, forcedDuration }) => {
      const gsap = window.gsap;
      if (!gsap) throw new Error('GSAP library failed to load inside headless context.');

      // Pause GSAP Ticker to eliminate real-time progression
      gsap.ticker.fps(120);
      gsap.globalTimeline.pause();
      gsap.globalTimeline.clear();

      // Pause any existing Web Animations API animations on the page
      if (typeof document.getAnimations === 'function') {
        document.getAnimations().forEach((anim) => anim.pause());
      }

      // 1. Apply AI motion plan if provided
      if (plan && Array.isArray(plan.elements_motion)) {
        plan.elements_motion.forEach((elem) => {
          const target = document.getElementById(elem.element_id) || document.querySelector(`[data-animate="${elem.element_id}"]`);
          if (!target) return;
          elem.keyframes.forEach((kf) => {
            gsap.to(target, {
              x: kf.delta_x,
              y: kf.delta_y,
              scale: kf.scale,
              opacity: kf.opacity,
              ease: kf.easing,
              duration: (kf.time_ms || 1000) / 1000
            });
          });
        });
      }

      // 2. Execute raw GSAP user script (Primary Animator)
      if (jsCode && jsCode.trim()) {
        try {
          const userRunner = new Function('gsap', 'document', 'window', jsCode);
          userRunner(gsap, document, window);
        } catch (e) {
          console.error('User GSAP script execution error:', e);
        }
      }

      // Ensure timeline is strictly paused at initial frame (0s)
      gsap.globalTimeline.pause();
      gsap.globalTimeline.time(0);

      // Extract accurate duration from active tween endpoints
      let computedDuration = 0;
      const children = gsap.globalTimeline.getChildren(true, true, true);
      for (const child of children) {
        if (typeof child.endTime === 'function') {
          const end = child.endTime();
          if (isFinite(end) && end > computedDuration) {
            computedDuration = end;
          }
        }
      }

      if (computedDuration <= 0 && isFinite(gsap.globalTimeline.duration()) && gsap.globalTimeline.duration() > 0) {
        computedDuration = gsap.globalTimeline.duration();
      }

      // Respect explicit user duration or enforce safe bounds [0.5s, 60s]
      if (forcedDuration && Number(forcedDuration) > 0) {
        computedDuration = Number(forcedDuration);
      } else {
        computedDuration = Math.min(Math.max(computedDuration || 2.0, 0.5), 60);
      }

      return {
        duration: computedDuration,
        tweensCount: children.length
      };
    }, {
      jsCode: jsContent,
      plan: motionPlan,
      forcedDuration: options.duration
    });

    const exactDuration = animationMeta.duration;
    const totalFrames = Math.max(1, Math.ceil(exactDuration * fps));

    console.log(`[Renderer] Animation initialized: ${exactDuration.toFixed(2)}s (${totalFrames} frames @ ${fps} FPS).`);

    // =========================================================================
    // STEP 2 & 3: DETERMINISTIC TIME-SEEKING & FORCED PAINT REFLOW LOOP
    // =========================================================================
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const targetTimeSec = (frameIndex / (totalFrames - 1 || 1)) * exactDuration;

      // 1. Scrub Timeline & 2. Force Paint Reflow
      await page.evaluate(async (currentTimeSec) => {
        // Universal GSAP Scrubbing
        if (window.gsap && window.gsap.globalTimeline) {
          window.gsap.globalTimeline.time(currentTimeSec);
        }

        // Universal Web Animations API / CSS Scrubbing
        if (typeof document.getAnimations === 'function') {
          document.getAnimations().forEach((anim) => {
            anim.currentTime = currentTimeSec * 1000;
          });
        }

        // FORCED PAINT REFLOW: Trigger layout recalculation on the DOM
        void document.body.offsetHeight;
        if (document.getElementById('kanto-root')) {
          void document.getElementById('kanto-root').offsetHeight;
        }

        // Flush render tree changes to the compositor
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });
      }, targetTimeSec);

      // 3. Capture Deterministic Frame Screenshot
      const frameFileName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
      const frameFilePath = path.join(tempFrameDir, frameFileName);

      await page.screenshot({
        path: frameFilePath,
        type: 'png',
        omitBackground: transparent
      });

      if (onProgress) {
        onProgress({
          currentFrame: frameIndex + 1,
          totalFrames,
          percent: Math.round(((frameIndex + 1) / totalFrames) * 100)
        });
      }

      if ((frameIndex + 1) % 30 === 0 || frameIndex + 1 === totalFrames) {
        console.log(`[Renderer] Rendered frame ${frameIndex + 1}/${totalFrames} (${Math.round(((frameIndex + 1) / totalFrames) * 100)}%)`);
      }
    }

    await browser.close();
    browser = null;

    // Ensure destination directory exists
    const outputDir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // =========================================================================
    // STEP 4: FFMPEG & ARCHIVER COMPILATION PIPELINE
    // =========================================================================
    console.log(`[Renderer] Compiling ${totalFrames} frames into ${format.toUpperCase()} (${outputPath})...`);

    if (format === 'png-sequence') {
      // Package sequential frames into a ZIP archive
      await new Promise((resolve, reject) => {
        const outputStream = fs.createWriteStream(outputPath);
        const archive = new ZipArchive({ zlib: { level: 6 } });

        outputStream.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(outputStream);

        archive.directory(tempFrameDir, false);
        archive.finalize();
      });
    } else {
      const ffmpegExecutable = ffmpegPath.replace(/\\/g, '/');
      const frameInputPattern = path.join(tempFrameDir, 'frame_%04d.png').replace(/\\/g, '/');
      const normalizedOutputPath = path.resolve(outputPath).replace(/\\/g, '/');

      let ffmpegArgs = '';

      if (format === 'webm') {
        // WebM with VP9 Alpha Channel Support (Transparent)
        ffmpegArgs = `"${ffmpegExecutable}" -y -framerate ${fps} -i "${frameInputPattern}" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 20 -auto-alt-ref 0 "${normalizedOutputPath}"`;
      } else if (format === 'prores') {
        // Apple ProRes 4444 with Alpha Channel (10-bit color, pro master)
        ffmpegArgs = `"${ffmpegExecutable}" -y -framerate ${fps} -i "${frameInputPattern}" -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -vendor apl0 "${normalizedOutputPath}"`;
      } else {
        // Universal H.264 MP4
        ffmpegArgs = `"${ffmpegExecutable}" -y -framerate ${fps} -i "${frameInputPattern}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 18 -movflags +faststart "${normalizedOutputPath}"`;
      }

      console.log(`[Renderer] Executing FFmpeg command: ${ffmpegArgs}`);
      execSync(ffmpegArgs, { stdio: 'pipe' });
    }

    console.log(`[Renderer] Render complete! File created at: ${outputPath}`);

    return {
      outputPath: path.resolve(outputPath),
      duration: exactDuration,
      totalFrames,
      format,
      width,
      height,
      fps
    };

  } catch (error) {
    console.error('[Renderer] Frame rendering pipeline encountered an error:', error);
    throw error;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    // Clean up temporary PNG frames directory
    if (fs.existsSync(tempFrameDir)) {
      try {
        fs.rmSync(tempFrameDir, { recursive: true, force: true });
        console.log(`[Renderer] Cleaned up temporary directory: ${tempFrameDir}`);
      } catch { /* ignore */ }
    }
  }
}

// Standalone execution test runner (node src/renderer.js)
if (process.argv.includes('--test') || process.argv.includes('--cli')) {
  (async () => {
    console.log('--- Running Standalone Renderer Test ---');
    const result = await renderVideo({
      html: '<div style="width:250px;height:120px;background:#3b82f6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;font-size:20px;font-weight:bold;">🔥 Smooth Render</div>',
      css: 'body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }',
      js: 'gsap.fromTo("div", { scale: 0.5, rotation: -15 }, { scale: 1.1, rotation: 0, duration: 1, yoyo: true, repeat: 1, ease: "power2.inOut" });',
      width: 1280,
      height: 720,
      fps: 30,
      format: 'webm',
      transparent: true,
      outputPath: path.resolve('./public/renders/standalone_test.webm')
    });
    console.log('Test completed successfully:', result);
  })().catch(console.error);
}
