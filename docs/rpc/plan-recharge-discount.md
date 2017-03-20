
## recharge-discount

充值优惠

### /plan/recharge-discount/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
}
```

### /plan/recharge-discount/detail

QUERY
```javascript
{
  discount_id: ObjectId,
}
```

### /plan/recharge-discount/create

QUERY
```javascript
{
  title: String,
  amount: Currency,
  extra_amount: Currency,
}
```

### /plan/recharge-discount/update

QUERY
```javascript
{
  title: String,
  amount: Currency,
  extra_amount: Currency,
}
```

### /plan/recharge-discount/delete

QUERY
```javascript
{
  discount_id: ObjectId,
}
```
