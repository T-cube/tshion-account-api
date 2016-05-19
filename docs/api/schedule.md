# API Schedule

[返回目录](index.md)

任务(REST)

挂载点：
* `/user`

## Table of Contents

...

## 基本操作

### POST /schedule

INPUT

```javascript
{
  title: <String>,
  description: <String>,
  date_from: <Date>,
  date_end: <Date>,
  // date_create: <Date>,
  repeat: {
    frequency: <String[Enum=day,week,month,year]>,
    at: [<String>...],
  },
  remind: <String[Enum=never,hour,day,week]>,
  // creator: <ObjectId>,
  members: [<ObjectId>...],
  share: [{
    type: <String[Enum=company,department,project,task]>,
    target: <ObjectId>,
  }]
}
```

### PUT /schedule/:schedule_id

INPUT

```javascript
{
  title: <String>,
  description: <String>,
  date_from: <Date>,
  date_end: <Date>,
  repeat: {
    frequency: <String[Enum=day,week,month,year]>,
    at: [<String>...],
  },
  remind: <String[Enum=never,hour,day,week]>,
  members: [<ObjectId>...],
  share: [{
    type: <String[Enum=company,department,project,task]>,
    target: <ObjectId>,
  }]
}
```

### GET /schedule/year/:year/month/:month(/day/:day)?

OUTPUT

```javascript
[{
  _id: <ObjectId>,
  title: <String>,
}...]
```

### GET /schedule/:schedule_id

OUTPUT

```javascript
{
  _id: <ObjectId>,
  title: <String>,
  description: <String>,
  date_from: <Date>,
  date_end: <Date>,
  date_create: <Date>,
  repeat: {
    frequency: <String[Enum=day,week,month,year]>,
    at: [<String>...],
  },
  remind: <String[Enum=never,hour,day,week]>,
  creator: <ObjectId>,
  members: [<ObjectId>...],
  share: [{
    type: <String[Enum=company,department,project,task]>,
    target: <ObjectId>,
  }]
}
```

### DELETE /schedule/:schedule_id
