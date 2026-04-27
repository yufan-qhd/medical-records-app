var ImageStore = (function() {
    'use strict';

    var DB_NAME = 'MedicalAppImages';
    var DB_VERSION = 1;
    var STORE_NAME = 'images';
    var db = null;

    function openDB(callback) {
        if (db) {
            callback(null, db);
            return;
        }

        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {
            var database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                var store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('recordId', 'recordId', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            callback(null, db);
        };

        request.onerror = function(event) {
            callback(event.target.error, null);
        };
    }

    function generateId() {
        return 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    function compressImage(file, maxWidth, quality, callback) {
        maxWidth = maxWidth || 1200;
        quality = quality || 0.7;

        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var width = img.width;
                var height = img.height;

                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(function(blob) {
                    var compressedReader = new FileReader();
                    compressedReader.onload = function(ev) {
                        callback(null, {
                            data: ev.target.result,
                            width: width,
                            height: height,
                            originalSize: file.size,
                            compressedSize: blob.size
                        });
                    };
                    compressedReader.readAsDataURL(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = function() {
                callback('图片加载失败', null);
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            callback('文件读取失败', null);
        };
        reader.readAsDataURL(file);
    }

    function saveImage(imageData, recordId, callback) {
        openDB(function(err, database) {
            if (err) {
                callback(err, null);
                return;
            }

            var imageRecord = {
                id: generateId(),
                recordId: recordId || null,
                data: imageData.data,
                width: imageData.width,
                height: imageData.height,
                originalSize: imageData.originalSize,
                compressedSize: imageData.compressedSize,
                createdAt: new Date().toISOString()
            };

            var transaction = database.transaction([STORE_NAME], 'readwrite');
            var store = transaction.objectStore(STORE_NAME);
            var request = store.add(imageRecord);

            request.onsuccess = function() {
                callback(null, imageRecord.id);
            };

            request.onerror = function(event) {
                callback(event.target.error, null);
            };
        });
    }

    function getImage(imageId, callback) {
        openDB(function(err, database) {
            if (err) {
                callback(err, null);
                return;
            }

            var transaction = database.transaction([STORE_NAME], 'readonly');
            var store = transaction.objectStore(STORE_NAME);
            var request = store.get(imageId);

            request.onsuccess = function() {
                callback(null, request.result || null);
            };

            request.onerror = function(event) {
                callback(event.target.error, null);
            };
        });
    }

    function getImagesByRecordId(recordId, callback) {
        openDB(function(err, database) {
            if (err) {
                callback(err, null);
                return;
            }

            var transaction = database.transaction([STORE_NAME], 'readonly');
            var store = transaction.objectStore(STORE_NAME);
            var index = store.index('recordId');
            var request = index.getAll(recordId);

            request.onsuccess = function() {
                callback(null, request.result || []);
            };

            request.onerror = function(event) {
                callback(event.target.error, null);
            };
        });
    }

    function deleteImage(imageId, callback) {
        openDB(function(err, database) {
            if (err) {
                if (callback) callback(err);
                return;
            }

            var transaction = database.transaction([STORE_NAME], 'readwrite');
            var store = transaction.objectStore(STORE_NAME);
            var request = store.delete(imageId);

            request.onsuccess = function() {
                if (callback) callback(null);
            };

            request.onerror = function(event) {
                if (callback) callback(event.target.error);
            };
        });
    }

    function deleteImagesByRecordId(recordId, callback) {
        getImagesByRecordId(recordId, function(err, images) {
            if (err) {
                if (callback) callback(err);
                return;
            }

            var remaining = images.length;
            if (remaining === 0) {
                if (callback) callback(null);
                return;
            }

            images.forEach(function(img) {
                deleteImage(img.id, function() {
                    remaining--;
                    if (remaining === 0 && callback) callback(null);
                });
            });
        });
    }

    function updateImageRecordId(imageId, recordId, callback) {
        openDB(function(err, database) {
            if (err) {
                if (callback) callback(err);
                return;
            }

            var transaction = database.transaction([STORE_NAME], 'readwrite');
            var store = transaction.objectStore(STORE_NAME);
            var request = store.get(imageId);

            request.onsuccess = function() {
                var imageRecord = request.result;
                if (!imageRecord) {
                    if (callback) callback('图片不存在');
                    return;
                }
                imageRecord.recordId = recordId;
                var updateRequest = store.put(imageRecord);
                updateRequest.onsuccess = function() {
                    if (callback) callback(null);
                };
                updateRequest.onerror = function(event) {
                    if (callback) callback(event.target.error);
                };
            };

            request.onerror = function(event) {
                if (callback) callback(event.target.error);
            };
        });
    }

    function getAllImages(callback) {
        openDB(function(err, database) {
            if (err) {
                callback(err, null);
                return;
            }

            var transaction = database.transaction([STORE_NAME], 'readonly');
            var store = transaction.objectStore(STORE_NAME);
            var request = store.getAll();

            request.onsuccess = function() {
                callback(null, request.result || []);
            };

            request.onerror = function(event) {
                callback(event.target.error, null);
            };
        });
    }

    return {
        compressImage: compressImage,
        saveImage: saveImage,
        getImage: getImage,
        getImagesByRecordId: getImagesByRecordId,
        deleteImage: deleteImage,
        deleteImagesByRecordId: deleteImagesByRecordId,
        updateImageRecordId: updateImageRecordId,
        getAllImages: getAllImages,
        openDB: openDB
    };
})();
