# API Attendance

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id
```

## Table of Contents

...

## attendance setting

### GET /attendance/setting

获取签到的设置

```javascript
{
  _id: <ObjectId>,
  is_open: <Boolean>,
  time_start: <String>,
  time_end: <String>,
  ahead_time: <String[Enum=ten_minute,half_hour,hour]>,
  workday: [<Int>...],
  location:[<String>...],
  white_list: [<ObjectId>...], // 白名单用户
  workday_special: [{
    date: <String>,
    title: <String>,
  }...],
  holiday: [{
    date: <String>,
    title: <String>,
  }...],
}
```

### POST /attendance/setting

### PUT /attendance/setting

```javascript
{
  is_open: <Boolean>,
  time_start: <String>,
  time_end: <String>,
  ahead_time: <String[Enum=ten_minute,half_hour,hour]>,
  workday: [<Int>...],
  location:[<String>...],
  white_list: [<ObjectId>...], // 白名单用户
  workday_special: [{
    date: <String>,
    title: <String>,
  }...],
  holiday: [{
    date: <String>,
    title: <String>,
  }...],
}
```

## attendance sign

### POST /attendance/sign

```javascript
{
  type: <String[Enum=sign_in,sign_out]>,
}
```

签到

### GET /attendance/sign/user/:user_id

获取用户签到信息

```javascript
[{
  user: <ObjectId>,
  normal: <Int>,          // 正常工作天数
  late: <Int>,            // 迟到
  leave_early: <Int>,     // 早退
  absent: <Int>,          // 缺勤
  patch: <Int>,           // 补签
  business_trip: <Int>,   // 出差
  paid_vacation: <Int>,   // 带薪假期
  nopaid_vacation: <Int>, // 不带薪假期
  extra_work: <Int>,      // 加班
  workday_all: <Int>,     // 应勤
  workday_real: <Int>,    // 实际出勤
}...]
```

### GET /attendance/sign/date

获取当前用户指定日期的签到

QUERY

```javascript
{
  date: <String> // date YYYY-MM-DD
}
```

OUT_PUT

```javascript
{
  date: <Date>,
  sign_in: <String>,
  sign_out: <String>,
  late: <Boolean>,
  leave_early: <Boolean>,
  patch: <Enum=[late|leave_early]>
}
```

### GET /attendance/sign/today

获取所有成员当天签到情况

query
```javascript
{
  page: integer, //gte 1
  pagesize: integer, // gte 1
  department_id: ObjectId, //optional
}
```

OUTPUT:
```javascript
[
  {
    user: ObjectId,
    year: number,
    month: number,
    data: [
      {
        date: number,
        sign_in: {
          time: Date,
          from_pc: String,
          setting: Date
        },
        sign_out: {
          time: Date,
          from_pc: String,
          setting: Date
        },
      }
    ], //该数组只有一个元素，就是当天的
  }
]
```

### GET /attendance/sign/department/:department_id

获取部门的签到信息

```javascript
[{
  user: <ObjectId>,
  normal: <Int>,          // 正常工作天数
  late: <Int>,            // 迟到
  leave_early: <Int>,     // 早退
  absent: <Int>,          // 缺勤
  patch: <Int>,           // 补签
  business_trip: <Int>,   // 出差
  paid_vacation: <Int>,   // 带薪假期
  nopaid_vacation: <Int>, // 不带薪假期
  extra_work: <Int>,      // 加班
  workday_all: <Int>,     // 应勤
  workday_real: <Int>,    // 实际出勤
}...]
```

### POST /attendance/outdoor/sign

外勤签到

```javascript
{
  location: {
    latitude: Number
    longitude: Number
    address: String
  },
  content: String,
  pic_record: [objectId...],
}
```

### POST /attendance/upload

图片上传

OUTPUT:
```javascript
{
  _id: objectId, // 在推到外勤签到pic_record数组中
  ...
}
```

### GET /attendance/outdoor

获取外勤列表

query:

```javascript
{
  last_id: objectId //optional
}
```

OUTPUT:
```javascript
[{
  company: objectId,
  user: { name: String, avatar: String },
  pic_record: [{preview_url:String , download_url: String, thumbnail_url: String}],
  date_create: Date,
  content: String,
  location: {
    latitude: Number
    longitude: Number
    address: String
  },  
}...]
```

## attendance audit

### POST /attendance/audit

提交签到的审批

```javascript
{
  date: <String>, // 补签的日期
  data: [{
    type: <String[Enum=sign_in,sign_out]>,
    date: <Date>,
  }...]
  reason: <String>,     // 漏刷原因
}
```
