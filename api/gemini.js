module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.AI_STUDIO_API_KEY;
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    if (!apiKey) {
        return res.status(500).json({
            error:
                'Missing Gemini API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in your environment and redeploy/restart.'
        });
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

    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (isJson) {
        payload.generationConfig = { responseMimeType: 'application/json' };
    }

    const modelCandidates = Array.from(
        new Set([preferredModel, 'gemini-2.0-flash', 'gemini-1.5-flash'])
    );

    try {
        let lastErrorStatus = 500;
        let lastErrorMessage = 'Gemini request failed.';

        for (const model of modelCandidates) {
            const endpoint =
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
                `:generateContent?key=${encodeURIComponent(apiKey)}`;

            const upstream = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await upstream.json().catch(() => ({}));
            if (!upstream.ok) {
                lastErrorStatus = upstream.status;
                lastErrorMessage = data?.error?.message || 'Gemini request failed.';

                // If the model is unavailable for this key, try the next candidate.
                if (
                    upstream.status === 400 ||
                    upstream.status === 404
                ) {
                    const msg = String(lastErrorMessage).toLowerCase();
                    if (msg.includes('not found') || msg.includes('unsupported') || msg.includes('not available')) {
                        continue;
                    }
                }

                return res.status(lastErrorStatus).json({ error: lastErrorMessage });
            }

            const text = (data?.candidates?.[0]?.content?.parts || [])
                .map((part) => part?.text || '')
                .join('\n')
                .trim();

            if (!text) {
                return res.status(502).json({ error: 'Gemini returned an empty response.' });
            }

            return res.status(200).json({ text });
        }

        return res.status(lastErrorStatus).json({ error: lastErrorMessage });
    } catch {
        return res.status(500).json({ error: 'Failed to reach Gemini API.' });
    }
};
