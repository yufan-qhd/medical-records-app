var db = require('./database');
var { v4: uuidv4 } = require('uuid');

function createRecord(userId, data) {
    var id = uuidv4();
    var now = new Date().toISOString();

    db.prepare(`
        INSERT INTO medical_records (id, user_id, date, hospital, department, doctor, complaint, diagnosis, medication, examination, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.date || now.split('T')[0],
        data.hospital || '', data.department || '', data.doctor || '',
        data.complaint || '', data.diagnosis || '', data.medication || '',
        data.examination || '', data.notes || '', now, now);

    return getRecordById(id);
}

function getRecordById(id) {
    return db.prepare('SELECT * FROM medical_records WHERE id = ? AND deleted_at IS NULL').get(id);
}

function getRecordsByUserId(userId, options) {
    var limit = (options && options.limit) || 50;
    var offset = (options && options.offset) || 0;

    var records = db.prepare(`
        SELECT * FROM medical_records
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY date DESC, created_at DESC
        LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    var total = db.prepare('SELECT COUNT(*) as count FROM medical_records WHERE user_id = ? AND deleted_at IS NULL').get(userId);

    return { records: records, total: total.count };
}

function updateRecord(id, userId, data) {
    var record = db.prepare('SELECT * FROM medical_records WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!record) return null;

    var now = new Date().toISOString();
    var fields = [];
    var values = [];

    var allowedFields = ['date', 'hospital', 'department', 'doctor', 'complaint', 'diagnosis', 'medication', 'examination', 'notes'];
    allowedFields.forEach(function(field) {
        if (data[field] !== undefined) {
            fields.push(field + ' = ?');
            values.push(data[field]);
        }
    });

    if (fields.length === 0) return record;

    fields.push('updated_at = ?');
    values.push(now);
    fields.push('version = version + 1');
    values.push(id);
    values.push(userId);

    var stmt = db.prepare('UPDATE medical_records SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?');
    stmt.run.apply(stmt, values);

    return getRecordById(id);
}

function deleteRecord(id, userId) {
    var now = new Date().toISOString();
    var result = db.prepare('UPDATE medical_records SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
        .run(now, now, id, userId);
    return result.changes > 0;
}

function getRecordsUpdatedAfter(userId, since) {
    return db.prepare(`
        SELECT * FROM medical_records
        WHERE user_id = ? AND updated_at > ?
        ORDER BY updated_at ASC
    `).all(userId, since);
}

function upsertRecord(userId, data) {
    var existing = db.prepare('SELECT * FROM medical_records WHERE id = ? AND user_id = ?').get(data.id, userId);

    if (!existing) {
        var id = data.id || uuidv4();
        var now = new Date().toISOString();

        db.prepare(`
            INSERT INTO medical_records (id, user_id, date, hospital, department, doctor, complaint, diagnosis, medication, examination, notes, version, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, data.date || now.split('T')[0],
            data.hospital || '', data.department || '', data.doctor || '',
            data.complaint || '', data.diagnosis || '', data.medication || '',
            data.examination || '', data.notes || '', data.version || 1,
            data.created_at || now, data.updated_at || now, data.deleted_at || null);

        return getRecordById(id);
    }

    if (data.version && data.version <= existing.version) {
        return existing;
    }

    var now = new Date().toISOString();
    var fields = [];
    var values = [];

    var allowedFields = ['date', 'hospital', 'department', 'doctor', 'complaint', 'diagnosis', 'medication', 'examination', 'notes', 'deleted_at'];
    allowedFields.forEach(function(field) {
        if (data[field] !== undefined) {
            fields.push(field + ' = ?');
            values.push(data[field]);
        }
    });

    fields.push('version = ?');
    values.push((existing.version || 0) + 1);
    fields.push('updated_at = ?');
    values.push(now);
    values.push(data.id);
    values.push(userId);

    var stmt = db.prepare('UPDATE medical_records SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?');
    stmt.run.apply(stmt, values);

    return getRecordById(data.id);
}

module.exports = {
    createRecord: createRecord,
    getRecordById: getRecordById,
    getRecordsByUserId: getRecordsByUserId,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    getRecordsUpdatedAfter: getRecordsUpdatedAfter,
    upsertRecord: upsertRecord
};
