# API Apply

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id/apply
```

## Table of Contents

## API function

### GET /item

OUTPUT:
```javascript
[
  {
    _id: <ObjectId>,
    name: <String>,
    description: <String>,
    scope: [<ObjectId>...], // 适用部门
  }
  ...
]
```

### POST /item

INPUT:
```javascript
{
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...], // 适用部门
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    approver_type: <ENUM:department|member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text|textarea|date...>
  }]
}
```

### GET /item/:application_id

OUTPUT:
```javascript
{
  _id: <ObjectId，
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...],
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    approver_type: <ENUM:department|member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text|textarea|date...>
  }]
}
```

### GET /user

OUTPUT:
```javascript
[
  {
    _id: <ObjectId>,
    item: <ObjectId>,
    proposer: <ObjectId>,
    department: <ObjectId>,
    apply_date: <Date>,
    content: <String>
  }
  ...
]
```

### POST /user

INPUT:
```javascript
{
  _id: <ObjectId>,
  item: <ObjectId>,
  proposer: <ObjectId>,
  department: <ObjectId>,
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text|textarea|date...>,
    value: <String>
  }]
}
```

### GET /user/:user_id

INPUT:
```javascript
{
  _id: <ObjectId>,
  item: <ObjectId>,
  proposer: <ObjectId>,
  department: <ObjectId>,
  apply_date: <Date>,
  content: <String>,
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    status: <Enum:pending|approve|reject|disable>,
    log: <String> // 审批记录
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text|textarea|date...>,
    value: <String>
  }]
}
```

### PUT /user/:user_id

INPUT:
```javascript
{
  _id: <ObjectId>,
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text|textarea|date...>,
    value: <String>
  }]
}
```

### PUT /user/:user_id/steps

INPUT:
```javascript
{
  steps: {
    _id: <ObjectId>,
    status: <Enum:pending|approve|reject|disable>,
    log: <String> // 审批记录
  }
}
```

