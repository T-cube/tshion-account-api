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
  status: <String>,
}
```

### /broadcast/delete

QUERY
```javascript
{
  broadcast_id: <String>,
}
```
