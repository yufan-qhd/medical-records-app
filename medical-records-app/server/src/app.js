require('dotenv').config();
var express = require('express');
var cors = require('cors');
var path = require('path');
var crypto = require('crypto');

var aiRoutes = require('./routes/ai');
var authRoutes = require('./routes/auth');
var recordRoutes = require('./routes/records');
var syncRoutes = require('./routes/sync');
var auditRoutes = require('./routes/audit');

var app = express();
var PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/audit', auditRoutes);

app.use(express.static(path.join(__dirname, '../../')));

app.use(function(err, req, res, next) {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: err.message });
});

app.listen(PORT, function() {
    console.log('[Medical Records Server] running at http://localhost:' + PORT);
    console.log('[API] /api/auth/register, /api/auth/login, /api/auth/me');
    console.log('[API] /api/records (CRUD)');
    console.log('[API] /api/sync/pull, /api/sync/push');
    console.log('[API] /api/ai/chat, /api/ai/extract');
    console.log('[API] /api/audit');
});
