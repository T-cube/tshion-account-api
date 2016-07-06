# API Attendence

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id
```

## Table of Contents

...

## attendence setting

### GET /attendence/setting

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

### POST /attendence/setting

### PUT /attendence/setting

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

## attendence sign

### POST /attendence/sign

```javascript
{
  type: <String[Enum=sign_in,sign_out]>,
}
```

签到

### GET /attendence/sign/user/:user_id

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

### GET /attendence/sign/department/:department_id

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

## attendence audit

### POST /attendence/audit

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
