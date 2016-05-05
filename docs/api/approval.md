# API Apply

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id
```

## Table of Contents

...

## Approval Template

### GET /approval/template

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

### POST /approval/template

INPUT:
```javascript
{
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...], // 适用部门
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    approver_type: <Enum:department,member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <Enum:text,textarea,date,...>
  }]
}
```

### PUT /approval/template/:approval_id

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
    approver_type: <Enum:department,member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <Enum:text,textarea,date...>
  }]
}
```

### PUT /approval/template/:approval_id/status

INPUT:
```javascript
{
  status: <Enum:normal,unused>
}
```

### GET /approval/template/:approval_id

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
    approver_type: <Enum:department,member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <Enum:text,textarea,date...>
  }]
}
```

### PUT /approval/template/:approval_id/steps

INPUT:
```javascript
{
  steps: {
    _id: <ObjectId>,
    status: <Enum:pending,approve,reject,disable>,
    log: <String> // 审批记录
  }
}
```

### DELETE /approval/template/:approval_id

删除

## Approval Item

### GET /approval/item

OUTPUT:
```javascript
[
  {
    _id: <ObjectId>,
    template_id: <ObjectId>,
    from: <ObjectId>,
    department: <ObjectId>,
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>
  }
  ...
]
```

### POST /approval/item

INPUT:
```javascript
{
  _id: <ObjectId>,
  template_id: <ObjectId>,
  from: <ObjectId>,
  department: <ObjectId>,
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <Enum:text,textarea,date...>,
    value: <String>
  }]
}
```

### GET /approval/item/:approval_id

INPUT:
```javascript
{
  _id: <ObjectId>,
  template_id: <ObjectId>,
  from: <ObjectId>,
  department: <ObjectId>,
  apply_date: <Date>,
  status: <ENUM>,
  content: <String>,
  files: [<String>...],
  step: <String>,
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    status: <Enum:pending,approve,reject,disable>,
    create_time: <Date>,
    log: <String> // 审批记录
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <Enum:text,textarea,date...>,
    value: <String>
  }]
}
```

### PUT /approval/item/:approval_id

INPUT:
```javascript
{
  _id: <ObjectId>,
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <Enum:text,textarea,date...>,
    value: <String>
  }]
}
```

### GET /approval/flow/apply

OUTPUT
[{
   _id: <ObjectId>,
    template_id: <ObjectId>,
    from: <ObjectId>,
    department: <ObjectId>,
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>,
    log: <String>
}...]

### GET /approval/flow/approve

### GET /approval/flow/copyto

