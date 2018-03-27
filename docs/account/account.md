# 账号系统

## 注册流程
1. 填写手机号
2. 提交手机号换取获取图片验证码
3. 提交图片验证码和手机号获取短信验证码
4. 提交手机号、密码、短信验证码完成注册

### api-获取短信验证码
GET /api/tools/captcha?username=18705928626&captchaType=sms

参数名      |参数类型      |数据类型
-|:-: | -:
username   |query        |Number
captchaType|query        |Enum[String], 'sms'

返回
```
{
  canvasURL: Base64PngData
}
```

### api-获取短信验证码
POST /api/account/send-sms

参数名      |参数类型      |数据类型
-|:-: | -:
mobile|body|Number
captcha|body|String

### api-注册
POST /api/account/register

参数名      |参数类型      |数据类型
-|:-: | -:
code|body|String
mobile|body|Number
password|body|String
type|body|Enum[String], 'mobile','email'

## 登陆流程
### api-登陆
POST /oauth/token
```
headers
Content-Type: application/x-www-form-urlencoded
```

参数名      |参数类型      |数据类型
-|:-: | -:
grant_type|body|Enum[String] 'password','refresh_token'
client_id|body|'com_tlifang_web'
client_secret|body|'Y=tREBruba$+uXeZaya=eThaD3hukuwu'
username|body|String/Number
password|body|String