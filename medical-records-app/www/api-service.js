var ApiService = (function() {
    'use strict';

    function getBaseUrl() {
        return AppConfig.API_BASE_URL.replace('/api/ai', '/api');
    }

    function getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    function setToken(token) {
        localStorage.setItem('auth_token', token);
    }

    function clearToken() {
        localStorage.removeItem('auth_token');
    }

    function getUser() {
        var data = localStorage.getItem('auth_user');
        return data ? JSON.parse(data) : null;
    }

    function setUser(user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
    }

    function clearUser() {
        localStorage.removeItem('auth_user');
    }

    function isLoggedIn() {
        return !!getToken();
    }

    function authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        };
    }

    function register(email, password, nickname, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password, nickname: nickname })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                callback(data.error, null);
            } else {
                setToken(data.token);
                setUser(data.user);
                callback(null, data.user);
            }
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function login(email, password, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                callback(data.error, null);
            } else {
                setToken(data.token);
                setUser(data.user);
                callback(null, data.user);
            }
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function sendVerifyCode(phone, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                callback(data.error);
            } else {
                callback(null);
            }
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message);
        });
    }

    function loginWithPhone(phone, code, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/auth/login-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, code: code })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                callback(data.error, null);
            } else {
                setToken(data.token);
                setUser(data.user);
                callback(null, data.user);
            }
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function loginWithWechat(callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/auth/login-wechat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                callback(data.error, null);
            } else {
                setToken(data.token);
                setUser(data.user);
                callback(null, data.user);
            }
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function logout() {
        clearToken();
        clearUser();
    }

    function getRecords(callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/records', {
            headers: authHeaders()
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(null, data.records || []);
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function createRecord(data, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/records', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        })
        .then(function(res) { return res.json(); })
        .then(function(record) {
            callback(null, record);
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function updateRecord(id, data, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/records/' + id, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data)
        })
        .then(function(res) { return res.json(); })
        .then(function(record) {
            callback(null, record);
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message, null);
        });
    }

    function deleteRecord(id, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/records/' + id, {
            method: 'DELETE',
            headers: authHeaders()
        })
        .then(function(res) { return res.json(); })
        .then(function() {
            callback(null);
        })
        .catch(function(err) {
            callback('网络错误: ' + err.message);
        });
    }

    function syncPull(since, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/sync/pull?since=' + encodeURIComponent(since), {
            headers: authHeaders()
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(null, data.records || [], data.server_time);
        })
        .catch(function(err) {
            callback('同步失败: ' + err.message, null);
        });
    }

    function syncPush(changes, callback) {
        var baseUrl = getBaseUrl();
        fetch(baseUrl + '/sync/push', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ changes: changes })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(null, data.results || [], data.server_time);
        })
        .catch(function(err) {
            callback('同步失败: ' + err.message, null);
        });
    }

    return {
        register: register,
        login: login,
        sendVerifyCode: sendVerifyCode,
        loginWithPhone: loginWithPhone,
        loginWithWechat: loginWithWechat,
        logout: logout,
        isLoggedIn: isLoggedIn,
        getToken: getToken,
        getUser: getUser,
        getRecords: getRecords,
        createRecord: createRecord,
        updateRecord: updateRecord,
        deleteRecord: deleteRecord,
        syncPull: syncPull,
        syncPush: syncPush
    };
})();
