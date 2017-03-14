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

获得验证码图片64位码

QUERY:必须有`uesrname`,`captchaType`两个参数

成功

OUTPUT：
```javascript
{
  'captcha': '...'
}
```

### GET /broadcast/list

QUERY:
`page` `pagesize` `status`

`status` 枚举['1', '0']

### GET /broadcast/detail

QUERY:
`braodcast_id` 