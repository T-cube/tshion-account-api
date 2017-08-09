## transfer

### /transfer/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  status: <Enums>,//'created', 'transfered', 'rejected', 'confirmed', 'cancelled'
  keyword: <String>,
}
```

### /transfer/detail

QUERY
```
{
  transfer_id: ObjectId
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
