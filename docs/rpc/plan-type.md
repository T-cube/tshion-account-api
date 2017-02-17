## type

套餐计划类型

### /plan/type/list

### /plan/type/detail

QUERY

```javascript
{
  plan_id: ObjectId
}
```

OUTPUT

```javascript
{
  _id: ObjectId,
  name: String,
  type: String, // free pro ent
  description: String,
  default_member: Number,
  project_actived: Number,
  project_all: Number,
  store: Number,
  project_store: Number,
  inc_member_store: Number,
  max_file_size: Number,
  max_member: Number,
  products: [
    _id: ObjectId,
    title: String,
    plan: String,
    product_no: String,
    ...
  ],
}
```

### /plan/type/update

QUERY

```javascript
{
  plan_id: ObjectId,
  name: String,
  description: String,
}
```
