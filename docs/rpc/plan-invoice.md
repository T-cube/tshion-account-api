
## Invoice

发票管理

发票的状态

```javascript
{
  InvoiceStatus: String[Enum:created(已提交), sent(已发送), finished(已完成), verifing(处理中), cancelled(已取消)]
}
```

### /plan/invoice/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
  status: InvoiceStatus,    // optional
  invoice_no: String,       // optional
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

当原status == created，新status为verifing
当原status == sent，新status为finished

QUERY
```javascript
{
  invoice_id: ObjectId,
  status: String, // verified, rejected, finished
}
```

### /plan/invoice/send

QUERY
```javascript
{
  invoice_id: ObjectId,
  chip_info: {
    brand: String,
    track_no: String
  }
}
```
