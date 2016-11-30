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
  status: <String>,  // accepted rejected ...
}
```

### /plan/auth/detail

QUERY

```javascript
{
  auth_id: <String>,
}
```

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
