import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

/**
 * Renders HTML/CSS + Motion Plan + Manual GSAP Code into an MP4 video file frame-by-frame.
 * 
 * @param {string} htmlContent 
 * @param {string} cssContent 
 * @param {Object} motionPlan 
 * @param {string} [manualCode] Optional raw GSAP JS override script
 * @param {string} outputPath Path to save final output.mp4
 */
export async function renderVideo(htmlContent, cssContent, motionPlan, manualCode = "", outputPath = 'output.mp4') {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Load local GSAP script
    const gsapPath = path.resolve('./node_modules/gsap/dist/gsap.min.js');
    const gsapScript = fs.existsSync(gsapPath) ? fs.readFileSync(gsapPath, 'utf8') : '';

    const fullDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent || ''}</style>
          <script>${gsapScript}</script>
        </head>
        <body>${htmlContent || ''}</body>
      </html>
    `;

    try {
      await page.setContent(fullDocument, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      await page.setContent(fullDocument, { waitUntil: 'load', timeout: 15000 });
    }

    // Prepare isolated temporary frame directory
    const timestamp = Date.now();
    const tempFrameDir = path.resolve(`./temp_frames_${timestamp}`);
    if (!fs.existsSync(tempFrameDir)) {
      fs.mkdirSync(tempFrameDir, { recursive: true });
    }

    const fps = (motionPlan && motionPlan.fps) || 30;
    const duration = (motionPlan && motionPlan.animation_duration_seconds) || 2.0;
    const totalFrames = Math.ceil(duration * fps);
    const frameIntervalMs = 1000 / fps;

    console.log(`[Stage 3/4] Rendering frame-by-frame canvas screenshots (Total: ${totalFrames} frames)...`);

    // Frame-by-Frame Capture Loop
    for (let frame = 0; frame <= totalFrames; frame++) {
      const currentTimeMs = frame * frameIntervalMs;
      const currentTimeSeconds = currentTimeMs / 1000;

      await page.evaluate(({ plan, currentTime, currentTimeSec, userCode }) => {
        // 1. Apply AI Motion Plan keyframes via GSAP set
        if (plan && Array.isArray(plan.elements_motion)) {
          plan.elements_motion.forEach(elem => {
            const target = document.getElementById(elem.element_id) || document.querySelector(`[data-animate="${elem.element_id}"]`);
            if (!target) return;

            const kf = elem.keyframes.find(k => k.time_ms >= currentTime) || elem.keyframes[elem.keyframes.length - 1];
            
            if (kf && window.gsap) {
              window.gsap.set(target, {
                x: kf.delta_x,
                y: kf.delta_y,
                scale: kf.scale,
                opacity: kf.opacity,
                ease: kf.easing
              });
            }
          });
        }

        // 2. Execute raw manual GSAP code override if present (takes priority)
        if (userCode && userCode.trim()) {
          try {
            // Pause GSAP global timeline and seek to exact current frame time
            if (window.gsap) {
              const runManualScript = new Function('gsap', 'currentTimeSec', 'currentTimeMs', userCode);
              runManualScript(window.gsap, currentTimeSec, currentTimeMs);

              if (window.gsap.globalTimeline) {
                window.gsap.globalTimeline.pause();
                window.gsap.globalTimeline.seek(currentTimeSec);
              }
            }
          } catch (e) {
            console.warn("Manual GSAP evaluation error:", e.message);
          }
        }
      }, { 
        plan: motionPlan, 
        currentTime: currentTimeMs, 
        currentTimeSec: currentTimeSeconds, 
        userCode: manualCode 
      });

      const frameFileName = `frame_${String(frame).padStart(4, '0')}.png`;
      const framePath = path.join(tempFrameDir, frameFileName);
      await page.screenshot({ path: framePath, type: 'png' });

      if (frame % 10 === 0 || frame === totalFrames) {
        console.log(`[Stage 3/4] Rendering frame-by-frame canvas screenshots (Progress: ${frame}/${totalFrames} frames)...`);
      }
    }

    await browser.close();

    // Ensure output target directory exists
    const outputDir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Stage 4: Compile captured PNG frames to MP4 using ffmpeg-static
    console.log("[Stage 4/4] Compiling frames into MP4 video via FFmpeg...");
    
    const frameInputPattern = path.join(tempFrameDir, 'frame_%04d.png').replace(/\\/g, '/');
    const normalizedOutputPath = path.resolve(outputPath).replace(/\\/g, '/');
    const ffmpegExecutable = ffmpegPath.replace(/\\/g, '/');

    const ffmpegCmd = `"${ffmpegExecutable}" -y -r ${fps} -i "${frameInputPattern}" -c:v libx264 -pix_fmt yuv420p "${normalizedOutputPath}"`;
    
    execSync(ffmpegCmd, { stdio: 'inherit' });

    // Clean up temporary frame directory
    if (fs.existsSync(tempFrameDir)) {
      fs.rmSync(tempFrameDir, { recursive: true, force: true });
      console.log(`Cleaned up temporary frame directory (${tempFrameDir}).`);
    }

    return normalizedOutputPath;
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}
