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

### /company/detail/company

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
