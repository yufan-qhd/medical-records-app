var deepseek = require('../services/deepseek');

var router = require('express').Router();

router.post('/chat', function(req, res) {
    var body = req.body;
    if (!body || !body.messages || !body.messages.length) {
        return res.status(400).json({ error: 'messages is required' });
    }

    var stream = body.stream !== false;

    if (stream) {
        deepseek.chatStream(body, function(chunk) {
            res.write(chunk);
        }, function() {
            res.end();
        }, function(err) {
            if (!res.headersSent) {
                res.status(502).json({ error: err });
            } else {
                res.end();
            }
        });
    } else {
        deepseek.chat(body, function(data) {
            res.json(data);
        }, function(err) {
            res.status(502).json({ error: err });
        });
    }
});

router.post('/extract', function(req, res) {
    var body = req.body;
    if (!body || !body.messages || !body.messages.length) {
        return res.status(400).json({ error: 'messages is required' });
    }

    deepseek.extract(body, function(data) {
        res.json(data);
    }, function(err) {
        res.status(502).json({ error: err });
    });
});

module.exports = router;
