/**
 * ============================================================================
 * KANTO MOTION — GPU-ACCELERATED ZERO-DISK-I/O RENDERING ENGINE
 * WITH STRICT SOCIAL MEDIA RESOLUTION PRESETS & VIEWPORT ENFORCEMENT
 * ============================================================================
 * 
 * ARCHITECTURE & RESOLUTION PRESETS:
 * ----------------------------------------------------------------------------
 * 1. SOCIAL MEDIA PRESET DICTIONARY:
 *    Supports standard industry presets:
 *      - tiktok / reels / shorts / story : 1080 x 1920 (9:16)
 *      - instagram-square / square        : 1080 x 1080 (1:1)
 *      - instagram-portrait / portrait    : 1080 x 1350 (4:5)
 *      - youtube / landscape / hd         : 1920 x 1080 (16:9)
 *      - 4k                               : 3840 x 2160 (16:9)
 * 
 * 2. STRICT VIEWPORT & CONTAINER STYLING:
 *    Forces Puppeteer viewport to exact target dimensions (`setViewport({ width, height })`)
 *    and injects CSS container rules to guarantee 100% viewport alignment and centering
 *    without unwanted margins, scrollbars, or layout clipping.
 * 
 * 3. ZERO DISK I/O MEMORY STREAMING:
 *    Captures frame screenshot buffers in RAM and pipes them directly to FFmpeg `stdin`.
 * 
 * 4. FFMPEG RESOLUTION MATCHING:
 *    Ensures FFmpeg output matches the captured PNG frame resolution (`-s ${width}x${height}`).
 * ============================================================================
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';
import { ZipArchive } from 'archiver';

/**
 * Standard Social Media Preset Dictionary
 */
export const SOCIAL_PRESETS = {
  'tiktok': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'TikTok / Reels / Shorts' },
  'reels': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'TikTok / Reels / Shorts' },
  'shorts': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'TikTok / Reels / Shorts' },
  'story': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Instagram Story' },
  'instagram-square': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Instagram Square Post' },
  'square': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Square 1:1' },
  'instagram-portrait': { width: 1080, height: 1350, aspectRatio: '4:5', name: 'Instagram Portrait Post' },
  'portrait': { width: 1080, height: 1350, aspectRatio: '4:5', name: 'Portrait 4:5' },
  'youtube': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'YouTube / HD Landscape' },
  'landscape': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'Landscape 16:9' },
  'hd': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'Full HD 1080p' },
  '4k': { width: 3840, height: 2160, aspectRatio: '16:9', name: 'Ultra HD 4K' }
};

/**
 * Renders an HTML/CSS/GSAP animation into a media file with strict viewport resolution enforcement.
 * 
 * @param {Object} options
 * @param {string} [options.html=""] Raw HTML markup
 * @param {string} [options.css=""] Raw CSS rules
 * @param {string} [options.js=""] Raw GSAP JavaScript code
 * @param {Object} [options.motionPlan=null] Optional AI keyframe motion plan
 * @param {string} [options.preset] Social media preset key (e.g., 'tiktok', 'instagram-square', 'youtube')
 * @param {number} [options.width=1920] Custom render width
 * @param {number} [options.height=1080] Custom render height
 * @param {number} [options.fps=30] Target frame rate (e.g., 30, 60 FPS)
 * @param {number} [options.duration] Optional duration override (seconds)
 * @param {('mp4'|'webm'|'prores'|'png-sequence')} [options.format='mp4'] Export format
 * @param {boolean} [options.transparent=false] Enable alpha channel transparency (omitBackground)
 * @param {string} [options.backgroundColor='#ffffff'] Canvas background color if not transparent
 * @param {string} [options.outputPath] Output target file path
 * @param {Function} [options.onProgress] Progress callback ({ currentFrame, totalFrames, percent })
 * @returns {Promise<{ outputPath: string, duration: number, totalFrames: number, format: string, width: number, height: number, fps: number, preset: string|null }>}
 */
export async function renderVideo(options = {}) {
  const htmlContent = options.html || '';
  const cssContent = options.css || '';
  const jsContent = options.js || '';
  const motionPlan = options.motionPlan || null;

  // Resolve Social Media Preset or Explicit Dimensions
  let targetWidth = options.width || 1920;
  let targetHeight = options.height || 1080;
  let activePreset = null;

  if (options.preset) {
    const presetKey = String(options.preset).toLowerCase().trim();
    if (SOCIAL_PRESETS[presetKey]) {
      targetWidth = SOCIAL_PRESETS[presetKey].width;
      targetHeight = SOCIAL_PRESETS[presetKey].height;
      activePreset = presetKey;
    }
  }

  // Video encoders strictly require even dimensions (multiples of 2)
  let width = Math.floor(targetWidth / 2) * 2;
  let height = Math.floor(targetHeight / 2) * 2;
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

  // Determine output file path
  let outputPath = options.outputPath;
  if (!outputPath) {
    const rendersDir = path.resolve('./public/renders');
    if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    outputPath = path.join(rendersDir, `render_${timestamp}_${rand}${fileExt}`);
  }

  let browser = null;

  try {
    console.log(`[GPU Renderer] Target Resolution: ${width}x${height} (${activePreset ? `Preset: ${activePreset}` : 'Custom'}, ${fps} FPS, Format: ${format.toUpperCase()}, Alpha: ${transparent})...`);

    // 1. Force Hardware GPU Acceleration & Strict Window Size Launch Flags
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--enable-accelerated-2d-canvas',
        '--use-gl=angle',
        '--hide-scrollbars',
        '--mute-audio',
        `--window-size=${width},${height}`
      ]
    });

    const page = await browser.newPage();

    // 2. Strict Viewport Enforcement (Critical Requirement)
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1
    });

    // Read local GSAP script
    const gsapPath = path.resolve('./node_modules/gsap/dist/gsap.min.js');
    const gsapScript = fs.existsSync(gsapPath) ? fs.readFileSync(gsapPath, 'utf8') : '';

    const bodyBgStyle = transparent
      ? 'background: transparent !important; background-color: transparent !important;'
      : `background: ${backgroundColor} !important; background-color: ${backgroundColor} !important;`;

    // 3. Strict CSS Container Scaling & Centering Injection
    const fullDocument = `
      <!DOCTYPE html>
      <html style="width:${width}px !important; height:${height}px !important; margin:0 !important; padding:0 !important; overflow:hidden !important; ${bodyBgStyle}">
        <head>
          <meta charset="utf-8" />
          <style>
            *, *::before, *::after {
              box-sizing: border-box !important;
            }
            html, body {
              width: ${width}px !important;
              height: ${height}px !important;
              margin: 0 !important;
              padding: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              ${bodyBgStyle}
            }
            #kanto-root, #app-viewport {
              width: ${width}px !important;
              height: ${height}px !important;
              margin: 0 !important;
              padding: 0 !important;
              position: relative !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
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

    // Pre-Capture Readiness: Wait for DOM parsing
    await page.setContent(fullDocument, { waitUntil: 'load', timeout: 25000 });

    // Inject explicit CSS tag enforcement to guarantee viewport containment
    await page.addStyleTag({
      content: `
        html, body {
          width: ${width}px !important;
          height: ${height}px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          overflow: hidden !important;
        }
        #kanto-root {
          width: ${width}px !important;
          height: ${height}px !important;
        }
      `
    });

    // Pre-Capture Readiness: Wait for Fonts & Images decoding
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
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
            img.onerror = resolve;
          });
        })
      );
    });

    // Initialize Universal Animator & Calculate Duration
    const animationMeta = await page.evaluate(async ({ jsCode, plan, forcedDuration }) => {
      const gsap = window.gsap;
      if (!gsap) throw new Error('GSAP library failed to load in browser context.');

      gsap.ticker.fps(120);
      gsap.globalTimeline.pause();
      gsap.globalTimeline.clear();

      if (typeof document.getAnimations === 'function') {
        document.getAnimations().forEach((anim) => anim.pause());
      }

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

      if (jsCode && jsCode.trim()) {
        try {
          const userRunner = new Function('gsap', 'document', 'window', jsCode);
          userRunner(gsap, document, window);
        } catch (e) {
          console.error('User GSAP script execution error:', e);
        }
      }

      gsap.globalTimeline.pause();
      gsap.globalTimeline.time(0);

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

    console.log(`[GPU Renderer] Rendering ${width}x${height} animation: ${exactDuration.toFixed(2)}s (${totalFrames} frames @ ${fps} FPS).`);

    // Ensure output directory exists
    const outputDir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // =========================================================================
    // MEMORY STREAMING & FFMPEG RESOLUTION MATCHING ENCODING (ZERO DISK I/O)
    // =========================================================================
    let ffmpegProcess = null;
    let archive = null;
    let archiveStream = null;
    let ffmpegDone = null;

    const ffmpegExecutable = ffmpegPath.replace(/\\/g, '/');
    const normalizedOutputPath = path.resolve(outputPath).replace(/\\/g, '/');

    if (format === 'png-sequence') {
      archiveStream = fs.createWriteStream(outputPath);
      archive = new ZipArchive({ zlib: { level: 6 } });
      archive.pipe(archiveStream);
    } else {
      let videoCodecArgs = [];

      if (format === 'webm') {
        videoCodecArgs = ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', '-auto-alt-ref', '0'];
      } else if (format === 'prores') {
        videoCodecArgs = ['-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0'];
      } else {
        videoCodecArgs = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '18', '-movflags', '+faststart'];
      }

      // 4. Strict FFmpeg Output Matching (-s ${width}x${height})
      const spawnArgs = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-framerate', String(fps),
        '-i', '-',
        '-s', `${width}x${height}`,
        ...videoCodecArgs,
        normalizedOutputPath
      ];

      console.log(`[GPU Renderer] Spawning FFmpeg Stdin Pipe for ${width}x${height}...`);
      ffmpegProcess = spawn(ffmpegExecutable, spawnArgs, { stdio: ['pipe', 'ignore', 'pipe'] });

      let ffmpegErrLog = '';
      ffmpegProcess.stderr.on('data', (d) => { ffmpegErrLog += d.toString(); });

      ffmpegDone = new Promise((resolve, reject) => {
        ffmpegProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegErrLog}`));
        });
      });
    }

    // =========================================================================
    // DETERMINISTIC TIME-SEEKING, FORCED REFLOW & MEMORY STREAMING LOOP
    // =========================================================================
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const targetTimeSec = (frameIndex / (totalFrames - 1 || 1)) * exactDuration;

      // 1. Scrub Animation & 2. Force DOM Layout Reflow
      await page.evaluate((currentTimeSec) => {
        if (window.gsap && window.gsap.globalTimeline) {
          window.gsap.globalTimeline.time(currentTimeSec);
        }
        if (typeof document.getAnimations === 'function') {
          document.getAnimations().forEach((anim) => {
            anim.currentTime = currentTimeSec * 1000;
          });
        }
        // Force synchronous DOM layout recalculation
        void document.body.offsetHeight;
        if (document.getElementById('kanto-root')) {
          void document.getElementById('kanto-root').offsetHeight;
        }
      }, targetTimeSec);

      // 3. Capture Frame Buffer directly matching exact viewport size
      const frameBuffer = await page.screenshot({
        type: 'png',
        omitBackground: transparent
      });

      // 4. Pipe Buffer directly to FFmpeg Stdin or ZIP Stream with Backpressure
      if (format === 'png-sequence' && archive) {
        const fileName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
        archive.append(frameBuffer, { name: fileName });
      } else if (ffmpegProcess && ffmpegProcess.stdin) {
        const canContinue = ffmpegProcess.stdin.write(frameBuffer);
        if (!canContinue) {
          await new Promise((resolve) => ffmpegProcess.stdin.once('drain', resolve));
        }
      }

      if (onProgress) {
        onProgress({
          currentFrame: frameIndex + 1,
          totalFrames,
          percent: Math.round(((frameIndex + 1) / totalFrames) * 100)
        });
      }

      if ((frameIndex + 1) % 30 === 0 || frameIndex + 1 === totalFrames) {
        console.log(`[GPU Renderer] Streamed frame ${frameIndex + 1}/${totalFrames} (${Math.round(((frameIndex + 1) / totalFrames) * 100)}%)`);
      }
    }

    await browser.close();
    browser = null;

    // Finalize Memory Stream
    if (format === 'png-sequence' && archive) {
      await new Promise((resolve, reject) => {
        archiveStream.on('close', resolve);
        archive.on('error', reject);
        archive.finalize();
      });
    } else if (ffmpegProcess) {
      ffmpegProcess.stdin.end();
      await ffmpegDone;
    }

    console.log(`[GPU Renderer] Render complete! ${width}x${height} video created at: ${outputPath}`);

    return {
      outputPath: path.resolve(outputPath),
      duration: exactDuration,
      totalFrames,
      format,
      width,
      height,
      fps,
      preset: activePreset
    };

  } catch (error) {
    console.error('[GPU Renderer] Rendering pipeline error:', error);
    throw error;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

// Standalone execution runner for Social Media Preset testing
if (process.argv.includes('--test') || process.argv.includes('--cli')) {
  (async () => {
    console.log('--- Running TikTok (9:16 1080x1920) Preset Test ---');
    const result = await renderVideo({
      preset: 'tiktok',
      html: '<div style="width:400px;height:200px;background:#e11d48;border-radius:24px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;font-size:32px;font-weight:bold;">🎵 TikTok 9:16</div>',
      css: 'body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }',
      js: 'gsap.fromTo("div", { scale: 0.5, rotation: -10 }, { scale: 1.2, rotation: 0, duration: 1, yoyo: true, repeat: 1 });',
      fps: 30,
      format: 'mp4',
      outputPath: path.resolve('./public/renders/test_tiktok_1080x1920.mp4')
    });
    console.log('Test completed successfully:', result);
  })().catch(console.error);
}
