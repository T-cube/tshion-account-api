# auth

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
TeamPlanPaid: String[Enum:pro,ent] // 专业版，企业版
PlanStatus: String[Enum:actived,expired,overdue],
AuthStatus: String[Enum:posted,cancelled,reposted,accepted,rejected],
```

## 挂载点

```javascript
/company/:companyId/plan
```
### 认证购买的流程
1. 获取所有计划的列表 `GET /plan/list`
2. 获取公司当前的计划状态 `GET /plan/status`
3. 获取公司当前的认证状态 `GET /plan/auth/status`
4. 认证，团队：`POST /plan/auth/pro`，企业：`POST /plan/auth/ent`
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

### GET /status

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
  authed: [TeamPlanPaid], // 已认证的
}
```

### POST /trial

试用

INPUT

```javascript
{
  plan: [TeamPlanPaid],
}
```


## auth

### GET /auth/status

获取当前的认证状态

OUTPUT

```javascript
{
  [TeamPlanPaid]: {
    _id: ObjectId,
    plan: TeamPlanPaid,
    company_id: ObjectId,
    user_id: ObjectId,
    date_apply: Date,
    status: AuthStatus,
  }
  ...
}
```

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
```


### GET /auth/realname

OUTPUT

```javascript
{
  realname: String,
  position: String,
  phone: String,
  address: String,
  realname_ext: {
    idcard: String,
  }
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
      idcard_photo: [Url],
    },
  },
  // 团队信息
  team: {
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
    certificate_pic: [Url],
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

### PUT /auth

更新认证

POST // 同 post


### PUT /auth/status

取消认证

INPUT

```javascript
{
  status: String, // cancelled
}
```


## order

订单的几种形式：

1. 未购买过，新购，order_type = new
2. 已购买，增加周期，人数方案不变，order_type = renewal
3. 已购买，升级人数或方案（付款成功后生效），order_type = upgrade
4. 已购买，降级人数或方案（立即生效），order_type = degrade
5. 已过期，同新购（方案不变，人数不变），order_type = patch


### POST /order

INPUT

```javascript
{
  plan: TeamPlanPaid,      // order_type 为 newly upgrade degrade
  order_type: String,     // newly, renewal, upgrade, degrade, patch
  times: Int,             // order_type 为 newly renewal
  products: [             // order_type 为 newly upgrade degrade
    {
      product_no: String,
      quantity: Number,
    } ...
  ],
  coupon: ObjectId,       // 满足优惠券条件
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
  error: String, // isValid为fasle时
  limits: {
    member_count: Int,
  },
  order: {
    _id: ObjectId,
    ...
  }
}
```

### GET /order/pending

### POST /order/pending/pay

INPUT

```javascript
{
  payment_method: String, // alipay|wechat
}
```
