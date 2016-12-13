## auth

### /plan/auth/list

QUERY

```javascript
{
  page: Int,
  pagesize: Int,
  status: String,  // posted cancelled reposted accepted rejected 多个使用“,”分隔
  plan: String, // ent || pro
}
```

### /plan/auth/detail

QUERY

```javascript
{
  auth_id: ObjectId,
}
```

### /plan/auth/audit

QUERY

```javascript
{
  auth_id: ObjectId,
  status: String,  // accepted rejected
  comment: String,
  operator_id,: String
}
```


## product


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


## discount


### /plan/discount/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
}
```

### /plan/discount/detail

QUERY
```javascript
{
  discount_id: ObjectId,
}
```

OUTPUT
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  criteria: {
    quantity: Number,               // 最低数量
    total_fee: Currency,              // 最低金额
  },
  discount: {
    type: DiscountType,             // 优惠类型：金额，
    number: Number,                 // 赠送数量
    rate: Number,                   // 折扣（0~0.99）
    amount: Currency,                 // 优惠金额
  },
  period: {
    date_start: Date,
    data_end: Date,
  }
}
```

### /plan/discount/create

QUERY
```javascript
{
  title: String,
  description: String,
  criteria: {
    quantity: Number,               // 最低数量
    total_fee: Currency,              // 最低金额
  },
  discount: {
    type: DiscountType,             // 优惠类型：金额，
    number: Number,                 // 赠送数量
    rate: Number,                   // 折扣（0~0.99）
    amount: Currency,                 // 优惠金额
  },
  period: {
    date_start: Date,
    data_end: Date,
  }
}
```

### /plan/discount/update

QUERY
```javascript
{
  discount_id: ObjectId,
  title: String,
  description: String,
  criteria: {
    quantity: Number,               // 最低数量
    total_fee: Currency,              // 最低金额
  },
  discount: {
    type: DiscountType,             // 优惠类型：金额，
    number: Number,                 // 赠送数量
    rate: Number,                   // 折扣（0~0.99）
    amount: Currency,                 // 优惠金额
  },
  period: {
    date_start: Date,
    data_end: Date,
  }
}
```

### /plan/discount/delete

QUERY
```javascript
{
  discount_id: ObjectId,
}
```
