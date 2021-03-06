# API Oauth

[返回目录](index.md)

API身份认证

## OAuth

### GET /oauth/login

第三方向 TLifang 发起授权申请，并获取 code

QUERY_PARAMS:
```javascript
{
  response_type: 'code',
  client_id: 'tlf-www',
  redirect_uri: '<redirect_uri>',
}
```

RESPONSE:
`login page`

WHEN user login ok through login page:
```
HTTP 302 Redirct:
<redirect_uri>?code=<code>
```

ELSE:
```
HTTP 302 Redirct:
/oauth/authorise?code=<http_status_code>&error=<oauth_error>&error_description=<error_description>
```

### GET /oauth/authorize

第三方向 TLifang 发起授权申请，并获取 code
前提条件是已经通过`/oauth/login`登录成功

QUERY_PARAMS:
```javascript
{
  response_type: 'code',
  client_id: 'tlf-www',
  redirect_uri: '<redirect_uri>',
}
```

RESPONSE:
```
HTTP 302 Redirct:
<redirect_uri>?code=<code>
```

### POST /oauth/token

用户登录并获取token

INPUT(application/x-www-form-urlencoded)
```javascript
{
  grant_type: '[password|authorization_code|refresh_token]',
  client_id: '...',
  client_secret: '...',
  // if grant_type == 'password':
  username: '<email>|<mobile>',
  password: '<password>',
  // elseif grant_type == 'authorization_code':
  code: '...',
  redirect_uri: '<redirect_uri>',
  // elseif grant_type == 'refresh_token':
  refresh_token: '<refresh_token>',
  // endif
  //if login fails too many times req.body need captcha
  captcha: '...',
}
```

OUTPUT
```javascript
{
  access_token: '<access_token>',
  expires_in: '<expires_in>',
  refresh_token: '<refresh_token>'
  token_type: 'baerer',
}
```

失败

| code | error | description |
| ---- | ----- | ----------- |
| 429  | `too_many_requests` | 单位时间内，用户请求次数过多 |
| 400  | `account_locked` | 此账号登录失败次数过多，锁定账号。|
| 400  | `login_fail_need_captcha` | 账号登录密码错误三次，返回该错误时，前端应自动调用获取验证码接口 请求的QUERY中 `captchaType` 为 `login`。|
| 400  | `missing_captcha` | 账号登录失败次数多，登录需要有`captcha` , 返回该错误前端应自动调用验证码接口， QUERY要求同上一条。 |
| 400  | `wrong_captcha` |  账号登录校验验证码时，验证码错误， 返回该错误前端自动调用验证码接口， QUERY同上一条。|

当 grant_type == 'authorization_code' 时，如无 redirect_uri 参数，正常返回，否则做跳转并把结果放入URL参数：

```
HTTP 302 Redirect:
<redirect_uri>?access_token=<access_token>&expires_in=<expires_in>&refresh_token=<refresh_token>&token_type=baerer
```

### POST /oauth/revoke

注销 token

INPUT
```javascript
{
  'token_type_hint': 'access_token|refresh_token'
  'token': '...',
}
```
