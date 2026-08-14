import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';
import { ZipArchive } from 'archiver';

/**
 * Modern Deterministic Frame-by-Frame Headless Rendering Pipeline
 * 
 * @param {Object} options
 * @param {string} [options.html=""] Raw HTML markup
 * @param {string} [options.css=""] Raw CSS styling
 * @param {string} [options.js=""] Raw GSAP JavaScript code
 * @param {Object} [options.motionPlan=null] Optional AI keyframe motion plan
 * @param {number} [options.width=1920] Target render width (must be even integer)
 * @param {number} [options.height=1080] Target render height (must be even integer)
 * @param {number} [options.fps=30] Framerate (e.g. 30, 60)
 * @param {number} [options.duration] Optional duration in seconds (auto-calculated from GSAP if omitted)
 * @param {('mp4'|'webm'|'prores'|'png-sequence')} [options.format='mp4'] Export format
 * @param {boolean} [options.transparent=false] Enable alpha channel transparency (omitBackground)
 * @param {string} [options.backgroundColor='#ffffff'] Background color if transparent=false
 * @param {string} [options.outputPath] Path for the output file
 * @param {Function} [options.onProgress] Optional progress callback: ({ currentFrame, totalFrames, percent }) => void
 * @returns {Promise<{ outputPath: string, duration: number, totalFrames: number, format: string }>}
 */
export async function renderVideo(options = {}) {
  // Normalize & validate parameters
  const htmlContent = options.html || '';
  const cssContent = options.css || '';
  const jsContent = options.js || '';
  const motionPlan = options.motionPlan || null;

  // Enforce even pixel dimensions required by video encoders
  let width = Math.floor((options.width || 1920) / 2) * 2;
  let height = Math.floor((options.height || 1080) / 2) * 2;
  const fps = Math.max(1, Math.min(120, Number(options.fps) || 30));
  const format = (options.format || 'mp4').toLowerCase();
  const transparent = Boolean(options.transparent);
  const backgroundColor = options.backgroundColor || '#ffffff';
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  // Determine output file path
  const extMap = {
    mp4: '.mp4',
    webm: '.webm',
    prores: '.mov',
    'png-sequence': '.zip'
  };
  const fileExt = extMap[format] || '.mp4';

  let outputPath = options.outputPath;
  if (!outputPath) {
    const rendersDir = path.resolve('./public/renders');
    if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    outputPath = path.join(rendersDir, `render_${timestamp}_${rand}${fileExt}`);
  }

  // Temporary frame capture directory
  const tempDirId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tempFrameDir = path.resolve(`./temp_frames_${tempDirId}`);
  if (!fs.existsSync(tempFrameDir)) {
    fs.mkdirSync(tempFrameDir, { recursive: true });
  }

  let browser = null;

  try {
    console.log(`[Renderer] Launching Headless Chrome for ${width}x${height} @ ${fps} FPS (Format: ${format}, Transparent: ${transparent})...`);

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

    // Load bundled GSAP library
    const gsapPath = path.resolve('./node_modules/gsap/dist/gsap.min.js');
    const gsapScript = fs.existsSync(gsapPath) ? fs.readFileSync(gsapPath, 'utf8') : '';

    // Background style injection
    const bodyBgStyle = transparent
      ? 'background: transparent !important; background-color: transparent !important;'
      : `background: ${backgroundColor} !important; background-color: ${backgroundColor} !important;`;

    // Construct self-contained HTML document
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
            #app-viewport, #kanto-root {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              position: relative;
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

    await page.setContent(fullDocument, { waitUntil: 'load', timeout: 20000 });

    // Ensure all web fonts are loaded before capturing
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    // Initialize animation & calculate exact single-pass duration
    const animationMeta = await page.evaluate(async ({ jsCode, plan, forcedDuration }) => {
      const gsap = window.gsap;
      if (!gsap) throw new Error('GSAP library not available in headless context.');

      // Freeze global ticker for deterministic time control
      gsap.ticker.fps(120);
      gsap.globalTimeline.pause();
      gsap.globalTimeline.clear();

      // 1. Execute AI motion plan if provided
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

      // 2. Execute raw GSAP user code (takes priority)
      if (jsCode && jsCode.trim()) {
        try {
          const runScript = new Function('gsap', 'document', 'window', jsCode);
          runScript(gsap, document, window);
        } catch (e) {
          console.error('GSAP script execution error:', e);
        }
      }

      // Pause timeline at time 0
      gsap.globalTimeline.pause();
      gsap.globalTimeline.time(0);

      // Extract accurate duration strictly from child tweens
      let calcDuration = 0;
      const children = gsap.globalTimeline.getChildren(true, true, true);
      for (const child of children) {
        if (typeof child.endTime === 'function') {
          const end = child.endTime();
          if (isFinite(end) && end > calcDuration) {
            calcDuration = end;
          }
        }
      }

      if (calcDuration <= 0 && isFinite(gsap.globalTimeline.duration()) && gsap.globalTimeline.duration() > 0) {
        calcDuration = gsap.globalTimeline.duration();
      }

      // If user specified explicit duration, respect it
      if (forcedDuration && Number(forcedDuration) > 0) {
        calcDuration = Number(forcedDuration);
      } else {
        // Enforce safe bounds: 0.5s to 60s
        calcDuration = Math.min(Math.max(calcDuration || 2.0, 0.5), 60);
      }

      return {
        duration: calcDuration,
        tweensCount: children.length
      };
    }, {
      jsCode: jsContent,
      plan: motionPlan,
      forcedDuration: options.duration
    });

    const exactDuration = animationMeta.duration;
    const totalFrames = Math.max(1, Math.ceil(exactDuration * fps));

    console.log(`[Renderer] Animation initialized: ${exactDuration.toFixed(2)}s duration (${totalFrames} frames @ ${fps} FPS).`);

    // ── Phase 1: Step-by-Step Frame Capture ──────────────────────────────────
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const targetTimeSec = (frameIndex / (totalFrames - 1 || 1)) * exactDuration;

      // Deterministically seek GSAP timeline to target second
      await page.evaluate((tSec) => {
        if (window.gsap && window.gsap.globalTimeline) {
          window.gsap.globalTimeline.time(tSec);
        }
      }, targetTimeSec);

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
        console.log(`[Renderer] Captured frame ${frameIndex + 1}/${totalFrames} (${Math.round(((frameIndex + 1) / totalFrames) * 100)}%)`);
      }
    }

    await browser.close();
    browser = null;

    // Ensure output directory exists
    const outputDir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ── Phase 2: Encoding / Packaging via FFmpeg or Archiver ─────────────────
    console.log(`[Renderer] Compiling ${totalFrames} frames into ${format.toUpperCase()} (${outputPath})...`);

    if (format === 'png-sequence') {
      // Package PNG sequence into ZIP archive
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
      // FFmpeg compilation
      const ffmpegExecutable = ffmpegPath.replace(/\\/g, '/');
      const frameInputPattern = path.join(tempFrameDir, 'frame_%04d.png').replace(/\\/g, '/');
      const normalizedOutputPath = path.resolve(outputPath).replace(/\\/g, '/');

      let ffmpegArgs = '';

      if (format === 'webm') {
        // WebM with VP9 Alpha Channel Support
        // -pix_fmt yuva420p retains transparency in WebM
        ffmpegArgs = `"${ffmpegExecutable}" -y -framerate ${fps} -i "${frameInputPattern}" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 20 -auto-alt-ref 0 "${normalizedOutputPath}"`;
      } else if (format === 'prores') {
        // Apple ProRes 4444 (Profile 4) with Alpha Channel Support
        // -pix_fmt yuva444p10le retains alpha channel for Final Cut Pro / Premiere / DaVinci
        ffmpegArgs = `"${ffmpegExecutable}" -y -framerate ${fps} -i "${frameInputPattern}" -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -vendor apl0 "${normalizedOutputPath}"`;
      } else {
        // MP4 / H.264 (Standard Opaque)
        ffmpegArgs = `"${ffmpegExecutable}" -y -framerate ${fps} -i "${frameInputPattern}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 18 -movflags +faststart "${normalizedOutputPath}"`;
      }

      console.log(`[Renderer] Executing FFmpeg command: ${ffmpegArgs}`);
      execSync(ffmpegArgs, { stdio: 'pipe' });
    }

    console.log(`[Renderer] Successfully created: ${outputPath}`);

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
    console.error('[Renderer] Error during frame rendering pipeline:', error);
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
