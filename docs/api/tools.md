# API Tools

[返回目录](index.md)

工具类接口

## Function List

### GET /tools/avatar-list/:type

获取头像列表

QUERY:
关于头像类型`type`: 有 `company`, `project`, `user` 三种

OUTPUT:
```javascript
[<URL>...]
```
### GET /tools/captcha

根据token获得验证码图片64位码

QUERY:必须有`uesrname`,`client_id`,`captchaToken`三个参数

成功

OUTPUT：
```javascript
{
  'captcha': '...'
}
```
失败
有两种错误 `error` 分别是：
1. `missing_or_wrong_captcha_token` token不正确
2. `no_need_captcha` 无错误登录存储token 不应该调用此接口
