# API 文档

by [alphakevin](https://coding.net/u/alphakevin)

## Change log

* 2016-01-04 初始化 API 文档

## 基本信息

### 访问方式

访问地址：http://{server_address}:3000/api/{api_function}/{api_action}

支持动作：GET, POST, PUT, DELETE

### 数据格式

输入、输出数据格式均为JSON

#### 请求格式

POST、PATCH 请求头请加入：
```http
Content-Type: application/json
```

使用 Bearer token 进行身份验证

```http
Authorization: Bearer {access_token}
```

#### 返回格式

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  ...
}
```

##### 错误

HTTP 错误编码通常为404, 400, 500

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "code": {http_status_code},
  "error": "{error}",
  "error_description":{error_description}
}
```

`error` 为系统约定的错误常量，通常与`code`有关
`error_description` 可为字符串描述（可读的）或数组、对象

## API List

### Common API

* [/oauth](oauth.md) API 身份认证
* [/account](account.md) 帐户操作

### RESTful API

* [/users](users.md) 帐户操作
* [/company](company.md) 公司操作
* [/project](project.md) 公司操作
* [/task](task.md) 任务操作
