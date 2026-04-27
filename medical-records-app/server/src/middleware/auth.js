var userModel = require('../models/user');

function authMiddleware(req, res, next) {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }

    var token = authHeader.slice(7);
    var decoded = userModel.verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: '登录已过期' });
    }

    var user = userModel.getUserById(decoded.userId);
    if (!user) {
        return res.status(401).json({ error: '用户不存在' });
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
}

function optionalAuth(req, res, next) {
    var authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        var token = authHeader.slice(7);
        var decoded = userModel.verifyToken(token);
        if (decoded) {
            req.userId = decoded.userId;
            req.user = userModel.getUserById(decoded.userId);
        }
    }
    next();
}

module.exports = {
    authMiddleware: authMiddleware,
    optionalAuth: optionalAuth
};
