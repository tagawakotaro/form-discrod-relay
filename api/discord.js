export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
        ok: false,
        error: 'Method Not Allowed'
        });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        return res.status(500).json({
        ok: false,
        error: 'DISCORD_WEBHOOK_URL is not set'
        });
    }

    const { message } = req.body || {};

    if (!message) {
        return res.status(400).json({
        ok: false,
        error: 'message is required'
        });
    }

    const discordPayload = {
        content: message
    };

    for (let i = 0; i < 3; i++) {
        const discordResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(discordPayload)
        });

        if (discordResponse.ok) {
        return res.status(200).json({
            ok: true,
            message: 'Sent to Discord'
        });
        }

        if (discordResponse.status === 429) {
        const retryAfter = await getRetryAfter(discordResponse);

        await sleep(retryAfter);
        continue;
        }

        const errorText = await discordResponse.text();

        return res.status(discordResponse.status).json({
        ok: false,
        error: errorText
        });
    }

    return res.status(429).json({
        ok: false,
        error: 'Discord rate limited after retries'
    });
    }

    async function getRetryAfter(response) {
    const retryAfterHeader = response.headers.get('retry-after');

    if (retryAfterHeader) {
        return Number(retryAfterHeader) * 1000;
    }

    const data = await response.json().catch(() => null);

    if (data && data.retry_after) {
        return Number(data.retry_after) * 1000;
    }

    return 3000;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}