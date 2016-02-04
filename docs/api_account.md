# API account/*

当前用户操作

## Table of Contents

* [POST account/check](#post-account-check)
* [POST account/send_email](#post-account-send_email)
* [POST account/verify_email](#post-account-verify_email)
* [POST account/verify_sms](#post-account-verify_sms)
* [POST account/register](#post-account-register)
* [GET account/info](#GET-account-info)

## Function List


### POST account/check
校验用户账号格式和存在

INPUT
```javascript
{
  "id": "{email|mobile}"    // 电子邮件或中国手机号码
}
```
OUTPUT
```javascript
{
  "type": "[account/email|mobile]", // 字符串，"email" 或者 "mobile"
  "id": "{id}"              // 提交的原始数据
}
```
ERROR
```javascript
"bad id format" //ID格式错误，无法识别
"id exists"     //ID已存在
```

### POST account/send_email
发送验证邮件 NOT READY

INPUT
```javascript
{
  "email": "{email}"    // 电子邮件
}
```
OUTPUT
```javascript
{}
```
ERROR
```javascript
"bad email format" //ID格式错误
```

### POST account/send_sms
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

### POST account/verify_sms
校验短信验证码

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

### POST account/register
用户注册

INPUT
```javascript
{
  "type": "[account/email|mobile]"  //手机号码
  "id": "{email|mobile}"    //手机号码
  "password": "{password}"  //密码
  "code": "{code}"          //URL中的验证码
}
```
OUTPUT
```javascript
{}
```
ERROR
```javascript
"unkown type"              //类型不为 email 或 mobile
"bad verification code"    //验证码错误
```

### GET account/info
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
