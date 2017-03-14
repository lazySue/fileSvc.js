/**
 * 基于fileSvc的数据资源存储服务
 */
app.factory("resourceSvc", ["fileSvc", "$q",
    function (fileSvc, $q) {
        var sessionObj = {},
            localObj = {},
            isBrowser = true;
        var copy = angular.copy;
        var initDefer = $q.defer();

        var returnObj = {
            init: function () {
                var deferred = $q.defer();
                fileSvc.readLocalStorage().then(function (localStorage) {
                    console.log("resource init local storage: " + JSON.stringify(localStorage));
                    localObj = angular.extend(localStorage, localObj);
                    initDefer.resolve(localStorage);
                    deferred.resolve(localStorage);
                });
                return deferred.promise;
            },
            setLocal: function (key, value) {
                initDefer.promise.then(function () {
                    var value0 = "";
                    if (typeof value == "object") {
                        value0 = JSON.stringify(value);
                    } else {
                        value0 = value + "";
                    }
                    localObj[key] = value;
                    fileSvc.writeLocalStorage(key, value0);
                })
            },
            setLocalAll: function (local) {
                localObj = local;
                for (var i in local) {
                    returnObj.setLocal(i,local[i]);
                }
            },
            getLocal: function (key, defaultValue) {
                return copy(localObj[key]) || defaultValue;
            },
            getLocalObj: function (key) {
                return returnObj.getLocal(key, {});
            },
            getLocalAll: function () {
                return copy(localObj);
            },
            removeLocal: function (key) {
                localObj[key] = null;
                fileSvc.rmLocalStorage(key);
            },
            clearLocal: function () {
                var deferred = $q.defer();
                localObj = {};
                fileSvc.clearLocalStorage().then(function () {
                    deferred.resolve();
                });
                return deferred.promise;
            },
            setSession: function (key, value) {
                if (!isBrowser) {
                    sessionObj[key] = value;
                } else {
                    window.sessionStorage[key] = value;
                }
            },
            getSession: function (key, defaultValue) {
                if (!isBrowser) {
                    return (copy(sessionObj[key]) || defaultValue);
                } else {
                    return window.sessionStorage[key] || defaultValue;
                }
            },
            getSessionObj: function (key) {
                return returnObj.getSession(key, "{}");
            },
            removeSession: function (key) {
                sessionObj[key] = undefined;
            },
            clearSession: function () {
                if (!isBrowser) {
                    sessionObj = {};
                } else {
                    window.sessionStorage.clear();
                }
            },
            setCacheData: function (key, value, time) {
                var cacheData = {data: value, time: new Date().getTime() + time};
                returnObj.setLocal(key, cacheData);
            },
            getCacheData: function (key) {
                var cacheData = returnObj.getLocalObj(key);
                if (cacheData.data && cacheData.time > new Date().getTime()) {
                    return cacheData.data;
                } else {
                    return null;
                }
            }
        };

        return returnObj;

    }]);

