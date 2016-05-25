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

```javascript
{
  company_id: <ObjectId>,
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

### GET /attendence/sign/user/:user_id

### GET /attendence/sign/department/:department_id

## attendence audit

### GET /attendence/audit

### POST /attendence/audit

### GET /attendence/audit/:audit_id

### POST /attendence/audit/:audit_id/check
