import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { extractSpatialManifest } from './src/extractor.js';
import { generateMotionPlan } from './src/aiDirector.js';
import { renderVideo } from './src/renderer.js';

const app = express();
const PORT = process.env.PORT || 7007;

// Middleware configuration
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure public renders directory exists
const rendersDir = path.resolve('./public/renders');
if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir, { recursive: true });
}

// Serve rendered videos statically under /renders
app.use('/renders', express.static(rendersDir));

// Endpoint 1: Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'Kanto Motion Studio - Modern Headless & FFmpeg Rendering Engine',
    timestamp: Date.now()
  });
});

// Endpoint 2: Modern Frame-by-Frame Video Render API
app.post('/api/render-video', async (req, res) => {
  try {
    const {
      html = '',
      css = '',
      js = '',
      preset,
      width = 1920,
      height = 1080,
      fps = 30,
      duration,
      format = 'mp4',
      transparent = false,
      backgroundColor = '#ffffff',
      filename
    } = req.body;

    if (!html && !js) {
      return res.status(400).json({
        success: false,
        error: "Missing required 'html' or 'js' in payload."
      });
    }

    const extMap = {
      mp4: '.mp4',
      webm: '.webm',
      prores: '.mov',
      'png-sequence': '.zip'
    };
    const targetFormat = (format || 'mp4').toLowerCase();
    const fileExt = extMap[targetFormat] || '.mp4';

    const timestamp = Date.now();
    const baseSlug = filename
      ? filename.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      : `kanto_render_${timestamp}`;
    const outputFileName = `${baseSlug}_${fps}fps${fileExt}`;
    const outputFilePath = path.join(rendersDir, outputFileName);

    console.log(`[API /render-video] Starting render: ${preset ? `Preset: ${preset}` : `${width}x${height}`} @ ${fps} FPS (Format: ${targetFormat}, Transparent: ${transparent})`);

    const result = await renderVideo({
      html,
      css,
      js,
      preset,
      width: Number(width) || 1920,
      height: Number(height) || 1080,
      fps: Number(fps) || 30,
      duration: duration ? Number(duration) : undefined,
      format: targetFormat,
      transparent: Boolean(transparent),
      backgroundColor: backgroundColor || '#ffffff',
      outputPath: outputFilePath
    });

    const videoUrl = `/renders/${outputFileName}`;
    const downloadUrl = `/api/download-render/${outputFileName}`;

    console.log(`[API /render-video] Render complete: ${outputFileName} (${result.duration.toFixed(2)}s, ${result.totalFrames} frames)`);

    return res.json({
      success: true,
      videoUrl,
      downloadUrl,
      fileName: outputFileName,
      duration: result.duration,
      totalFrames: result.totalFrames,
      format: result.format,
      width: result.width,
      height: result.height,
      fps: result.fps
    });

  } catch (error) {
    console.error('[API /render-video] Execution failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during video rendering.'
    });
  }
});

// Endpoint 3: Direct Attachment Download
app.get('/api/download-render/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(rendersDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Rendered file not found or expired.' });
  }

  res.download(filePath, safeFilename);
});

// Endpoint 4: AI Motion Plan Generation + Render Pipeline
app.post('/api/generate-motion', async (req, res) => {
  try {
    const { html, css, prompt, manualCode, keyframeOverrides } = req.body;

    if (!html) {
      return res.status(400).json({ success: false, error: "Missing required 'html' property in payload." });
    }

    const hasPrompt = Boolean(prompt && prompt.trim());
    const hasManual = Boolean(manualCode && manualCode.trim());

    let mode = 'ai_generated';
    if (hasPrompt && hasManual) mode = 'hybrid';
    else if (hasManual && !hasPrompt) mode = 'manual_override';

    console.log(`[API /generate-motion] Incoming request (Mode: ${mode})`);

    // Stage 1: Spatial Manifest Extraction
    const spatialManifest = await extractSpatialManifest(html, css || '');

    // Stage 2: Motion Plan Generation
    let motionPlan = null;
    if (Array.isArray(keyframeOverrides) && keyframeOverrides.length > 0) {
      motionPlan = {
        animation_duration_seconds: 2.0,
        fps: 30,
        elements_motion: keyframeOverrides
      };
    } else if (mode === 'manual_override') {
      motionPlan = {
        animation_duration_seconds: 2.0,
        fps: 30,
        elements_motion: []
      };
    } else {
      motionPlan = await generateMotionPlan(spatialManifest, prompt || 'Animate elements smoothly', manualCode || '');
    }

    // Stage 3: Render Video using modern headless pipeline
    const videoId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const outputFileName = `motion_${videoId}.mp4`;
    const outputFilePath = path.join(rendersDir, outputFileName);

    const renderResult = await renderVideo({
      html,
      css: css || '',
      js: manualCode || '',
      motionPlan,
      width: 1920,
      height: 1080,
      fps: (motionPlan && motionPlan.fps) || 30,
      duration: (motionPlan && motionPlan.animation_duration_seconds) || 2.0,
      format: 'mp4',
      transparent: false,
      backgroundColor: '#000000',
      outputPath: outputFilePath
    });

    const videoUrl = `/renders/${outputFileName}`;

    return res.json({
      success: true,
      mode,
      videoUrl,
      spatialManifest,
      motionPlan,
      renderMeta: renderResult
    });

  } catch (error) {
    console.error('[API /generate-motion] Execution failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during motion generation.'
    });
  }
});

// Standalone CLI execution helper
async function runStandaloneCLI() {
  console.log('=== Kanto Motion Engine CLI Test Run ===');
  try {
    const sampleHTML = `<div id="streak-card" data-animate="true" style="width:300px; height:150px; background:#111; color:#fff; border-radius:12px; display:flex; align-items:center; justify-content:center;"><span id="streak-icon">🔥</span> 7 Day Streak</div>`;
    const sampleCSS = `body { background: #000; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }`;
    const sampleManualCode = "gsap.to('#streak-icon', { y: -30, duration: 1, yoyo: true, repeat: 1 });";

    console.log('[CLI] Running modern headless render...');
    const result = await renderVideo({
      html: sampleHTML,
      css: sampleCSS,
      js: sampleManualCode,
      width: 1920,
      height: 1080,
      fps: 30,
      format: 'mp4',
      transparent: false,
      backgroundColor: '#000000',
      outputPath: path.resolve('./output.mp4')
    });

    console.log(`[CLI] Completed successfully! Output: ${result.outputPath}`);
  } catch (error) {
    console.error('CLI Execution failed:', error);
    process.exit(1);
  }
}

// Start Server or CLI mode
if (process.argv.includes('--cli')) {
  runStandaloneCLI();
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 Kanto Motion Engine running on Localhost`);
    console.log(`📡 Render API Endpoint: http://localhost:${PORT}/api/render-video`);
    console.log(`🏥 Health Check URL:     http://localhost:${PORT}/api/health`);
    console.log(`🎬 Static Renders Path:  http://localhost:${PORT}/renders/`);
    console.log(`==================================================`);
  });
}

export { app };
