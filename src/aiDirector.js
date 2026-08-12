import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Strict JSON Schema definition for motion planning
const motionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    animation_duration_seconds: { type: SchemaType.NUMBER },
    fps: { type: SchemaType.INTEGER },
    elements_motion: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          element_id: { type: SchemaType.STRING },
          keyframes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                time_ms: { type: SchemaType.INTEGER },
                delta_x: { type: SchemaType.NUMBER },
                delta_y: { type: SchemaType.NUMBER },
                scale: { type: SchemaType.NUMBER },
                opacity: { type: SchemaType.NUMBER },
                easing: { type: SchemaType.STRING }
              },
              required: ["time_ms", "delta_x", "delta_y", "scale", "opacity", "easing"]
            }
          }
        },
        required: ["element_id", "keyframes"]
      }
    }
  },
  required: ["animation_duration_seconds", "fps", "elements_motion"]
};

/**
 * Generates a motion plan from spatial manifest and user prompt using Gemini 1.5 Pro structured output API.
 * Accepts optional manual constraints/manualCode.
 * 
 * @param {Object} spatialManifest 
 * @param {string} userPrompt 
 * @param {string|Object} [manualConstraints] 
 * @returns {Promise<Object>} Motion Plan object
 */
export async function generateMotionPlan(spatialManifest, userPrompt, manualConstraints = "") {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: motionSchema,
          temperature: 0.2
        }
      });

      let systemInstruction = `
        You are a deterministic motion director.
        Translate user intent into relative transformations based ONLY on the provided Spatial Manifest.
        Never transform elements beyond 1920x1080 viewport boundaries.
        Allowed easing values only: ["linear", "power1.out", "back.out(1.7)", "elastic.out(1, 0.3)", "power2.inOut"].
      `;

      if (manualConstraints) {
        systemInstruction += `\n
        [MANUAL CONSTRAINTS]:
        ${typeof manualConstraints === 'string' ? manualConstraints : JSON.stringify(manualConstraints)}
        Preserve all explicit manual element transforms defined in the MANUAL CONSTRAINTS block. Only compute motion vectors for unassigned elements.
        `;
      }

      const prompt = `
        [SPATIAL MANIFEST REPORT]:
        ${JSON.stringify(spatialManifest, null, 2)}

        [USER MOTION INTENT]:
        "${userPrompt}"
      `;

      const result = await model.generateContent([systemInstruction, prompt]);
      return JSON.parse(result.response.text());
    } catch (err) {
      console.warn("Gemini API call warning (using deterministic fallback motion plan):", err.message || err);
    }
  } else {
    console.log("No active GEMINI_API_KEY set in .env. Generating deterministic default motion matrix...");
  }

  // Fallback motion matrix generator strictly conforming to motionSchema
  const targetId = spatialManifest.elements?.[0]?.id || "streak-icon";
  return {
    animation_duration_seconds: 2.0,
    fps: 30,
    elements_motion: [
      {
        element_id: targetId,
        keyframes: [
          { time_ms: 0, delta_x: 0, delta_y: 0, scale: 1.0, opacity: 1.0, easing: "linear" },
          { time_ms: 500, delta_x: 0, delta_y: -30, scale: 1.2, opacity: 1.0, easing: "back.out(1.7)" },
          { time_ms: 1000, delta_x: 0, delta_y: -40, scale: 1.25, opacity: 1.0, easing: "power1.out" },
          { time_ms: 1500, delta_x: 0, delta_y: -20, scale: 1.1, opacity: 1.0, easing: "elastic.out(1, 0.3)" },
          { time_ms: 2000, delta_x: 0, delta_y: 0, scale: 1.0, opacity: 1.0, easing: "power2.inOut" }
        ]
      }
    ]
  };
}
