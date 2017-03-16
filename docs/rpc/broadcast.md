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
<<<<<<< HEAD
  status: <String>, // ENUM : 'active', 'expired'
=======
  status: <String>, // ENUM :'active', 'expired'
>>>>>>> 87027d59d0f8962cb1150b7f906beb9c6e8a9502
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
