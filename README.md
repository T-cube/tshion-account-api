# TLifang API Services

本项目是 TLifang API 端实现，负责给TLiFang Web, WeChat WebAPP 提供接口及Oauth认证

## 文档索引

  * [API文档](docs/api/index.md)
  * [Oauth参数](docs/oauth-clients.md)
  * [数据库文档](docs/database/collections.md)
  * [环境部署文档](docs/deployment.md)

## 项目目录说明

```
- app          babel 编译输出目录，运行时代码
- config       配置文件，以`json5`格式存放
- design       设计、文档相关 (临时)
- docs         API相关文档
- locale       多语言文件（错误详情输出）
- public       静态文件资源
+ src          源代码
  - cli        命令行工具
  - lib        公用函数、工具封装
  - models     模型
  - routes     API 路由
  - service    后台服务
  - vendor     第三方组件接口
- view         网页页面模板
```

## 常用命令

```
npm run watch          开发时自动编译指令，`src/`下源码保存后会自动编译输出至`app/`
npm run nodemon        与`npm run watch`配合使用，更新源码后自动重启API服务
npm run build          手工编译源代码，通常用于生产环境部署
npm start              在当前 console 启动服务
pm2 start pm2.json     以后台方式启动服务
pm2 restart tlf-api    重启服务，对于已经使用`./deploy`或`pm2 start`的情况
./deploy               更新源代码，安装npm包，并重新启动服务（用于自动化部署）
./tcli                 项目命令行工具，通常用于初始化数据库，详见`./tcli --help`
```
