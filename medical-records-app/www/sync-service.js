var SyncService = (function() {
    'use strict';

    var SYNC_INTERVAL = 30000;
    var syncTimer = null;
    var isSyncing = false;
    var lastSyncTime = localStorage.getItem('last_sync_time') || '';

    function getLastSyncTime() {
        return lastSyncTime;
    }

    function setLastSyncTime(time) {
        lastSyncTime = time;
        localStorage.setItem('last_sync_time', time);
    }

    function getPendingChanges() {
        var data = localStorage.getItem('pending_changes');
        return data ? JSON.parse(data) : [];
    }

    function addPendingChange(change) {
        var changes = getPendingChanges();
        var existing = false;
        for (var i = 0; i < changes.length; i++) {
            if (changes[i].id === change.id) {
                changes[i] = change;
                existing = true;
                break;
            }
        }
        if (!existing) {
            changes.push(change);
        }
        localStorage.setItem('pending_changes', JSON.stringify(changes));
    }

    function clearPendingChanges() {
        localStorage.setItem('pending_changes', '[]');
    }

    function pullFromServer(callback) {
        if (!ApiService.isLoggedIn()) {
            if (callback) callback('未登录');
            return;
        }

        var since = lastSyncTime || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        ApiService.syncPull(since, function(err, records, serverTime) {
            if (err) {
                if (callback) callback(err);
                return;
            }

            var localRecords = getLocalRecords();
            var localMap = {};
            localRecords.forEach(function(r) {
                localMap[r.id] = r;
            });

            records.forEach(function(serverRecord) {
                var local = localMap[serverRecord.id];
                if (!local) {
                    localRecords.push(serverRecord);
                } else if (serverRecord.version > local.version) {
                    var idx = localRecords.indexOf(local);
                    localRecords[idx] = serverRecord;
                }
            });

            saveLocalRecords(localRecords);

            if (serverTime) {
                setLastSyncTime(serverTime);
            }

            if (callback) callback(null, records.length);
        });
    }

    function pushToServer(callback) {
        if (!ApiService.isLoggedIn()) {
            if (callback) callback('未登录');
            return;
        }

        var changes = getPendingChanges();
        if (changes.length === 0) {
            if (callback) callback(null, 0);
            return;
        }

        ApiService.syncPush(changes, function(err, results, serverTime) {
            if (err) {
                if (callback) callback(err);
                return;
            }

            clearPendingChanges();

            if (serverTime) {
                setLastSyncTime(serverTime);
            }

            if (callback) callback(null, results.length);
        });
    }

    function sync(callback) {
        if (isSyncing || !ApiService.isLoggedIn()) {
            if (callback) callback('跳过');
            return;
        }

        isSyncing = true;

        pushToServer(function(pushErr, pushCount) {
            pullFromServer(function(pullErr, pullCount) {
                isSyncing = false;
                if (callback) {
                    callback(null, {
                        pushed: pushCount || 0,
                        pulled: pullCount || 0,
                        pushError: pushErr,
                        pullError: pullErr
                    });
                }
            });
        });
    }

    function startAutoSync() {
        stopAutoSync();
        sync();
        syncTimer = setInterval(function() {
            sync();
        }, SYNC_INTERVAL);
    }

    function stopAutoSync() {
        if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
        }
    }

    function getLocalRecords() {
        var data = localStorage.getItem('medical_records');
        return data ? JSON.parse(data) : [];
    }

    function saveLocalRecords(records) {
        localStorage.setItem('medical_records', JSON.stringify(records));
    }

    function saveRecord(record) {
        var records = getLocalRecords();
        var existing = false;
        for (var i = 0; i < records.length; i++) {
            if (records[i].id === record.id) {
                records[i] = record;
                existing = true;
                break;
            }
        }
        if (!existing) {
            records.unshift(record);
        }
        saveLocalRecords(records);

        if (ApiService.isLoggedIn()) {
            addPendingChange(record);
        }
    }

    function deleteLocalRecord(id) {
        var records = getLocalRecords();
        var found = null;
        for (var i = 0; i < records.length; i++) {
            if (records[i].id === id) {
                found = records[i];
                records.splice(i, 1);
                break;
            }
        }
        saveLocalRecords(records);

        if (ApiService.isLoggedIn() && found) {
            found.deleted_at = new Date().toISOString();
            addPendingChange(found);
        }
    }

    return {
        sync: sync,
        startAutoSync: startAutoSync,
        stopAutoSync: stopAutoSync,
        pullFromServer: pullFromServer,
        pushToServer: pushToServer,
        getLocalRecords: getLocalRecords,
        saveLocalRecords: saveLocalRecords,
        saveRecord: saveRecord,
        deleteLocalRecord: deleteLocalRecord,
        getLastSyncTime: getLastSyncTime,
        getPendingChanges: getPendingChanges
    };
})();
