// api/generate.js — Neural Forge HF Proxy
// Handles different parameter shapes per model family

const MODEL_CONFIGS = {
  "black-forest-labs/FLUX.1-schnell": {
    family: "flux",
    defaults: { guidance_scale: 0, num_inference_steps: 4 },
  },
  "black-forest-labs/FLUX.1-dev": {
    family: "flux",
    defaults: { guidance_scale: 3.5, num_inference_steps: 28 },
  },
  "stabilityai/stable-diffusion-xl-base-1.0": {
    family: "sdxl",
    defaults: { guidance_scale: 7.5, num_inference_steps: 30 },
  },
  "stabilityai/sdxl-turbo": {
    family: "sdxl_turbo",
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
  "cagliostrolab/animagine-xl-3.1": {
    family: "sdxl",
    defaults: { guidance_scale: 7, num_inference_steps: 28 },
  },
};

const FALLBACK_CONFIG = {
  family: "sdxl",
  defaults: { guidance_scale: 7, num_inference_steps: 30 },
};

function buildPayload(prompt, modelId, options = {}) {
  const config = MODEL_CONFIGS[modelId] || FALLBACK_CONFIG;
  const { family, defaults } = config;
  const { negative_prompt, width, height, seed } = options;

  const payload = {
    inputs: prompt,
    parameters: { ...defaults },
  };

  if (seed !== undefined && seed !== null && seed !== "") {
    payload.parameters.seed = parseInt(seed);
  }

  if (family === "flux") {
    if (width && height) {
      payload.parameters.width = width;
      payload.parameters.height = height;
    }
    return payload;
  }

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
      let errorMsg = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        const json = JSON.parse(text);
        errorMsg = json.error || json.message || errorMsg;
      } catch {
        // response wasn't JSON, use status code only
      }

      if (response.status === 503) {
        return res.status(503).json({ error: "Model is loading — try again in 20–30 seconds" });
      }

      return res.status(response.status).json({ error: errorMsg });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    return res.send(buffer);

  } catch (err) {
    console.error("Forge proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
