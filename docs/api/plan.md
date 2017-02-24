# Plan

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
PaymentMethod: String[Enum:balance,alipay,wxpay,banktrans];
TeamPlanPaid: String[Enum:pro,ent] // 专业版，企业版
PlanStatus: String[Enum:actived,expired,overdue],
AuthStatus: String[Enum:posted,cancelled,reposted,accepted,rejected],
OrderTypes: String[Enum: newly(新购), renewal(续费), upgrade(升级), degrade(降级)],
OrderStatus: String[Enum:created(待支付), paying(待支付), expired(过期), cancelled(取消), succeed(成功)],
ChargeType: String[plan, recharge],
```

## 挂载点

```javascript
/company/:companyId/plan
```

### 认证购买的流程
1. 获取所有计划的列表 `GET /plan/list`
2. 获取公司当前的计划状态 `GET /plan/status`
3. 获取公司当前的认证状态 `GET /plan/auth/status`
4. 认证，团队：`POST /plan/auth?plan=`
5. 试用 `POST /plan/trial`
6. 购买，订单预查询（用户操作刷新状态）：`POST /plan/order/prepare`，生成订单：`POST /plan/order`
7. 查看当前正在处理的订单 `GET /plan/order/pending`
8. 支付处理的订单 `POST /plan/order/:orderId/pay`
9. 查询订单 `POST /plan/order/:orderId/query`

### 各种订单类型
1. newly(新购)，包含未购买过产品的新用户购买，产品到期并降级到免费版再次购买产品
2. renewal(续费)，购买了产品并在使用周期内续费，或者过期后续费，产品的套餐内容不变，仅增加使用的周期（周期不能超过最大值）
3. upgrade(升级)，用户在产品使用周期内，提高方案或者人数，不能同时修改人数和方案，其中人数代表总的购买数
4. degrade(降级)，用户在产品使用周期内，减少方案或者人数，不能同时修改人数和方案，其中人数代表总的购买数


### GET /list

OUTPUT

```javascript
[{
  name: String,
  type: TeamPlan,
  description: String,
  store: Int,
  member: Int,
  products: [
    _id: ObjectId
    title: String,
    plan: String,
    ...
  ],
  ext_info: String,
}...]
```

### GET /product

查询产品和优惠

QUERY

```javascript
{
  plan: TeamPlan,
  order_type: OrderTypes,
}
```

OUTPUT

```javascript
[
  {
    _id: ObjectId,
   title: String,
   description: String,
   plan: String,
   product_no: String,
   original_price: String,
   discount: [
     {
       _id: ObjectId,
       title: String,
       description: String,
       order_type: [OrderTypes],
       criteria: {
         type: String,
         times: Number,
       },
       discount: {
         type: String,
         amount: Number,
       },
       period: {
         date_start: Date,
         date_end: Date,
       },
       date_update: Date,
       date_create: Date,
     }
   ],
   amount_min: Number,
   amount_max: Number,
   stock_total: Number,
   stock_current: Number,
   date_create: Date,
   date_update: Date,
  }
]
```

### GET /payment

获取支付方式

OUTPUT

```javascript
[
  {
    key: 'alipay',
    title: '支付宝'
  },
  {
    key: 'wxpay',
    title: '微信支付'
  },
  {
    key: 'balance',
    title: '余额'
  }
]
```

### GET /balance

获取公司账户余额

OUTPUT

```javascript
{
  company_id: ObjectId,
  balance: Currency
}
```

### GET /balance/log

获取公司账户余额日志

INPUT

```javascript
{
  page: Number,
  pagesize: Number,
}
```

OUTPUT

```javascript
{
  page: Number,
  pagesize: Number,
  totalrows: Number,
  log: []
}
```

### GET /status

获取当前的认证状态

OUTPUT

```javascript
{
  company_id: ObjectId,
  current: {
    _id: ObjectId,
    type: String, // paid trial
    user_id: ObjectId,
    plan: TeamPlanPaid,
    status: PlanStatus,
    date_start: Date,
    date_end: Date,
  },
  viable: {
    trial: [TeamPlanPaid], // 可试用的（没有试用和购买）
    paid: [TeamPlanPaid], // 可购买的（认证过的，企业的认证覆盖专业版）
  },
  certified: TeamPlanPaid, // 已认证的
  degrade: {              // 正在降级的信息，如果存在，则提交新的订单前需要取消降级
    order: {
      _id: ObjectId,
      plan: String,
      member_count: String,
    }
    time: Date,
    date_create: Date,
    status: String, // actived
  }
}
```

### POST /trial

试用

可以试用没有购买且没有试用过的计划

正在使用购买的计划也可以试用新的计划，当试用结束后恢复原来购买的状态，试用期的时间也计入原来购买计划的周期

正在使用试用中的计划也可以试用新的计划，当前试用过期


INPUT

```javascript
{
  plan: [TeamPlanPaid],
}
```

### POST /degrade/cancel

取消降级的预约


## auth

### GET /auth/status

获取当前的认证状态

certified为已认证过的计划，不能重复认证，如果certified == 'ent'，则不能认证pro，如果为pro则可以提交ent认证

pending为正在处理中的认证，如果pending.status != 'rejected'，则不能提交相同计划的认证，此时如果可以提交新的认证，则该认证失效（提示用户）：status变成'expired'

如果pending存在，可以取消该计划的认证


OUTPUT

```javascript
{
  certified: {
    _id: ObjectId,        // authId
    plan: TeamPlanPaid,
    company_id: ObjectId,
    user_id: ObjectId,
    date_apply: Date,
    status: AuthStatus,
  },
  pending: {
    _id: ObjectId,        // authId
    plan: TeamPlanPaid,
    company_id: ObjectId,
    user_id: ObjectId,
    date_apply: Date,
    status: AuthStatus,
  }
}
```

### GET /auth/item/:authId

OUTPUT

```javascript
{
  _id: ObjectId,
  plan: TeamPlanPaid,
  company_id: ObjectId,
  user_id: ObjectId,
  date_apply: Date,
  status: AuthStatus,
  nearest_data: {}, // 最后一次修改的记录
  history_data: [{}], // 历史修改记录
  log: [], // 客服处理日志
}
```

### POST /auth

提交认证

QUERY

```javascript
{
  plan: String,
}
```

POST
```javascript
{
  contact: {
    realname: String,
    gender: String[Enum:F,M],
    phone: String,
    // 实名信息，仅在专业版认证时需要
    position: String, // 企业版 职务
    address: {
      province: String,
      city: String,
      district: String,
      postcode: String,
      address: String,
    },
    // 实名信息，仅在专业版认证时需要
    realname_ext: {
      idcard: String, // 身份证编码
      idcard_photo: [ObjectId],
    },
  },
  // 团队信息
  team: {
    team_name: String,
    location: {
      country: String,
      province: String,
      city: String,
      district: String,
      address: String,
    },
    industry: {
      classify: String,
      industry: String,
    },
    scale: String,
    description: String,
  }
  // 企业信息
  enterprise: {
    team_name: String,
    location: {
      province: String,
      city: String,
      district: String,
      postcode: String,
      address: String,
    },
    industry: {
      classify: String,
      industry: String,
    },
    scale: String,
    description: String,
    certificate_type: String, // license, code
    certificate_pic: [ObjectId],
  }
}
```

### POST /auth/upload

QUERY

```javascript
{
  plan: String,
}
```

POST

```javascript
{
  auth_pic: File, // 身份证或企业执照
}
```

OUTPUT

```javascript
[
  {
    _id: ObjectId,
    url: Url,
  }
]
```

### PUT /auth

更新认证，驳回的认证才能重新提交

POST // 同 post


### PUT /auth/status

取消认证，审核通过的认证不能取消
先通过接口`GET /auth/status`，获取当前是否有正在进行的申请，有则调用该接口，其中plan从pending中获取

INPUT

```javascript
{
  plan: TeamPlan,
  status: String, // cancelled
}
```


## order

### POST /order

INPUT

```javascript
{
  plan: TeamPlanPaid,      // order_type 为 newly upgrade degrade 时有该字段
  order_type: String,     // newly（新购）, renewal（续费）, upgrade（升级）, degrade（降级）, patch（补交欠费）
  times: Int,             // order_type 为 newly renewal 时有该字段，购买的月数
  member_count: Int,      // order_type 为 newly upgrade degrade 时有该字段,人数为购买的人数（总人数-基础人数）
  coupon: String,       // 满足优惠券条件的优惠券coupon_no
}
```

OUTPUT

```javascript
{
  _id: ObjectId,
  ...
}
```

### POST /order/prepare

INPUT

同 POST /order

OUTPUT

```javascript
{
  isValid: Boolean,
  error: String,  // isValid == fasle
  limits: {
    member_count: Int,
  },
  order: {        // isValid == true
    user_id: ObjectId,
    company_id: ObjectId,
    plan: Plan,
    order_type: OrderTypes,
    products: [
      {
        _id: ObjectId,
        title: String,
        plan: String,
        product_no: String,
        original_price: Number,
        quantity: Number,
        sum: Number,
        paid_sum: Number
      },
    ],
    member_count: Number,
    times: Number,
    original_times: Number,
    original_sum: Number,
    paid_sum: Number,
  },
  coupon: [
    {
      _id: ObjectId,
      title: String,
      description: String,
      order_type: [OrderTypes],
      products: [],
      criteria: {},
      discount: {},
      period: {},
      stock_current: Number,
      stock_total: Number,
      date_update: Date,
      date_create: Date,
      coupon_no: String,
      isAvailable: Boolean, // 是否可用
    }
  ]      // 优惠券列表
}
```


### GET /order

INPUT

```javascript
{
  page: Number,
  pagesize: Number,
  last_id: ObjectId,                // 使用last_id分页
  invoice_issued: Number[Enum:0,1], // 是否开过发票
}
```

订单列表

### GET /order/pending

OUTPUT

```javascript
{
  _id: ObjectId,
  order_type: OrderTypes,
  plan: String,
  member_count: Number,
}
```

### GET /order/:orderId

订单详情

### POST /order/:orderId/pay

支付

当订单类型为degrade，不需要支付

INPUT

```javascript
{
  payment_method: String, // alipay|wxpay/balance
}
```

OUTPUT

```javascript
{
  order_id: ObjectId,
  payment_method: String,
  qr: base64,         // 微信支付二维码地址
  url: Url,           // 支付宝支付地址，打开新标签页
  status: String,     // paying succeed (余额支付直接返回succeed)
}
```


### GET /order/:orderId/query

支付完成后查询订单状态

```javascript
{
  order_id: ObjectId,
  status: String,     // paying succeed expired
}
```


### PUT /order/:orderId/status

取消订单

INPUT

```javascript
{
  status: String, // cancelled
}
```


## recharge

充值

### GET /recharge/info

获取充值和优惠信息

OUTPUT

```javascript
{
  limits: {
    amount: {
      min: Number,      // 最低充值金额
      max: Number       // 最高充值金额
    }
  }
}
```

### GET /recharge

获取充值记录列表

INPUT

```javascript
{
  page: Number,
  pagesize: Number,
}
```

OUTPUT

```javascript
{
  page: Number,
  pagesize: Number,
  totalrows: Number,
  list: [{}...]
}
```

### POST /recharge

充值

INPUT

```javascript
{
	amount: Number,
	payment_method: String, // 支付方式 PaymentMethod
}
```

OUTPUT

```javascript

```

### GET /recharge/:rechargeId/query

查询充值的状态

OUTPUT

```javascript
{
  recharge_id: ObjectId,
  status: String,     // paying succeed
}
```


<!-- ## charge

### GET /charge

支付记录

INPUT

```javascript
{
  page: Number,
  pagesize: Number,
  invoice_issued: Enum[Int:0,1],
  charge_type: ChargeType,
}
```

OUTPUT

```javascript
{
  page: Number,
  pagesize: Number,
  totalrows: Number,
  list: [
    {
      _id: ObjectId,
      company_id: ObjectId,
      charge_type: ChargeType,  // 用于区分充值和产品
      recharge_id: ObjectId,    // charge_type == recharge
      recharge_no: String,      // charge_type == recharge
      order_id: ObjectId,       // charge_type == plan
      order_no: String,         // charge_type == plan
      amount: Number,
      payment_type: String,
      payment_method: String,
      date_create: Date,
      status: String,
    }
  ]
}
``` -->


## address

发票地址管理（最多提交10个地址）

### GET /address

OUTPUT

```javascript
{
  _id: ObjectId, // company_id
  default_address: ObjectId,
  address_list: [{
    _id: ObjectId,
    location: {
      province: String,
      city: String,
      district: String,
      zipcode: String,
      address: String,
    },
    contact: String,
    phone: String,
  }...],
}
```

### POST /address

INPUT

```javascript
{
  location: {
    province: String,
    city: String,
    district: String,
    zipcode: String,
    address: String,
  },
  contact: String,
  phone: String,
}
```

### PUT /address/default

INPUT

```javascript
{
  address_id: ObjectId
}
```

### PUT /address/:address_id

INPUT

同 POST

### DELETE /address/:address_id


## invoice

发票管理

### GET /invoice

开票的列表

### GET /invoice/info

开票的配置

OUTPUT

```javascript
{
  min_tax_free_amount: Number,  // 开票最低免邮金额
  tax_rate: Number,             // 快递费用
}
```

### GET /invoice/:invoice_id

### PUT /invoice/:invoice_id/status

INPUT

```javascript
{
  status: String, // cancelled
}
```

### POST /invoice

INPUT

```javascript
{
  title: String; // 抬头
  subject: String; // 详情
  order_list: [ObjectId...],
  address_id: ObjectId,
}
```

OUTPUT

```javascript
{
  _id: ObjectId,
  invoice_no: String,
  company_id: ObjectId,
  title: String,                    // 只能为认证公司名称
  total_amount: Currency,           // （税后）总金额，为实际充值金额
  tax_rate: Float,                  // 税率
  order_list: [ObjectId],
  // 地址信息
  address: {
    _id: ObjectId,
    province: String,
    city: String,
    district: String,
    postcode: String,
    address: String,
    contact: String,
    phone: String,
  },
  // 快递单追踪
  chip_info: {
    brand: String,                  // 快递品牌
    track_no: String,               // 快递跟踪单号
  },
  // 状态跟踪
  status: String[Enum:created,verifing,sent,finished],
  date_create: Date,
  date_update: Date,
}
```
