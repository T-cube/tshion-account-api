

## coupon

优惠券

### /plan/coupon/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
}
```

### /plan/coupon/detail

QUERY
```javascript
{
  coupon_id: ObjectId,
}
```

OUTPUT
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  products: [], // product_no P0001 P0002
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
  },
  stock_total: Number,
  stock_current: Number,
}
```

### /plan/coupon/create

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
  },
  stock_total: Number,
  stock_current: Number,
}
```

### /plan/coupon/update

QUERY
```javascript
{
  coupon_id: ObjectId,
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
  },
  stock_total: Number,
  stock_current: Number,
}
```

### /plan/coupon/delete

QUERY
```javascript
{
  coupon_id: ObjectId,
}
```

### /plan/coupon/product/add

QUERY
```javascript
{
  coupon_id: ObjectId,
  product_no: String, // P0001 P0002
}
```

### /plan/coupon/product/remove

QUERY
```javascript
{
  coupon_id: ObjectId,
  product_no: String, // P0001 P0002
}
```
