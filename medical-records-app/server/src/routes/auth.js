var userModel = require('../models/user');
var auditModel = require('../models/audit');

var router = require('express').Router();

var verifyCodes = {};

router.post('/register', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var nickname = req.body.nickname || '';

    if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码不能为空' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少6位' });
    }

    var result = userModel.register(email, password, nickname);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    auditModel.log(result.user.id, 'register', 'user', result.user.id, '', req.ip);

    res.json(result);
});

router.post('/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    var result = userModel.login(email, password);
    if (result.error) {
        return res.status(401).json({ error: result.error });
    }

    auditModel.log(result.user.id, 'login', 'user', result.user.id, '', req.ip);

    res.json(result);
});

router.post('/send-code', function(req, res) {
    var phone = req.body.phone;
    if (!phone) {
        return res.status(400).json({ error: '手机号不能为空' });
    }
    if (!/^1\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确' });
    }

    verifyCodes[phone] = '123456';

    setTimeout(function() {
        delete verifyCodes[phone];
    }, 5 * 60 * 1000);

    res.json({ success: true, message: '验证码已发送' });
});

router.post('/login-phone', function(req, res) {
    var phone = req.body.phone;
    var code = req.body.code;

    if (!phone || !code) {
        return res.status(400).json({ error: '手机号和验证码不能为空' });
    }

    var storedCode = verifyCodes[phone];
    if (!storedCode || storedCode !== code) {
        return res.status(401).json({ error: '验证码错误或已过期' });
    }

    delete verifyCodes[phone];

    var result = userModel.loginByPhone(phone);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    auditModel.log(result.user.id, 'login_phone', 'user', result.user.id, '', req.ip);

    res.json(result);
});

router.post('/login-wechat', function(req, res) {
    var mockOpenid = 'wechat_mock_' + Date.now();

    var result = userModel.loginByWechat(mockOpenid);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    auditModel.log(result.user.id, 'login_wechat', 'user', result.user.id, '', req.ip);

    res.json(result);
});

router.get('/me', require('../middleware/auth').authMiddleware, function(req, res) {
    res.json({ user: req.user });
});

module.exports = router;
