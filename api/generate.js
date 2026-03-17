export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, negative, model, width, height, guidance_scale, steps } = req.body;

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_KEY}`,
          "Content-Type": "application/json",
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

    // If HF is overloaded (very common on free tier)
    if (response.status === 503) {
      return res.status(503).json({ error: "Model is loading. Please wait 30 seconds and try again." });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `HF API Error: ${errorText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set headers so the browser knows it's an image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
