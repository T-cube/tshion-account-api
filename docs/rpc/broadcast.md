## broadcast

### /broadcast/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  status: <String>,
}
```

### /broadcast/create

QUERY
```javascript
{
  tilte: <String>,
  content: <String>,
  link: <String>, //optional
  creator: <String>,
  type: <String>,
}
```

### /broadcast/update

QUERY
```javascript
{
  broadcast_id: <String>,
  status: <String>, // ENUM : 'active', 'inactive'
}
```

### /broadcast/delete

QUERY
```javascript
{
  broadcast_id: <String>,
}
```

### /broadcast/detail

QUERY
```javascript
{
  broadcast_id: <String>,
}
```
