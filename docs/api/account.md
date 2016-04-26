# API Account

[返回目录](index.md)

当前用户操作

## Table of Contents

* [POST /account/check](#post-account-check)
* [POST /account/send_email](#post-account-send_email)
* [POST /account/verify_email](#post-account-verify_email)
* [POST /account/verify_sms](#post-account-verify_sms)
* [POST /account/register](#post-account-register)
* [GET /account/info](#GET-account-info)

## Function List

### POST /account/check
校验用户账号格式和存在

INPUT
```javascript
{
  "type": "[email|mobile]", // 账号类型
  "id": "id_string"         // 账号ID字符串
}
```
OUTPUT
```javascript
{
  "exists": true|false, // 是否存在
}
```
ERROR
```javascript
"validation error" //校验错误
```

### POST /account/register
用户注册

INPUT
```javascript
{
  "type": "[email|mobile]",     // 账号类型
  "id": "id_string",            // 账号ID字符串
  "code": "",                   // 当type="mobile"时需要的短信验证码
  "password": "password_string" // 用户密码
}
```
OUTPUT
```javascript
{
  "exists": true|false, // 是否存在
}
```
ERROR
```javascript
"validation error" //校验错误
```

### POST /account/send_sms
发送短信验证码 NOT READY

INPUT
```javascript
{
  "mobile": "{mobile}"    // 电子邮件
}
```
OUTPUT
```javascript
{}
```
ERROR
```javascript
"bad mobile format" //ID格式错误
```

### POST account/verify_email

校验邮件验证码

INPUT
```javascript
{
  "code": "{code}"     //URL中的验证码
}
```
OUTPUT
```javascript
{
  "email": "{email}"   //电子邮件
}
```
ERROR
```javascript
"bad verification code" //验证码错误
```

### POST /account/verify_sms
校验短信验证码

TODO

INPUT
```javascript
{
  "mobile": "{mobile}"      //手机号码
  "code": "{code}"          //URL中的验证码
}
```
OUTPUT
```javascript
{
  "mobile": "{mobile}"      //手机号码
}
```
ERROR
```javascript
"bad verification code"     //验证码错误
```

### POST /account/register
用户注册

INPUT
```javascript
{
  "type": "[email|mobile]"  //帐户类型
  "id": "{string}"          //帐户名字
  "password": "{password}"  //密码
  "code": "{code}"          //短信验证码（当type==mobile时）
}
```
OUTPUT
```javascript
{
  "success": [true|false]
}
```
ERROR
```javascript
"unkown_type"              //类型不为 email 或 mobile
"validation_failed"        //验证码错误
```

### POST /account/authorise

用户密码校验，请求后得到临时 token，可用于关键操作，需将该 token 加入请求数据

INPUT
```javascript
{
  password: <String>,
}
```

OUTPUT
```javascript
{
  auth_check_token: <String>
}
```

### GET /account/info
获取当前登录用户信息

INPUT

`none`

OUTPUT
```javascript
{
  "_id":"...",
  "email":"...",
  "mobile":"..."
}
```
