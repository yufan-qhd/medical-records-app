var recordModel = require('../models/record');
var auditModel = require('../models/audit');
var authMiddleware = require('../middleware/auth').authMiddleware;

var router = require('express').Router();

router.use(authMiddleware);

router.get('/pull', function(req, res) {
    var since = req.query.since;
    if (!since) {
        return res.status(400).json({ error: 'since 参数必填（ISO时间戳）' });
    }

    var records = recordModel.getRecordsUpdatedAfter(req.userId, since);
    var serverTime = new Date().toISOString();

    auditModel.log(req.userId, 'sync_pull', 'record', '', '拉取 ' + records.length + ' 条记录', req.ip);

    res.json({
        records: records,
        server_time: serverTime
    });
});

router.post('/push', function(req, res) {
    var changes = req.body.changes;
    if (!changes || !Array.isArray(changes)) {
        return res.status(400).json({ error: 'changes 数组必填' });
    }

    var results = [];
    changes.forEach(function(change) {
        change.user_id = req.userId;
        var result = recordModel.upsertRecord(req.userId, change);
        results.push(result);
    });

    var serverTime = new Date().toISOString();

    auditModel.log(req.userId, 'sync_push', 'record', '', '推送 ' + changes.length + ' 条变更', req.ip);

    res.json({
        results: results,
        server_time: serverTime
    });
});

module.exports = router;
