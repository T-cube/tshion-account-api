
## product

产品

### /plan/product/list

QUERY
```javascript
{}
```

### /plan/product/detail

QUERY
```javascript
{
  product_id: ObjectId,
}
```

### /plan/product/update

QUERY
```javascript
{
  product_id: ObjectId,
  title: String,
  description: String,
  original_price: Int,
  amount_min: (Int, null),
  amount_max: (Int, null),
  stock_total: (Int, null),
  stock_current: (Int, null),
}
```

### /plan/product/discount/add

QUERY
```javascript
{
  product_id: ObjectId,
  discount_id: ObjectId,
}
```

### /plan/product/discount/remove

QUERY
```javascript
{
  product_id: ObjectId,
  discount_id: ObjectId,
}
```
