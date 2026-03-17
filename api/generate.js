export default async function handler(req, res) {
    // 1. ADD CORS HEADERS (The Secret Sauce)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allows GitHub to talk to Vercel
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. HANDLE PREFLIGHT (Browsers send an OPTIONS request first)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. YOUR EXISTING LOGIC
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, model } = req.body;

    try {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model || 'black-forest-labs/FLUX.1-schnell'}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`, // Make sure HF_TOKEN is in Vercel Env Vars
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            return res.status(response.status).json({ error });
        }

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        return res.send(Buffer.from(buffer));

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
