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
  time_start: <Date>,
  time_end: <Date>,
  is_full_day: <Boolean>,
  repeat_end: <Date>,
  repeat: {
    type: <String[Enum=none,day,week,month,year,weekday]>,
    info: [<String>...],
  },
  remind: {
    type: <String[Enum=none,exact,minute,hour,day,week]>,
    num: <Int>,
  },
}
```

### PUT /schedule/:schedule_id

INPUT

```javascript
{
  title: <String>,
  description: <String>,
  time_start: <Date>,
  time_end: <Date>,
  is_full_day: <Boolean>,
  repeat_end: <Date>,
  repeat: {
    type: <String[Enum=none,day,week,month,year,weekday]>,
    info: [<String>...],
  },
  remind: {
    type: <String[Enum=none,exact,minute,hour,day,week]>,
    num: <Int>,
  },
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
  time_start: <Date>,
  time_end: <Date>,
  is_full_day: <Boolean>,
  repeat_end: <Date>,
  repeat: {
    type: <String[Enum=none,day,week,month,year,weekday]>,
    info: [<String>...],
  },
  remind: {
    type: <String[Enum=none,exact,minute,hour,day,week]>,
    num: <Int>,
  },
  creator: <ObjectId>,
  date_create: <Date>,
  date_update: <Date>,
}
```

### DELETE /schedule/:schedule_id
