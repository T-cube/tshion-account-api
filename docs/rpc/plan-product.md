
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
  discount: [ObjectId],
  original_price: Int,
  amount_min: (Int, null),
  amount_max: (Int, null),
  stock_total: (Int, null),
  stock_current: (Int, null),
}
```

### /plan/product/history

获取商品的历史版本

QUERY
```javascript
{
  product_id: ObjectId,
  page: Int,
  pagesize: Int,
}
```

OUTPUT
```javascript
{
  list: [{
    title: String,
    description: String,
    version: Int,
    ...
  }...],
  page: Int,
  pagesize: Int,
  totalRows: Int,
}
```

<!-- ### /plan/product/discount/add

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
``` -->
