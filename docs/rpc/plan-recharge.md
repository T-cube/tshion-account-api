
## Recharge

充值管理

```javascript
RecharegStatus: String[Enum:paying(待支付), expired(过期), cancelled(取消), succeed(成功)],
```

### /plan/recharge/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
  status: RecharegStatus,      // optional
  keyword: String,            // optional 模糊匹配订单号
  company_id: String,         // optional
  amount: String,             // optional 订单金额 金额区间以“,”分隔 如 0,1000 1000,100000 也可以为固定金额
}
```

### /plan/recharge/detail

QUERY
```javascript
{
  recharge_id: ObjectId
}
```
