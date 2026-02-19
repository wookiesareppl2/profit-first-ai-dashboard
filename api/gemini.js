module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const apiKey = process.env.ZAI_API_KEY;
    const model = process.env.ZAI_MODEL || 'glm-5';

    if (!apiKey) {
        return res.status(500).json({ error: 'Missing ZAI_API_KEY environment variable.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ error: 'Request body must be valid JSON.' });
        }
    }

    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const systemInstruction =
        typeof body?.systemInstruction === 'string' ? body.systemInstruction.trim() : '';
    const isJson = Boolean(body?.isJson);

    if (!prompt) {
        return res.status(400).json({ error: 'Missing required field: prompt.' });
    }

    const messages = [];
    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
        model,
        messages,
        stream: false
    };

    if (isJson) {
        payload.response_format = { type: 'json_object' };
    }

    const endpoint = 'https://api.z.ai/api/paas/v4/chat/completions';

    try {
        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'en-US,en',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
            return res.status(upstream.status).json({
                error: data?.error?.message || data?.msg || 'Z.ai request failed.'
            });
        }

        const text = String(data?.choices?.[0]?.message?.content || '').trim();

        if (!text) {
            return res.status(502).json({ error: 'Z.ai returned an empty response.' });
        }

        return res.status(200).json({ text });
    } catch {
        return res.status(500).json({ error: 'Failed to reach Z.ai API.' });
    }
};
