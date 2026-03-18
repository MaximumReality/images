// api/generate.js — Neural Forge HF Proxy
// Handles different parameter shapes per model family

// Model config: what each family needs
const MODEL_CONFIGS = {

  // ── FLUX FAMILY ──
  // FLUX uses guidance_scale + num_inference_steps, no negative prompt support
  "black-forest-labs/FLUX.1-schnell": {
    family: "flux",
    defaults: { guidance_scale: 0, num_inference_steps: 4 }, // schnell = low steps
  },
  "black-forest-labs/FLUX.1-dev": {
    family: "flux",
    defaults: { guidance_scale: 3.5, num_inference_steps: 28 },
  },

  // ── SDXL FAMILY ──
  // SDXL supports width/height, negative_prompt, guidance_scale
  "stabilityai/stable-diffusion-xl-base-1.0": {
    family: "sdxl",
    defaults: { guidance_scale: 7.5, num_inference_steps: 30 },
  },
  "stabilityai/sdxl-turbo": {
    family: "sdxl_turbo",
    // Turbo: 1 step, no CFG, no negative prompt
    defaults: { guidance_scale: 0, num_inference_steps: 1 },
  },
  "SG161222/RealVisXL_V4.0": {
    family: "sdxl",
    defaults: { guidance_scale: 7, num_inference_steps: 30 },
  },
  "stablediffusionapi/juggernaut-xl-v6": {
    family: "sdxl",
    defaults: { guidance_scale: 7, num_inference_steps: 30 },
  },

  // ── SD 1.5 / CLASSIC FAMILY ──
  // Smaller res (512-768), supports negative_prompt
  "Lykon/dreamshaper-8": {
    family: "sd15",
    defaults: { guidance_scale: 7, num_inference_steps: 30 },
  },
  "Linaqruf/anything-v3.0": {
    family: "sd15",
    defaults: { guidance_scale: 7, num_inference_steps: 28 },
  },
  "prompthero/openjourney-v4": {
    family: "sd15",
    defaults: { guidance_scale: 7, num_inference_steps: 25 },
  },
  "stabilityai/stable-diffusion-2-1": {
    family: "sd21",
    defaults: { guidance_scale: 7.5, num_inference_steps: 30 },
  },

  // ── ANIME ──
  "cagliostrolab/animagine-xl-3.1": {
    family: "sdxl",
    defaults: { guidance_scale: 7, num_inference_steps: 28 },
  },
};

// Fallback for unknown models — safe generic SDXL-style params
const FALLBACK_CONFIG = {
  family: "sdxl",
  defaults: { guidance_scale: 7, num_inference_steps: 30 },
};

function buildPayload(prompt, modelId, options = {}) {
  const config = MODEL_CONFIGS[modelId] || FALLBACK_CONFIG;
  const { family, defaults } = config;
  const { negative_prompt, width, height, seed } = options;

  // Base payload — always present
  const payload = {
    inputs: prompt,
    parameters: { ...defaults },
  };

  // Seed — supported by most models, pass if provided
  if (seed !== undefined && seed !== null && seed !== "") {
    payload.parameters.seed = parseInt(seed);
  }

  // FLUX family — no negative prompt, no width/height (uses its own aspect system)
  if (family === "flux") {
    if (width && height) {
      payload.parameters.width = width;
      payload.parameters.height = height;
    }
    // FLUX ignores negative_prompt silently, so we just skip it
    return payload;
  }

  // SDXL Turbo — no negative prompt, fixed low steps, no CFG
  if (family === "sdxl_turbo") {
    if (width && height) {
      payload.parameters.width = width;
      payload.parameters.height = height;
    }
    return payload;
  }

  // SDXL, SD 2.1, SD 1.5 — full parameter support
  if (negative_prompt) {
    payload.parameters.negative_prompt = negative_prompt;
  }
  if (width && height) {
    payload.parameters.width = width;
    payload.parameters.height = height;
  }

  return payload;
}

export default async function handler(req, res) {

  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const {
    prompt,
    model = "black-forest-labs/FLUX.1-schnell",
    negative_prompt,
    width,
    height,
    seed,
  } = req.body;

  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const payload = buildPayload(prompt, model, { negative_prompt, width, height, seed });

  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      // Try to parse HF error message for useful feedback
      let errorBody;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        errorBody = await response.json();
      } else {
        errorBody = { error: await response.text() };
      }

      // Surface model-loading state clearly
      if (response.status === 503) {
        return res.status(503).json({
          error: "Model is loading — try again in 20–30 seconds",
          detail: errorBody,
        });
      }

      return res.status(response.status).json({
        error: errorBody?.error || "HF API error",
        detail: errorBody,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    return res.send(buffer);

  } catch (err) {
    console.error("Forge proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
