const fs = require('fs');
const http = require('http');
const path = require('path');

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');

    for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex < 0) continue;

        const key = line.slice(0, eqIndex).trim();
        if (!key) continue;

        let value = line.slice(eqIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(envPath);

const geminiHandler = require('./api/gemini');

const MIME = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp'
};

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

async function runApiHandler(req, res) {
    const rawBody = await readRequestBody(req);
    let parsedBody = {};

    if (rawBody.trim()) {
        try {
            parsedBody = JSON.parse(rawBody);
        } catch {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Request body must be valid JSON.' }));
            return;
        }
    }

    const shimReq = {
        method: req.method,
        body: parsedBody,
        headers: req.headers
    };

    const shimRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            const body = JSON.stringify(payload);
            this.headers['Content-Type'] = 'application/json; charset=utf-8';
            res.writeHead(this.statusCode, this.headers);
            res.end(body);
        }
    };

    await geminiHandler(shimReq, shimRes);
}

function resolveSafePath(urlPathname) {
    const clean = decodeURIComponent(urlPathname.split('?')[0]);
    const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
    const absolute = path.resolve(projectRoot, relative);

    if (!absolute.startsWith(projectRoot)) {
        return null;
    }

    return absolute;
}

function serveStatic(req, res, filePath) {
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
}

const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (url.pathname === '/api/gemini') {
            await runApiHandler(req, res);
            return;
        }

        const filePath = resolveSafePath(url.pathname);
        serveStatic(req, res, filePath);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Local dev server error.', details: String(error.message || error) }));
    }
});

server.listen(port, () => {
    // Keep this explicit to avoid confusion: local server only.
    console.log(`Local dev server running at http://localhost:${port}`);
    console.log('This does not deploy or modify your live Vercel project.');
});
