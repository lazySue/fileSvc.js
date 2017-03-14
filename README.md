# fileSvc
基于angular 1 ，cordova-plugin-file,cordova-plugin-file-transfer 插件的 文件服务，适用于ionic项目。

# fileSvc.init
进入项目时先初始化文件服务，确保文件服务初始化处理成功后再进入相关页面。

    fileSvc.init().then(function(){
        //...
    });
    
# resourceSvc.init
若项目用到资源存储服务，需在进入项目时初始化资源存储服务 。

    resourceSvc.init().then(function(){
        //...
    })





