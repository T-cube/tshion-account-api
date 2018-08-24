# API Account

[返回目录](index.md)

账户操作

## API List

### POST /account/check

校验用户账号格式和存在

INPUT

```javascript
{
  type: String[Enum:mobile,email], // 账号类型
  id: String                       // 账号ID字符串
}
```

OUTPUT

```javascript
{
  exists: Boolean, // 是否存在
}

```
ERROR
```javascript
validation_error //校验错误
```

### POST /account/register

用户注册

INPUT

```javascript
{
  type: String[Enum:email,mobile],     // 账号类型
  id: String,               // 账号ID字符串
  code: String[optional],   // 当type=mobile时需要的短信验证码
  password: String,         // 用户密码
}
```

OUTPUT

```javascript
{
  exists: Boolean,           // 是否存在
}

```
ERROR
```javascript
validation error //校验错误
```

### POST /account/send-sms

发送短信验证码

INPUT

```javascript
{
  mobile: String   // 手机号码
}
```

OUTPUT

```javascript
{}
```

ERROR

| code | error | error_description |
| ---- | ----- | ----------------- |
| 400 | `invalid_mobile` | mobile number invalid |
| 400 | `user_exists` | user exists |
| 429 | `too_many_requests` | request too often |

### POST /account/recover/send-code

找回密码第1步：发送验邮箱、短信证码

INUPT

```javascript
{
  type: [email, mobile],
  mobile: String  //optional depend on type
  email: String   //optional depend on type
}
```

OUTPUT

```javascript
{}
```

ERROR

| code | error | error_description |
| ---- | ----- | ----------------- |
| 429  | `too_many_requests` | request too often |

### POST /account/verify

找回密码第2步：实时校验验证码正误

INPUT

```javascript
{
  type: String[Enum:mobile,email],
  email: String[optional],    // when type == 'email'
  mobile: String[optional],   // when type == 'mobile'
  code: String,               // 验证码
}
```

OUTPUT

```javascript
{
  token: String   // 下一步修改密码需要的临时token
}
```

ERROR

| code | error | error_description |
| ---- | ----- | ----------------- |
| 400  | `invalid_account_type` | 错误的帐户类型 |
| 400  | `account_not_exists` | 帐户不存在 |

### POST /recover/change-pass

找回密码第3步：保存新密码

INPUT

```javascript
{
  type: String[Enum:mobile,email],
  email: String[optional],    // when type == 'email'
  mobile: String[optional],   // when type == 'mobile'
  code: String,               // 验证码
  password: String,           // 新密码
}
```

OUTPUT

```javascript
{}
```

ERROR

| code | error | error_description |
| ---- | ----- | ----------------- |
| 400  | `invalid_account_type` | 错误的帐户类型 |
| 400  | `account_not_exists` | 帐户不存在 |

### POST /account/register

用户注册

INPUT
```javascript
{
  type: String[Enum:email,mobile]  //帐户类型
  id: String             // 帐户名字
  password: String       // 密码
  code: String           // 短信验证码（当type == 'mobile' 时）
}
```

OUTPUT

```javascript
{}
```

ERROR

```javascript
validation_failed        //验证码错误
```

### POST /account/authorise

用户密码校验，请求后得到临时 token，可用于关键操作，需将该 token 加入请求数据

INPUT

```javascript
{
  password: String,
}
```

OUTPUT

```javascript
{
  auth_check_token: String
}
```

### GET /account/info

获取当前登录用户信息

INPUT

`none`

OUTPUT
```javascript
{
  _id:...,
  email:...,
  mobile:...
}
```

### GET /account/activity

获取登录日志

OUTPUT
```javascript
[{
  _id: ObjectId,
  user: ObjectId,
  action: String,
  client_id: String,
  user_agent: String,
  ip: String,
  time: Date,
}...]
```
