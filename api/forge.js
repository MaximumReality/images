// api/forge.js
// Vercel serverless proxy — injects secret Pollinations key server-side.
// Deploy to Vercel, set POLLINATIONS_KEY env var in the dashboard.

export const config = { runtime: 'edge' };

export default async function handler(req) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders()
        });
    }

    const key = process.env.POLLINATIONS_KEY;
    if (!key) {
        return new Response(JSON.stringify({ error: 'Server misconfigured: missing POLLINATIONS_KEY' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
    }

    // Forward all query params from the incoming request
    const incoming = new URL(req.url);
    const params = incoming.searchParams;

    // Require at least a prompt
    const prompt = params.get('prompt');
    if (!prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
    }

    // Build the upstream Pollinations URL
    const upstream = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
    for (const [k, v] of params.entries()) {
        if (k !== 'prompt') upstream.searchParams.set(k, v);
    }
    upstream.searchParams.set('key', key); // inject secret key

    try {
        const response = await fetch(upstream.toString(), {
            headers: { 'User-Agent': 'NeuralForge-Proxy/1.0' }
        });

        if (!response.ok) {
            const text = await response.text();
            return new Response(JSON.stringify({ error: `Upstream error ${response.status}`, detail: text }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders() }
            });
        }

        // Stream the image back with original content-type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // cache identical prompts for 24h
                ...corsHeaders()
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
    }
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}
