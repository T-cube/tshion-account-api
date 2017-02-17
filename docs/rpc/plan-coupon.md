

## coupon

优惠券

### /plan/coupon/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
  status: String, // normal, deleted (以‘,’分割)
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
  order_type: [String],               // newly renewal upgrade 适用于某种类型的订单
  products: [ObjectId],               // product._id
  criteria: {
    type: DiscountType,
    times: Number,
    quantity: Number,               // 最低数量
    total_fee: Currency,              // 最低金额
  },
  discount: {
    type: DiscountType,             // 优惠类型：金额，
    number: Number,                 // 赠送数量
    rate: Number,                   // 折扣（0~0.99）
    total_fee: Currency,                 // 优惠金额
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
  order_type: [String],               // newly renewal upgrade 适用于某种类型的订单
  products: [ObjectId],               // product._id
  criteria: {
    type: [times, quantity, total_fee],
    times: Number,
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
  order_type: [String],               // newly renewal upgrade 适用于某种类型的订单
  products: [ObjectId],               // product._id
  criteria: {
    quantity: Number,                  // 最低数量
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

<!-- ### /plan/coupon/product/add

添加优惠券适用的产品

QUERY
```javascript
{
  coupon_id: ObjectId,
  product_no: String, // P0001 P0002
}
```

### /plan/coupon/product/remove

移除优惠券适用的产品

QUERY
```javascript
{
  coupon_id: ObjectId,
  product_no: String, // P0001 P0002
}
``` -->

### /plan/coupon/company

有该优惠券的公司列表

QUERY
```javascript
{
  coupon_id: ObjectId,
}
```

### /plan/coupon/send

给公司发优惠券，批量发

QUERY
```javascript
{
  coupons: [ObjectId],
  companies: [ObjectId],
}
```
