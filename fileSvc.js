angular.module("app",[]).provider("fileSvc", function () {
        var imgCacheDir = "/ImgCache/",//图片缓存
            localDir = "/LocalData/",//数据缓存
            androidFileDownloadUrl = "file:///mnt/sdcard/",//安卓文件下载，如下载apk
            imgCacheNativeURL = "",//图片缓存原生路径
            isBrowser = false;//是否浏览器
        var fileSvc = {};
        var fileUtil = {};

        this.setIsBrowser = function (flag) {
            isBrowser = flag;
        };

        this.$get = ["$q", "$timeout", function ($q, $timeout) {
            var fileInitDefer = $q.defer();

            fileUtil = {
                /**
                 * 获取文件系统
                 * @param type 0:temp 1:persistent
                 * @returns {Promise} （fs）
                 */
                getFS: function (type) {
                    var deferred = $q.defer();
                    if (window.requestFileSystem) {
                        window.requestFileSystem(type, 0, function (fs) {
                            deferred.resolve(fs);
                        }, function (e) {
                            console.log("requestFileSystem error: ", e);
                            deferred.reject();
                        });
                    } else if (window.webkitRequestFileSystem) {
                        window.webkitRequestFileSystem(type, 0, function (fs) {
                            deferred.resolve(fs);
                        }, function (e) {
                            console.log(e);
                            deferred.reject();
                        });
                    } else {
                        console.log('cordova-plugin-file插件错误，没有File');
                        deferred.reject();
                    }
                    return deferred.promise;
                },

                /**
                 * 获取fileEntry
                 * @param fileUrl
                 * @param create true:并创建 false
                 * @returns {Promise}  (fileEntry)
                 */
                getFileEntry: function (fileUrl, create) {
                    var deferred = $q.defer();
                    fileUtil.getFS(1).then(function (fs) {
                        fs.root.getFile(fileUrl, {create: create, exclusive: false}, function (fileEntry) {
                            // console.log("get file entry success: "+ fileUrl+" , "+fileEntry.nativeURL)
                            deferred.resolve(fileEntry);
                        }, function (e) {
                            if (create) {
                                console.log("get file entry error: " + fileUrl, JSON.stringify(e));
                            }
                            deferred.reject();
                        });
                    });
                    return deferred.promise;
                },
                /**
                 * 获取dirEntry
                 * @param dirUrl
                 * @param create true:并创建 false
                 * @returns {Promise} ({dirEntry,fs})
                 */
                getDirEntry: function (dirUrl, create) {
                    var deferred = $q.defer();
                    if (create == undefined) {
                        create = true;
                    }
                    fileUtil.getFS(1).then(function (fs) {
                        fs.root.getDirectory(dirUrl, {create: create, exclusive: false}, function (dirEntry) {
                            console.log("get dir entry success: " + dirUrl + ", " + dirEntry.nativeURL);
                            deferred.resolve({dirEntry: dirEntry, fs: fs});
                        }, function (e) {
                            console.log("get dir error: " + dirUrl + JSON.stringify(e));
                            deferred.reject();
                        });
                    });
                    return deferred.promise;
                },

                /**
                 * 读文件
                 * @param fileUrl
                 * @param type 1 读取text 2 读取base64
                 * @returns {*} (result)
                 */
                readFile: function (fileUrl, type) {
                    var deferred = getDefer();
                    fileUtil.getFileEntry(fileUrl, true).then(function (fileEntry) {
                        fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = function () {
                                // console.log("Successful file read ");
                                deferred.resolve(this.result);
                            };
                            reader.onerror = function () {
                                deferred.reject();
                            };
                            if (type == "1") {
                                reader.readAsText(file);
                            }
                            if (type == "2") {
                                reader.readAsDataURL(file); //将文件内容读取成Base64编码
                            }

                        }, function (e) {
                            console.log("readFile error: " + fileUrl + e);
                            deferred.reject();
                        });
                    }, function (e) {
                        console.log("read getFileEntry error: " + fileUrl + e);
                        deferred.reject();
                    });
                    return deferred.promise;
                },
                /**
                 * 创建或写文件
                 * @param fileUrl
                 * @param content String
                 * @param type 1:content 为blob
                 * @returns {*}
                 */
                writeFile: function (fileUrl, content, type) {
                    var deferred = getDefer();
                    fileUtil.getFileEntry(fileUrl, true).then(function (fileEntry) {
                        fileEntry.createWriter(function (fileWriter) {

                            fileWriter.onwriteend = function () {
                                // console.log("Successful file write...");
                                deferred.resolve();
                            };

                            fileWriter.onerror = function () {
                                // console.log("Failed file write: " + e);
                                deferred.reject();
                            };

                            if (type == "1") {
                                fileWriter.write(content);
                            } else {
                                var dataObj = new Blob([content], {type: "text/plain"});
                                fileWriter.write(dataObj);
                            }

                        });
                    }, function () {
                        deferred.reject();
                    });
                    return deferred.promise;
                },
                /**
                 * 使用插件下载
                 * @param downloadUrl
                 * @param distUrl
                 * @returns {*}
                 */
                download: function (downloadUrl, distUrl) {
                    var deferred = getDefer();
                    if (!window.FileTransfer) {
                        console.log('cordova-plugin-file-transfer插件错误，没有FileTransfer');
                        deferred.reject();
                    } else {
                        var fileTransfer = new FileTransfer();
                        fileTransfer.download(
                            downloadUrl,
                            distUrl,
                            function () {
                                console.log('下载成功！');
                                deferred.resolve();
                            },
                            function (e) {
                                console.log("download error: ", e);
                                deferred.reject();
                            },
                            true //接受所有证书参数,生产去掉
                        );
                    }
                    return deferred.promise;
                },
                /**
                 * 浏览器下载
                 * @param downloadUrl
                 * @param distUrl
                 * @returns {*}
                 */
                browserDownload: function (downloadUrl, distUrl) {
                    console.log("browse download" + distUrl);
                    var deferred = getDefer();
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', downloadUrl, true);
                    xhr.responseType = 'blob';
                    // xhr.onprogress = on_progress;
                    // xhr.setRequestHeader(key, headers[key]);
                    xhr.onload = function () {
                        if (xhr.response && (xhr.status === 200 || xhr.status === 0)) {
                            fileUtil.writeFile(distUrl, xhr.response, "1").then(function () {
                                deferred.resolve();
                            }, function () {
                                deferred.reject();
                            });
                        } else {
                            deferred.reject();
                        }
                    };
                    xhr.onerror = function (e) {
                        console.log("browse download error: " + e);
                        deferred.reject();
                    };
                    xhr.send();
                    return deferred.promise;
                },
                /**
                 * 获取文件夹大小
                 * @param path
                 * @returns {Promise} （size）
                 */
                getDirectorySize: function (path) {
                    var size = 0, deferred = $q.defer();
                    fileUtil.getDirEntry(path).then(function (data) {
                        var dirReader = data.dirEntry.createReader();
                        //3,读取文件夹
                        dirReader.readEntries(function (entries) {
                            var j = 0;
                            if (entries.length > 0) {
                                for (var i = 0; i < entries.length; i++) {
                                    if (entries[i].isFile) {
                                        data.fs.root.getFile(entries[i].fullPath, {
                                            create: false,
                                            exclusive: false
                                        }, function (fileEntry) {
                                            //3,读取文件
                                            fileEntry.file(function (file) {
                                                // console.log(size)
                                                size += file.size;
                                                j++;
                                                if (j == entries.length) {
                                                    deferred.resolve(size);
                                                }
                                            }, function () {
                                                size += 0;
                                                if (j == entries.length) {
                                                    deferred.resolve(size);
                                                }
                                            });
                                        }, function () {
                                            size += 0;
                                            if (j == entries.length) {
                                                deferred.resolve(size);
                                            }
                                        });
                                    } else {
                                        if (j == entries.length) {
                                            deferred.resolve(size);
                                        }
                                    }
                                }
                            } else {
                                deferred.resolve(0);
                            }
                        }, function () {
                            console.log("读取文件夹失败");
                            deferred.resolve(size);
                        });

                        $timeout(function () {
                            if (size === 0) {
                                deferred.resolve(size)
                            }
                        }, 6000);
                    }, function () {
                        deferred.resolve(0);
                    });
                    return deferred.promise;
                },
                /**
                 * 清理文件夹
                 * @param path
                 * @returns {Promise}
                 */
                clearDirectory: function (path) {
                    var deferred = $q.defer();
                    fileUtil.getDirEntry(path).then(function (data) {
                        data.dirEntry.removeRecursively(function () {
                            console.log("INFO: remove dir success");
                            fileUtil.getDirEntry(path).then(function () {
                                deferred.resolve();
                            })
                        }, function (e) {
                            console.log("INFO: remove dir error", e);
                            deferred.resolve();
                        });
                    }, function () {
                        deferred.resolve();
                    });
                    return deferred.promise;
                },
                /**
                 * 删除文件
                 * @param path
                 * @returns {Promise}
                 */
                removeFile: function (path) {
                    var deferred = $q.defer();
                    fileUtil.getFileEntry(path, false).then(function (fileEntry) {
                        fileEntry.remove(function () {
                            console.log("INFO: remove file success");
                            deferred.resolve();
                        }, function (e) {
                            console.log("INFO: remove file error", e);
                        });
                    }, function () {
                        deferred.reject();
                    });
                    return deferred.promise;
                },
                /**
                 * 文件是否存在
                 * @param fileUrl
                 * @returns {*|promise}
                 */
                isFileExist: function (fileUrl) {
                    var deferred = getDefer();
                    fileUtil.getFileEntry(fileUrl, false).then(function (fileEntry) {
                        deferred.resolve(fileEntry);
                    }, function () {
                        deferred.resolve(false);
                    });
                    return deferred.promise;
                }
            };

            fileSvc = {

                /**
                 *  初始化,并创建相关文件夹
                 */
                init: function () {
                    var deferred = getDefer();
                    $q.all([
                        fileUtil.getDirEntry(imgCacheDir),
                        fileUtil.getDirEntry(localDir)
                    ]).then(function (args) {
                        imgCacheNativeURL = (args[0].dirEntry.nativeURL || args[0].dirEntry.fullPath ) + "";
                        console.log("file init: " + imgCacheDir + ", " + args[1].dirEntry.nativeURL);
                        deferred.resolve();
                        fileInitDefer.resolve();
                    }, function () {
                        deferred.reject();
                        fileInitDefer.reject();
                    });
                    return deferred.promise;
                },
                /**
                 * 非图片下载文件
                 * @param downloadUrl
                 * @param fileName
                 * @returns {*|promise}
                 */
                downloadFile: function (downloadUrl, fileName) {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.download(downloadUrl, androidFileDownloadUrl + fileName)
                    });
                },
                /**
                 * 文件下载 (图片下载)
                 * @param downloadUrl
                 * @param fileName
                 * @returns {*|promise}
                 */
                downloadImg: function (downloadUrl, fileName) {
                    return fileInitDefer.promise.then(function () {
                        if (isBrowser) {
                            return fileUtil.browserDownload(downloadUrl, imgCacheNativeURL + fileName)
                        } else {
                            return fileUtil.download(downloadUrl, imgCacheNativeURL + fileName)
                        }
                    });
                },
                /**
                 * 读取图片
                 * @param imgName
                 * @returns {*} base64
                 */
                readImg: function (imgName) {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.readFile(imgCacheDir + imgName, "2")
                    });
                },
                /**
                 * 清理图片缓存
                 * @returns {*|promise}
                 */
                clearImgCache: function () {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.clearDirectory(imgCacheDir);
                    });

                },
                /**
                 * 获取图片缓存大小
                 * @returns {*|promise}
                 */
                getImgCacheSize: function () {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.getDirectorySize(imgCacheDir);
                    });
                },
                /**
                 * 图片文件是否存在
                 * @param imgName
                 * @returns {*|promise} （文件路径/false）
                 */
                isImgFileExist: function (imgName) {
                    var deferred = getDefer();
                    fileInitDefer.promise.then(function () {
                        fileUtil.isFileExist(imgCacheDir + imgName).then(function (fileEntry) {
                            if (fileEntry) {
                                deferred.resolve(fileEntry.nativeURL || fileEntry.fullPath );
                            } else {
                                deferred.resolve(false);
                            }
                        });
                    }, function () {
                        deferred.resolve(false);
                    });
                    return deferred.promise;
                },
                /**
                 * 写入数据缓存
                 * @param name 文件名
                 * @param content String 内容
                 */
                writeLocalStorage: function (name, content) {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.writeFile(localDir + name + ".txt", content)
                    });
                },
                /**
                 * 读取数据缓存 当前数据缓存为已缓存字段为文件名,存储缓存内容
                 * @returns {*|promise} 返回json
                 */
                readLocalStorage: function () {
                    var deferred = getDefer();
                    var localStorage = {};
                    fileInitDefer.promise.then(function () {
                        fileUtil.getDirEntry(localDir).then(function (data) {
                            var dirReader = data.dirEntry.createReader();
                            //3,读取文件夹
                            dirReader.readEntries(function (entries) {
                                var j = 0;
                                if (entries.length > 0) {
                                    for (var i = 0; i < entries.length; i++) {
                                        if (entries[i].isFile) {
                                            data.fs.root.getFile(entries[i].fullPath, {
                                                create: false,
                                                exclusive: false
                                            }, function (fileEntry) {
                                                //3,读取文件
                                                fileEntry.file(function (file) {
                                                    j++;
                                                    var reader = new FileReader();
                                                    reader.onloadend = function () {
                                                        var value = this.result + "";

                                                        try {
                                                            value = JSON.parse(value);
                                                        } catch (e) {
                                                            //console.log("read local storage error: ", e)
                                                        }
                                                        var fileName = file.name.replace(".txt", "");
                                                        localStorage[fileName] = value;
                                                        if (j == entries.length) {
                                                            deferred.resolve(localStorage);
                                                        }
                                                    };
                                                    reader.onerror = function () {
                                                        if (j == entries.length) {
                                                            deferred.resolve(localStorage);
                                                        }
                                                    };
                                                    reader.readAsText(file);

                                                }, function () {
                                                    if (j == entries.length) {
                                                        deferred.resolve(localStorage);
                                                    }
                                                });
                                            }, function () {
                                                if (j == entries.length) {
                                                    deferred.resolve(localStorage);
                                                }
                                            });
                                        } else {
                                            if (j == entries.length) {
                                                deferred.resolve(localStorage);
                                            }
                                        }
                                    }
                                } else {
                                    deferred.resolve(localStorage);
                                }
                            }, function () {
                                console.log("读取文件夹失败");
                                deferred.resolve(localStorage);
                            });
                        }, function () {
                            deferred.resolve(localStorage);
                        });
                    }, function () {
                        deferred.resolve(localStorage);
                    });
                    return deferred.promise;
                },
                /**
                 * 删除数据缓存文件
                 * @params name
                 * @return {*}
                 */
                rmLocalStorage: function (name) {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.removeFile(localDir + name + ".txt");
                    });
                },
                /**
                 * 清除数据缓存文件夹
                 * @returns {*}
                 */
                clearLocalStorage: function () {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.clearDirectory(localDir);
                    });
                },
                /**
                 * 获取数据缓存大小
                 * @returns {*|promise}
                 */
                getLocalDataSize: function () {
                    return fileInitDefer.promise.then(function () {
                        return fileUtil.getDirectorySize(localDir);
                    });

                }
            };


            function getDefer() {
                return $q.defer();
            }


            return fileSvc;
        }
        ]
    }
);
