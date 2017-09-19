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
  user: <ObjectId>, // 用户id
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

### GET /approval/template/related

获取用户申请的、审批的、抄送的模板列表

QUERY
```javascript
{
  type: <String:Enum=[approve|copyto|apply]>, // optinnal, default: 'apply'
}
```

OUTPUT:
```javascript
[
  {
    _id: <ObjectId>,
    name: <String>,
    number: <String>,
  }
  ...
]
```

### POST /approval/template

INPUT:
普通模版：
```javascript
{
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...], // 适用部门
  steps: [{
    _id: <ObjectId>,
    approver: {
      _id: <ObjectId>,
      type: <String[Enum=member|department]>
    },
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date,...>
  }]
}
```
自动模版：
```javascript
{
  name: <String>,
  description: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date,...>
  }],
  copy_to: [{
    _id: <objectId>,
    type: <String>, //之前是个写死的 member字符串
  }],
  auto: <Boolean>, // true
}
```

### PUT /approval/template/:template_id

INPUT:
普通模版：
```javascript
{
  _id: <ObjectId>,
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...], // 适用部门
  steps: [{
    _id: <ObjectId>,
    approver: {
      _id: <ObjectId>,
      type: <String[Enum=member|department]>
    },
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>
  }]
}
```
自动模版：
```javascript
{
  name: <String>,
  description: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date,...>
  }],
  copy_to: [{
    _id: <objectId>,
    type: <String>, //之前是个写死的 member字符串
  }],
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
    approver: {
      _id: <ObjectId>,
      type: <String[Enum=member|department]>
    },
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

提交审批

INPUT:
```javascript
{
  template: <ObjectId>,
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
  template: {
    _id: <ObjectId>,
    name: <String>,
  },
  from: {
    _id: <ObjectId>,
    name: <String>,
  },
  department: {
    _id: <ObjectId>,
    name: <String>,
  },
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
  status: <String> // 'revoked',
  revoke_log: <String>,
}
```

### PUT /approval/item/:item_id/steps

审核

INPUT:
```javascript
{
  _id: <ObjectId>,
  status: <ENUM:processing,approved,rejected,revoked>,
  log: <String> // 审批记录
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

QUERY

```javascript
{
  status: <Emun:[processing|resolved]>,
  template: <ObjectId>,
  page: <Int>,
}
```

OUTPUT
```javascript
{
  page: <Number>,
  pagesize: <Number>,
  totalrows: <Number>,
  list: [{
    _id: <ObjectId>,
    template: {
      _id: <ObjectId>,
      name: <String>,
    },
    from: {
      _id: <ObjectId>,
      name: <String>,
    },
    department: {
      _id: <ObjectId>,
      name: <String>,
    },
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>,
    log: <String>
  }...]
}
```

### GET /approval/flow/approve

QUERY

```javascript
{
  status: <Emun:[processing|resolved]>,
  template: <ObjectId>,
  page: <Int>,
}
```

OUTPUT
```javascript
{
  page: <Number>,
  pagesize: <Number>,
  totalrows: <Number>,
  list: [{
    _id: <ObjectId>,
    template: {
      _id: <ObjectId>,
      name: <String>,
    },
    from: {
      _id: <ObjectId>,
      name: <String>,
    },
    department: {
      _id: <ObjectId>,
      name: <String>,
    },
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>,
    log: <String>,
    is_processing: <Boolean> // 是否可操作的
  }...]
}
```

### GET /approval/flow/copyto

### GET /approval/flow/count

OUTPUT
```javascript
{
  apply_processing: <Number>,
  copyto_processing: <Number>,
  approve_processing: <Number>,
  apply_resolved: <Number>,
  copyto_resolved: <Number>,
  approve_resolved: <Number>
}
```
