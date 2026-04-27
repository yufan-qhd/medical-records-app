var https = require('https');
var http = require('http');

var API_KEY = process.env.DEEPSEEK_API_KEY;
var API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
var MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

function makeRequest(path, body, callback, errorCallback) {
    var url = new URL(API_URL + path);
    var data = JSON.stringify(body);

    var options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY,
            'Content-Length': Buffer.byteLength(data)
        }
    };

    var req = https.request(options, function(res) {
        callback(res);
    });

    req.on('error', function(err) {
        if (errorCallback) errorCallback(err.message);
    });

    req.write(data);
    req.end();
}

function chatStream(body, onChunk, onComplete, onError) {
    var requestBody = {
        model: body.model || MODEL,
        messages: body.messages,
        max_tokens: body.max_tokens || 2048,
        temperature: body.temperature || 0.7,
        stream: true
    };

    makeRequest('/chat/completions', requestBody, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            onChunk(chunk);
        });
        res.on('end', function() {
            if (onComplete) onComplete();
        });
    }, onError);
}

function chat(body, callback, errorCallback) {
    var requestBody = {
        model: body.model || MODEL,
        messages: body.messages,
        max_tokens: body.max_tokens || 2048,
        temperature: body.temperature || 0.7,
        stream: false
    };

    makeRequest('/chat/completions', requestBody, function(res) {
        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            try {
                callback(JSON.parse(data));
            } catch (e) {
                if (errorCallback) errorCallback('Invalid JSON response');
            }
        });
    }, errorCallback);
}

function extract(body, callback, errorCallback) {
    var requestBody = {
        model: body.model || MODEL,
        messages: body.messages,
        max_tokens: body.max_tokens || 300,
        temperature: body.temperature || 0.1,
        stream: false
    };

    makeRequest('/chat/completions', requestBody, function(res) {
        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            try {
                callback(JSON.parse(data));
            } catch (e) {
                if (errorCallback) errorCallback('Invalid JSON response');
            }
        });
    }, errorCallback);
}

module.exports = {
    chatStream: chatStream,
    chat: chat,
    extract: extract
};
