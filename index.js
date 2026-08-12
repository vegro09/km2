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

// Middleware configuration - accept CORS requests from local frontend development servers
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Ensure public renders directory exists
const rendersDir = path.join(process.cwd(), 'public/renders');
if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir, { recursive: true });
}

// Serve rendered videos statically under /renders bound to absolute local path
app.use('/renders', express.static(rendersDir));

// Endpoint 1: GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    engine: "Kanto Motion Studio",
    timestamp: Date.now()
  });
});

// Endpoint 2: POST /api/generate-motion
app.post('/api/generate-motion', async (req, res) => {
  try {
    const { html, css, prompt, manualCode, keyframeOverrides } = req.body;

    if (!html) {
      return res.status(400).json({ success: false, error: "Missing required 'html' property in payload." });
    }

    // Determine execution mode
    const hasPrompt = Boolean(prompt && prompt.trim());
    const hasManual = Boolean(manualCode && manualCode.trim());

    let mode = "ai_generated";
    if (hasPrompt && hasManual) {
      mode = "hybrid";
    } else if (hasManual && !hasPrompt) {
      mode = "manual_override";
    } else if (!hasPrompt && !hasManual) {
      mode = "ai_generated";
    }

    console.log(`[API /generate-motion] Incoming request (Mode: ${mode})`);

    // Stage 1: Spatial Manifest Extraction
    console.log("[Stage 1/4] Extracting DOM spatial manifest...");
    const spatialManifest = await extractSpatialManifest(html, css || "");
    console.log(`Extracted spatial manifest for ${spatialManifest.elements_count} target elements.`);

    // Stage 2: Motion Plan Generation
    let motionPlan = null;
    if (Array.isArray(keyframeOverrides) && keyframeOverrides.length > 0) {
      motionPlan = {
        animation_duration_seconds: 2.0,
        fps: 30,
        elements_motion: keyframeOverrides
      };
    } else if (mode === "manual_override") {
      console.log("[Stage 2/4] Manual override mode active - skipping Gemini API call.");
      motionPlan = {
        animation_duration_seconds: 2.0,
        fps: 30,
        elements_motion: []
      };
    } else {
      console.log("[Stage 2/4] Generating motion plan via Gemini API...");
      motionPlan = await generateMotionPlan(spatialManifest, prompt || "Animate elements smoothly", manualCode || "");
    }

    // Stage 3 & 4: Render Video
    const videoId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const outputFileName = `motion_${videoId}.mp4`;
    const outputFilePath = path.join(rendersDir, outputFileName);

    console.log(`[Stage 3/4 & 4/4] Rendering video to ${outputFilePath}...`);
    await renderVideo(html, css || "", motionPlan, manualCode || "", outputFilePath);

    const videoUrl = `/renders/${outputFileName}`;

    console.log(`[API /generate-motion] Completed successfully! Video available at ${videoUrl}`);

    return res.json({
      success: true,
      mode,
      videoUrl,
      spatialManifest,
      motionPlan
    });

  } catch (error) {
    console.error("[API /generate-motion] Execution failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error during motion generation."
    });
  }
});

// Standalone CLI execution helper function if run directly (node index.js --cli)
async function runStandaloneCLI() {
  console.log("=== Kanto Motion Engine CLI Test Run ===");
  try {
    const sampleHTML = `<div id="streak-card" data-animate="true" style="width:300px; height:150px; background:#111; color:#fff; border-radius:12px; display:flex; align-items:center; justify-content:center;"><span id="streak-icon">🔥</span> 7 Day Streak</div>`;
    const sampleCSS = `body { background: #000; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }`;
    const userPrompt = "أريد أيقونة الستريك أن ترتفع للأعلى بحركة ارتدادية ناعمة";
    const sampleManualCode = "gsap.to('#streak-icon', { y: -30, duration: 1 });";

    console.log("[Stage 1/4] Extracting DOM spatial manifest...");
    const manifest = await extractSpatialManifest(sampleHTML, sampleCSS);
    console.log(`Extracted manifest for ${manifest.elements_count} target elements.`);

    console.log("[Stage 2/4] Generating motion matrix from Gemini API...");
    const motionPlan = await generateMotionPlan(manifest, userPrompt, sampleManualCode);
    console.log(`Generated plan: ${motionPlan.elements_motion.length} element sequence(s), ${motionPlan.animation_duration_seconds}s at ${motionPlan.fps} FPS.`);

    const outputFilePath = path.resolve('output.mp4');
    await renderVideo(sampleHTML, sampleCSS, motionPlan, sampleManualCode, outputFilePath);

    console.log(`Kanto Motion Engine pipeline completed successfully! ${outputFilePath} created.`);
  } catch (error) {
    console.error("CLI Execution failed:", error);
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
    console.log(`📡 Local API Endpoint:  http://localhost:${PORT}/api/generate-motion`);
    console.log(`🏥 Health Check URL:    http://localhost:${PORT}/api/health`);
    console.log(`🎬 Rendered Video Path: http://localhost:${PORT}/renders/`);
    console.log(`==================================================`);
  });
}

export { app };
