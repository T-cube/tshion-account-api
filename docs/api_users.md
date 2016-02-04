# API users/*

用户管理(REST)

## Table of Contents

* [GET users](#get-users)
* [POST users](#post-users)
* [PATCH users/{id}](#patch-users-id)
* [DELETE users/{id}](#post-users-id)

## Function List

### GET /users

获取全部用户

INPUT

`none`

OUTPUT
```javascript
[
  {
    "_id":"...",
    "email":"...",
    //...
  }
]
```
ERROR

`none`

### POST users/{id}

增加用户

INPUT
```javascript
{
  "_id":"...",
  "email":"...",
  //...
}
```
OUTPUT

`none`

ERROR

`none`

### PATCH users/{id}

修改用户信息

INPUT
```javascript
{
  "email":"...",
  //...
}
```
OUTPUT

`none`

ERROR

`none`

### DELETE users/{id}

删除用户信息

INPUT

`none`

OUTPUT

`none`

ERROR

`none`
