
## Order

订单管理

```javascript
OrderStatus: String[Enum:created(待支付), paying(待支付), expired(过期), cancelled(取消), succeed(成功)],
OrderTypes: String[newly（新购）, renewal（续费）, upgrade（升级）, degrade（降级）, patch（补交欠费）]
```

### /plan/order/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
  plan: String,               // optional pro, ent    
  status: OrderStatus,        // optional
  keyword: String,            // optional 模糊匹配订单号
  company_id: String,         // optional
  order_type: String,         // optional 订单类型 paying, expired, cancelled, succeed
  amount: String,             // optional 订单金额 金额区间以“,”分隔 如 0,1000 1000,100000 也可以为固定金额
}
```

### /plan/order/detail

QUERY
```javascript
{
  order_id: ObjectId
}
```
