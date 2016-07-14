# API Oauth

[返回目录](index.md)

API身份认证

## OAuth

### GET /oauth/authorize

第三方向 TLifang 发起授权申请，并获取 code

QUERY_PARAMS:
```javascript
{
  response_type: 'code',
  client_id: 'tlf-www',
  redirect_uri: '<redirect_uri>',
  state: '<state>',
  scope: '<optional>',
}
```

RESPONSE:
```
HTTP 302 Redirct:
<redirect_uri>?code=<code>&state=<state>
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
  'token_type_hint': '...'
  'token': '...',
}
```
