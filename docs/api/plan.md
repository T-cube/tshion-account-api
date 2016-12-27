# auth

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
PaimentMethod: String[Enum:balance,alipay,wxpay,banktrans];
TeamPlanPaid: String[Enum:pro,ent] // 专业版，企业版
PlanStatus: String[Enum:actived,expired,overdue],
AuthStatus: String[Enum:posted,cancelled,reposted,accepted,rejected],
OrderTypes: String[newly（新购）, renewal（续费）, upgrade（升级）, degrade（降级）, patch（补交欠费）],
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
8. 支付处理的订单 `POST /plan/order/pending/pay?`
9. ...


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

### GET /status

获取当前的认证状态

OUTPUT

```javascript
{
  // history: [
  //   {
  //     _id: ObjectId,
  //     type: String, // paid trial
  //     company_id: ObjectId,
  //     user_id: ObjectId,
  //     plan: TeamPlanPaid,
  //     status: PlanStatus,
  //     date_start: Date,
  //     date_end: Date,
  //   }
  // ],
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
    _id: ObjectId,
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

### DELETE /degrade

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
<!--
### GET /auth/history

QUERY

```javascript
{
  page: Int,
  pagesize: Int,
}
```

OUTPUT

```javascript
{
  list: [{
    _id: ObjectId,
    plan: TeamPlanPaid,
    company_id: ObjectId,
    user_id: ObjectId,
    date_apply: Date,
    status: AuthStatus,
  }],
  page: Int,
  pagesize: Int,
  totalRows: Int,
}
``` -->

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

订单的几种形式：

1. 未购买过，新购，order_type = new
2. 已购买，增加周期，人数方案不变，order_type = renewal
3. 已购买，升级人数或方案（付款成功后生效），order_type = upgrade
4. 已购买，降级人数或方案（预约的形式，可以取消），order_type = degrade
5. 已过期，同新购（方案不变，人数不变），order_type = patch


### POST /order

INPUT

```javascript
{
  plan: TeamPlanPaid,      // order_type 为 newly upgrade degrade 时有该字段
  order_type: String,     // newly（新购）, renewal（续费）, upgrade（升级）, degrade（降级）, patch（补交欠费）
  times: Int,             // order_type 为 newly renewal 时有该字段，购买的月数
  member_count: Int,      // order_type 为 newly upgrade degrade 时有该字段,人数为购买的人数（总人数-基础人数）
  coupon: ObjectId,       // 满足优惠券条件的优惠券id
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
    _id: ObjectId,
    ...
  },
  coupon: []      // 优惠券列表
}
```


### GET /order

订单列表

### GET /order/:orderId

订单详情

### POST /order/:orderId/pay

支付

INPUT

```javascript
{
  payment_method: String, // alipay|wechat
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
  },
  discounts: [
    {
      _id: ObjectId,
      title: String,
      amount: Number,   // 充值金额
      extra_amount: Number, // 优惠金额
      date_update: Date,
      date_create: Date
    }
  ]
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
	payment_method: String, // 支付方式 PaimentMethod
}
```

OUTPUT

```javascript

```

## charge

### GET /charge

支付记录
