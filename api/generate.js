export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, model } = req.body;

    try {
        const response = await fetch(
            `https://router.huggingface.co/hf-inference/models/${model}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.HF_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', 'image/png');
        return res.send(buffer);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
