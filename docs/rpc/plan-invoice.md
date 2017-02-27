
## Invoice

发票管理

发票的状态

```javascript
{
  InvoiceStatus: String[Enum:created(已提交), sent(已发送), finished(已完成), verifing(处理中), cancelled(已取消), rejected(拒绝)]
}
```

### /plan/invoice/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
  status: InvoiceStatus,    // optional
  keyword: String,          // optional 模糊匹配发票号,抬头
  company_id: String,       // optional
}
```

### /plan/invoice/detail

QUERY
```javascript
{
  invoice_id: ObjectId
}
```

### /plan/invoice/update

更新发票状态，状态可以在以下状态中发生转移
created->verifing, created->rejected, verifing->rejected, sent->finished

QUERY
```javascript
{
  invoice_id: ObjectId,
  status: String, // verifing, rejected, finished
  comment: String // 操作的说明
}
```

### /plan/invoice/send

QUERY
```javascript
{
  invoice_id: ObjectId,
  // 快递信息
  chip_info: {      
    brand: String,    // 快递商家
    track_no: String  // 订单号
  },
  operator_id: ObjectId,
}
```
