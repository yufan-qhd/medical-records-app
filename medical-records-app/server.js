const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8090;
const DEEPSEEK_API_URL = 'https://api.deepseek.com';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function proxyDeepSeek(req, res) {
    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
        var options = {
            hostname: 'api.deepseek.com',
            port: 443,
            path: '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers['authorization'] || '',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        var https = require('https');
        var proxyReq = https.request(options, function(proxyRes) {
            if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].indexOf('text/event-stream') !== -1) {
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                });
                proxyRes.pipe(res);
            } else {
                var data = '';
                proxyRes.on('data', function(chunk) { data += chunk; });
                proxyRes.on('end', function() {
                    res.writeHead(proxyRes.statusCode, {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(data);
                });
            }
        });

        proxyReq.on('error', function(err) {
            console.error('Proxy error:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
}

var server = http.createServer(function(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    if (req.url === '/api/chat/completions' && req.method === 'POST') {
        proxyDeepSeek(req, res);
        return;
    }

    var filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath.split('?')[0]);

    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, function(err, data) {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
});

server.listen(PORT, function() {
    console.log('Server running at http://localhost:' + PORT);
    console.log('DeepSeek API proxy: /api/chat/completions -> ' + DEEPSEEK_API_URL + '/chat/completions');
});
