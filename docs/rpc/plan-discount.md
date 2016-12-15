
## discount

折扣

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
