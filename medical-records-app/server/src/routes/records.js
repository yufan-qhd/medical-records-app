var recordModel = require('../models/record');
var auditModel = require('../models/audit');
var authMiddleware = require('../middleware/auth').authMiddleware;

var router = require('express').Router();

router.use(authMiddleware);

router.get('/', function(req, res) {
    var result = recordModel.getRecordsByUserId(req.userId, {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
    });
    res.json(result);
});

router.get('/:id', function(req, res) {
    var record = recordModel.getRecordById(req.params.id);
    if (!record || record.user_id !== req.userId) {
        return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
});

router.post('/', function(req, res) {
    var record = recordModel.createRecord(req.userId, req.body);
    auditModel.log(req.userId, 'create', 'record', record.id, '', req.ip);
    res.json(record);
});

router.put('/:id', function(req, res) {
    var record = recordModel.updateRecord(req.params.id, req.userId, req.body);
    if (!record) {
        return res.status(404).json({ error: '记录不存在' });
    }
    auditModel.log(req.userId, 'update', 'record', record.id, '', req.ip);
    res.json(record);
});

router.delete('/:id', function(req, res) {
    var success = recordModel.deleteRecord(req.params.id, req.userId);
    if (!success) {
        return res.status(404).json({ error: '记录不存在' });
    }
    auditModel.log(req.userId, 'delete', 'record', req.params.id, '', req.ip);
    res.json({ success: true });
});

module.exports = router;
