# Tlifang Payment Database Design

## Description

 * 金额在数据库中是单位“分”的整数（使用`Currency`类型表示），即实际显示使用公式 `m = n / 100`

## Basic Type Define

```javascript
PaimentMethod: String[Enum:balance,alipay,wxpay,banktrans];
DiscountCriteria: String[Enum:quantity,total_fee,times];
DiscountType: String[Enum:number,rate,amount];
OrderStatus: String[Enum:created,paying,expired,cancelled,succeeded];
InvoiceOrderStatus: String[Enum:created,confirmed,rejected,issued,shipped,completed];
TeamPlan: String[Enum:free,pro,ent];
Currency: Number;
```

## Tables

### Collection payment.product

商品信息

```javascript
{
  _id: ObjectId,
  product_no: String,
  title: String,
  description: String,
  original_price: Currency,
  discount: [ObjectId...],
  version: Number,
  amount_min: Number,
  amount_max: Number,
  stock_total: Number,
  stock_current: Number,
  date_create: Date,
  date_update: Date,
}
```

``范例数据``

| product_no | title | description | original_price |
| ---------- | ----- | ----------- | -------------- |
| P0001 | Pro Edition Monthly Fee | 专业版月费 | 99.00 |
| P0002 | Pro Edition Per User Fee | 专业版用户升级月费 | 9.90 |
| P0001 | Cooperate Edition Monthly Fee |  企业版月费 | 199.00 |
| P0002 | Cooperate Edition Per User Fee | 企业版用户升级月费 | 19.90 |

### Collection payment.product.history

商品历史版本，除列举字段，同商品信息

```javascript
{
  _id: ObjectId,
  // index: Number,
  version: Number,
  ... // 同商品信息
}
```

### Collection payment.discount

优惠支付信息，可用于多个产品

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  criteria: {
    type: DiscountCriteria,
    quantity: Number,            // 最低数量
    times: Number,               // 最低数量
    total_fee: Currency,         // 最低金额
  },
  discount: {
    type: DiscountType,          // 优惠类型：金额，
    number: Number,              // 赠送数量
    rate: Number,                // 折扣（0~0.99）
    amount: Currency,            // 优惠金额
  },
  period: {
    date_start: Date,
    data_end: Date,
  },
  date_create: Date,
  date_update: Date,
}
```

### Collection payment.coupon

商家发布的优惠券

```javascript
{
  _id: ObjectId,
  coupon_no: String,                   // 优惠券编号
  products: [ObjectId(product_id)...], // 适用产品
  title: String,
  description: String,
  criteria: {
    type: DiscountCriteria,
    quantity: Number,            // 最低数量
    times: Number,               // 最低数量
    total_fee: Currency,         // 最低金额
  },
  discount: {
    type: DiscountType,             // 优惠类型：金额，
    number: Number,                 // 赠送数量
    rate: Number,                   // 折扣（0~0.99）
    amount: Currency,               // 优惠金额
  },
  period: {
    date_start: Date,
    data_end: Date,
  },
  stock_total: Number,              // 库存数量，无数量限制为 null
  stock_current: Number,            // 剩余数量，无数量限制为 null
  date_create: Date,
  date_update: Date,
}
```

<!-- ### Collection payment.coupon.item

已使用的优惠券

```javascript
{
  _id: ObjectId,
  coupon_no: String,                // 优惠券编号
  serial_no: String,                // 优惠券序列号（由优惠券编号追加随机数字）
  company_id: ObjectId,             // 关联团队
  user_id: ObjectId,                // 申请用户
  is_used: Boolean,                 // 是否已使用
  date_create: Date,                // 申请日期
  date_used: Date,                  // 使用日期
  period: {
    date_create: string,
    date_end: string
  }
}
``` -->

### Collection payment.company.coupon

公司优惠券

```javascript
{
  _id: ObjectId,                    // company_id
  list: [{
    coupon: ObjectId,               // coupon_id
    coupon_no: String,              // 优惠券序列号（由优惠券编号追加随机数字）
    status: String[Enum: used, unused],
    date_create: Date,
    date_used: Date,
  }...]
}
```

### Collection payment.balance

记录帐户余额

```javascript
{
  _id: ObjectId,                      // company_id
  balance: Currency,                  // 帐户剩余金额
  log: [{
    // optional
    recharge: {                       // 充值信息
      _id: ObjectId,
      amount: Currency,
      recharge_no: String,
    },
    // optional
    order: {                          // 订单信息
      _id: ObjectId,
      amount: Currency,
      order_no: String
    }
    amount: Currency,                 // 充值或消费的金额
    balance: Currency,                // 当前的余额
    date_create: Date
  }]
}
```

### Collection payment.order

用户购买产品额记录

```javascript
{
  _id: ObjectId,
  order_no: String,
  user_id: ObjectId,
  company_id: ObjectId,
  original_times: Number,   // 用户购买的月数
  times: Number,            // 用户购买的月数 + 优惠赠送的月数
  plan: TeamPlan,           // 用户购买的计划
  original_plan,            // 用户之前的计划
  // 商品信息
  product: [{
    _id: ObjectId,
    product_no: String,
    title: String,
    quantity: Number,
    original_price: Currency,
    sum: Currency,
  }...],
  // 打折信息
  discount: [{
    type: DiscountType,
    title: String,
    amount: Currency        // 降低的价格
  }],
  coupon: String,                // 优惠券编号
  // 支付信息
  original_sum: Currency         // 原始价格
  paid_sum: Currency,            // 支付金额
  invoice_id: ObjectId,          // 发票id
  status: OrderStatus,           // 订单状态
  date_create: Date,
  date_update: Date,
  date_expires: Date,
  // 订单状态历史变更记录
  payment: {
    date_paid: Date,
    method: PaymentMethod
  },
  log: [{
    _id: ObjectId,
    status: OrderStatus,
    date_create: Date,
    creator: String[Enum:user,system,cs], // 用户，系统，客服
    operator_id: String,                  // when creator == 'cs'
  }]
}
```

### Collection payment.recharge

帐户充值记录

```javascript
{
  _id: ObjectId,
  recharge_no: String,              // 帐户收入流水号
  user_id: ObjectId,
  company_id: ObjectId,             // 关联公司
  amount: Currency,                 // 充值金额
  paid_sum: Currency,
  payment_method: PaymentMethod,    // 支付方式
  status: String,                   // OrderStatus
  payment: {
    date_paid: Date,
    method: PaymentMethod
  }
  date_create: Date,
  date_update: Date,
  date_expires: Date,
}
```

### Collection payment.charge.order

支付记录

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,
  charge_type: String[Enum:plan,recharge], // 订单或者充值
  payment_method: PaymentMethod,
  date_create: Date,
  status: OrderStatus,
  // 支付接口信息（可选），参考 @ym-modules/payment
  payment_data: {
    title: String,                  // 标题
    out_trade_no: String,           // 订单号
    total_fee: Currency,            // 总金额
    notify_url: String,             // 通知回调地址
    redirect_url: String,           // 重定向地址
    detail: String,                 // 商品详细描述
    product_id: String,             // 商品号
    method: String,                 // 支付方式
    service: String,                // 请求网关
    out_user: String,               // 支付者
    merchant_url: String,           // 支付中断回调地址
    agent_id: String,               // 代理人
    show_url: String,               // 商品展示地址
    spbill_create_ip: String,       // 用户实际ip地址
    time_start: Date,               // 支付发起时间
    time_expire: Date,              // 支付失效时间
    goods_tag: String,              // 商品标记
    limit_pay: String,              // 指定支付方式
    openid: String                  // 用户标识    
  },
  // 查询支付状态的结果
  payment_query: {},
  // 第三方支付结果通知
  payment_notify: {},
}
```

### Collection payment.invoice

发票记录跟踪记录信息

```javascript
{
  _id: ObjectId,
  invoice_no: String,
  user_id: ObjectId,
  company_id: ObjectId,
  // 状态跟踪
  status: InvoiceOrderStatus,
  title: String,                    // 只能为认证公司名称
  subject: String,
  total_amount: Currency,           // （税后）总金额，为实际充值金额
  tax_rate: Float,                  // 税率
  order_list: [ObjectId],           // 项目明细
  // 地址信息
  address: {
    _id: ObjectId,
    location: {
      province: String,
      city: String,
      district: String,
      address: String,
    },
    postcode: String,
    contact: String,
    phone: String,
  },
  // 快递单追踪
  chip_info: {
    brand: String,                  // 快递品牌
    track_no: String,               // 快递跟踪单号
  },
  date_create: Date,
  date_update: Date,
}
```

### Collection payment.address

企业联系人收货地址列表，用于邮寄发票、礼品

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,
  default_address: ObjectId,
  list: [{
    _id: ObjectId,
    location: {
      province: String,
      city: String,
      district: String,
      address: String,
    },
    postcode: String,
    contact: String,
    phone: String,
  }...],
}
```
