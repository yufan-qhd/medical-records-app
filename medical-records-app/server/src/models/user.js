var db = require('./database');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var { v4: uuidv4 } = require('uuid');

var JWT_SECRET = process.env.JWT_SECRET || 'medical-records-secret-key-change-in-production';
var JWT_EXPIRES = '7d';

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function generateToken(userId) {
    return jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

function register(email, password, nickname) {
    var existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return { error: '该邮箱已注册' };
    }

    var id = uuidv4();
    var passwordHash = hashPassword(password);

    db.prepare('INSERT INTO users (id, email, password_hash, nickname) VALUES (?, ?, ?, ?)')
        .run(id, email, passwordHash, nickname || '');

    var token = generateToken(id);

    return {
        user: { id: id, email: email, nickname: nickname || '' },
        token: token
    };
}

function registerByPhone(phone, nickname) {
    var existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
        return { error: '该手机号已注册' };
    }

    var id = uuidv4();
    var nicknameVal = nickname || ('用户' + phone.slice(-4));

    db.prepare('INSERT INTO users (id, phone, nickname) VALUES (?, ?, ?)')
        .run(id, phone, nicknameVal);

    var token = generateToken(id);

    return {
        user: { id: id, phone: phone, nickname: nicknameVal },
        token: token
    };
}

function loginByPhone(phone) {
    var user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
        var result = registerByPhone(phone, '');
        return result;
    }

    var token = generateToken(user.id);

    return {
        user: { id: user.id, phone: user.phone, nickname: user.nickname },
        token: token
    };
}

function loginByWechat(openid) {
    var user = db.prepare('SELECT * FROM users WHERE wechat_openid = ?').get(openid);
    if (!user) {
        var id = uuidv4();
        var nickname = '微信用户';

        db.prepare('INSERT INTO users (id, wechat_openid, nickname) VALUES (?, ?, ?)')
            .run(id, openid, nickname);

        var token = generateToken(id);

        return {
            user: { id: id, nickname: nickname },
            token: token
        };
    }

    var token = generateToken(user.id);

    return {
        user: { id: user.id, nickname: user.nickname },
        token: token
    };
}

function login(email, password) {
    var user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return { error: '邮箱或密码错误' };
    }

    if (!comparePassword(password, user.password_hash)) {
        return { error: '邮箱或密码错误' };
    }

    var token = generateToken(user.id);

    return {
        user: { id: user.id, email: user.email, nickname: user.nickname },
        token: token
    };
}

function getUserById(id) {
    var user = db.prepare('SELECT id, email, nickname, created_at FROM users WHERE id = ?').get(id);
    return user || null;
}

module.exports = {
    register: register,
    registerByPhone: registerByPhone,
    login: login,
    loginByPhone: loginByPhone,
    loginByWechat: loginByWechat,
    getUserById: getUserById,
    verifyToken: verifyToken,
    generateToken: generateToken
};
