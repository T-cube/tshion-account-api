
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
