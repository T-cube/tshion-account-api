
## Invoice

发票管理

发票的状态

```javascript
{
  InvoiceStatus: String[Enum:created, sent, finished, verified, rejected, cancelled]
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

当原status == created，新status为verified, rejected
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
