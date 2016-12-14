## type

套餐计划类型

### /plan/type/list

### /plan/type/detail

QUERY

```javascript
{
  plan_id: ObjectId
}
```

OUTPUT

```javascript
{
  _id: ObjectId,
  name: String,
  type: String, // free pro ent
  description: String,
  default_member: Number,
  project_actived: Number,
  project_all: Number,
  store: Number,
  project_store: Number,
  inc_member_store: Number,
  max_file_size: Number,
  max_member: Number,
  products: [
    _id: ObjectId,
    title: String,
    plan: String,
    product_no: String,
    ...
  ],
}
```

### /plan/type/update

QUERY

```javascript
{
  plan_id: ObjectId,
  name: String,
  description: String,
}
```


## auth

认证

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
