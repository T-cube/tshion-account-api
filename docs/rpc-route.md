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
