var auditModel = require('../models/audit');
var authMiddleware = require('../middleware/auth').authMiddleware;

var router = require('express').Router();

router.use(authMiddleware);

router.get('/', function(req, res) {
    var logs = auditModel.getLogs(req.userId, {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
    });
    res.json({ logs: logs });
});

module.exports = router;
