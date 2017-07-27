## transfer

### /transfer/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  status: <String>,
  keyword: <String>,
}
```

### /transfer/confirm

QUERY
```javascript
{
  transfer_id: ObjectId
}
```

### /transfer/reject

QUERY
```javascript
{
  transfer_id: ObjectId
}
```
