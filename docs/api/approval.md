# API Approval

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id
```

## Table of Contents

...

## Approval Template

审批模板

### GET /approval/template

QUERY
```javascript
{
  scope: <ObjectId>, // 部门
}
```

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
    approver_type: <ENUM:department,member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date,...>
  }]
}
```

### PUT /approval/template/:template_id

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
    approver_type: <ENUM:department,member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>
  }]
}
```

### GET /approval/template/:template_id

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
    approver_type: <ENUM:department,member>
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>
  }]
}
```

### PUT /approval/template/:template_id/status

更新模板的状态

INPUT:
```javascript
{
  status: <ENUM:normal,unused>
}
```

### DELETE /approval/template/:template_id

删除模板

## Approval Item

用户的审批项目

### POST /approval/item

INPUT:
```javascript
{
  _id: <ObjectId>,
  template_id: <ObjectId>,
  department: <ObjectId>,
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>,
    value: <String>
  }]
}
```

### GET /approval/item/:item_id

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
    status: <ENUM:processing,approved,rejected>,
    create_time: <Date>,
    log: <String> // 审批记录
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>,
    value: <String>
  }]
}
```

### PUT /approval/item/:item_id/status

撤回

INPUT:
```javascript
{
  status: <String> // 'revoked'
}
```

### PUT /approval/item/:item_id/steps

审核

INPUT:
```javascript
{
  steps: {
    _id: <ObjectId>,
    status: <ENUM:processing,approved,rejected,revoked>,
    log: <String> // 审批记录
  }
}
```

### PUT /approval/item/:item_id

INPUT:
```javascript
{
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    value: <String>
  }]
}
```

## approval flow

审批流程

### GET /approval/flow/apply

OUTPUT
```javascript
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
```

### GET /approval/flow/approve

OUTPUT
```javascript
[{
   _id: <ObjectId>,
    template_id: <ObjectId>,
    from: <ObjectId>,
    department: <ObjectId>,
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>,
    log: <String>,
    is_processing: <Boolean> // 是否可操作的
}...]
```

### GET /approval/flow/copyto

### GET /approval/flow/apply/count

OUTPUT
```javascript
[{
   _id: <ENUM>, // status
   count: <Number>
}...]
```

### GET /approval/flow/approve/count

### GET /approval/flow/copyto/count`
