export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, negative, model, width, height, guidance_scale, steps } = req.body;

  try {
    // NEW ROUTER URL
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_KEY}`,
          "Content-Type": "application/json",
          "x-use-cache": "false" // Optional: ensures you get a fresh image
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: negative || undefined,
            width: width || 1024,
            height: height || 1024,
            guidance_scale: parseFloat(guidance_scale) || 7.5,
            num_inference_steps: parseInt(steps) || 28,
          },
        }),
      }
    );

    if (response.status === 503) {
      return res.status(503).json({ error: "Model is loading on the new router. Retry in 30s." });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errorData.error || `Router Error: ${response.status}` 
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    return res.send(buffer);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
