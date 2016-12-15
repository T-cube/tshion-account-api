
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
  original_price: Int,
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
