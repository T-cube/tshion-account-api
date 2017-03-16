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
  link: <String>,
  creator: <String>,
}
```

### /broadcast/update

QUERY
```javascript
{
  broadcast_id: <String>,
  status: <String>, // ENUM : 'active', 'expired'
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
