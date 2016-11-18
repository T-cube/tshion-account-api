# Tlifang Pro-Team Database Design

## Description

## Basic Type Define

```javascript
PaimentMethod: String[Enum:balance,alipay,wxpay,banktrans];
DiscountType: String[Enum:number,rate,amount];
OrderStatus: String[Enum:created,paying,expired,cancelled,succeeded];
```

## Tables

### Table `company.upgrade`

公司升级信息

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,

  date_create: Date,
}
```
