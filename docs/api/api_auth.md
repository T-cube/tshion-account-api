# API auth/*

API身份认证

## Table of Contents

* [POST auth/get_token](#post-auth-get_token)
* [POST auth/refresh_token](#post-auth-refresh_token)
* [POST auth/revoke_token](#post-auth-revoke_token)

## Function List

### POST auth/get_token

用户登录并获取token

INPUT
```javascript
{
  "id": "[email|mobile]"  //手机号码
  "password": "{password}"  //密码
}
```
OUTPUT
```javascript
{
  "accessToken":"...",
  "userId":"...",
  "expires":"{time}",
  "refreshToken":"..."
}
```
ERROR
```javascript
"bad token"              //身份校验错误
```

### POST auth/refresh_token

续订token

INPUT
```javascript
{
  "accessToken": "..."  //手机号码
  "refreshToken": "..."  //密码
}
```
OUTPUT
```javascript
{
  "accessToken":"...",
  "userId":"...",
  "expires":"{time}",
  "refreshToken":"..."
}
```
ERROR
```javascript
"bad token"              //身份校验错误
```

### POST auth/revoke_token

注销token

INPUT
```javascript
{
  "accessToken": "..."  //手机号码
  "refreshToken": "..."  //密码
}
```
OUTPUT
```javascript
{
  "accessToken":"...",
  "userId":"...",
  "expires":"{time}",
  "refreshToken":"..."
}
```
ERROR
```javascript
"bad token"              //身份校验错误
```
