# API Apply

[返回目录](index.md)

项目

## 挂载点1

```
/company/:company_id/approval/template
```

## Table of Contents

## API function

### GET /

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

### POST /

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

### PUT /:approval_id

INPUT:
```javascript
{
  _id: <ObjectId>,
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

### PUT /:approval_id/status

INPUT:
```javascript
{
  status: <ENUM:normal|unused>
}
```

### GET /:approval_id

OUTPUT:
```javascript
{
  _id: <ObjectId，
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...],
  status: <ENUM>,
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

### PUT /:approval_id/steps

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

### DELETE /:approval_id


## 挂载点2

```
/company/:company_id/approval/item
```

### GET /

OUTPUT:
```javascript
[
  {
    _id: <ObjectId>,
    item: <ObjectId>,
    proposer: <ObjectId>,
    department: <ObjectId>,
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>
  }
  ...
]
```

### POST /

INPUT:
```javascript
{
  _id: <ObjectId>,
  template_id: <ObjectId>,
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

### GET /:approval_id

INPUT:
```javascript
{
  _id: <ObjectId>,
  template_id: <ObjectId>,
  proposer: <ObjectId>,
  department: <ObjectId>,
  apply_date: <Date>,
  status: <ENUM>,
  content: <String>,
  files: [<String>...],
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    status: <Enum:pending|approve|reject|disable>,
    create_time: <Date>,
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

### PUT /:approval_id

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
