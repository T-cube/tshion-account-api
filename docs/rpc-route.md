# rpc route


INPUT schema
```javascript
{}                // query
```

OUTPUT schema
```javascript
{
  status: <Int>,  // http status
  data: <Any>,    // real data
}
```

## routes

### /company/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  keyword: <String>,
}
```

### /company/detail

QUERY
```javascript
{
  _id: <String>,
}
```

### /company/detail/member

QUERY
```javascript
{
  _id: <String>, // company id
  page: <Int>,
  pagesize: <Int>,
}
```

### /company/detail/project

QUERY
```javascript
{
  _id: <String>, // company id
  page: <Int>,
  pagesize: <Int>,
}
```


### /account/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  keyword: <String>,
}
```

### /account/detail

QUERY
```javascript
{
  _id: <String>,
}
```

### /account/detail/company

QUERY
```javascript
{
  _id: <String>, // user id
  page: <Int>,
  pagesize: <Int>,
}
```

### /account/detail/project

QUERY
```javascript
{
  _id: <String>, // user id
  page: <Int>,
  pagesize: <Int>,
}
```

## 认证

### /plan/auth/list

QUERY

```javascript
{
  page: <Int>,
  pagesize: <Int>,
  status: <String>,  // posted cancelled reposted accepted rejected 多个使用“,”分隔
  plan: <String>, // ent || pro
}
```

### /plan/auth/detail

### /plan/auth/audit

QUERY

```javascript
{
  auth_id: <String>,
  status: <String>,  // accepted rejected
  comment: <String>,
  operator_id,: <String>
}
```


## qrcode

### /qrcode/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  status: <String>, // deleted normal(默认)
}
```

### /qrcode/create

QUERY

```javascript
{
  name: <String>,
  description: <String>,
}
```

### /qrcode/detail

QUERY
```javascript
{
  _id: <String>,
}
```

### /qrcode/update

1. 修改二维码

QUERY
```javascript
{
  _id: <String>,
  name: <String>,
  description: <String>,
}
```

2. 删除/恢复

QUERY
```javascript
{
  _id: <String>,
  status: <String>, // normal, deleted
}
```


### /qrcode/detail/customers

QUERY
```javascript
{
  _id: <String>, // qrcode id
  page: <Int>,
  pagesize: <Int>,
}
```
