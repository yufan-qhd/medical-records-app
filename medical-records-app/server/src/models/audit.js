var db = require('./database');
var { v4: uuidv4 } = require('uuid');

function log(userId, action, resourceType, resourceId, details, ipAddress) {
    var id = uuidv4();
    db.prepare('INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, userId, action, resourceType, resourceId || '', details || '', ipAddress || '');
}

function getLogs(userId, options) {
    var limit = (options && options.limit) || 50;
    var offset = (options && options.offset) || 0;
    return db.prepare('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(userId, limit, offset);
}

module.exports = {
    log: log,
    getLogs: getLogs
};
