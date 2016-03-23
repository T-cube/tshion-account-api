# API task

任务(REST)

## Table of Contents

* [GET /project/:project_id/task](#get-project-project_id-task)
* [GET /project/:project_id/task/:task_id](#get-project-project_id-task-task_id)
* [GET /project/:project_id/task/:task_id/comment](#get-project-project_id-task-task_id-comment)
* [GET /project/:project_id/task/:task_id/log](#get-project-project_id-task-task_id-log)

## API function

### GET /project/:project_id/task

获取全部公司

INPUT

`none`

OUTPUT
```javascript
[
  {
    "_id":"...",
    "name":"...",
    //...
  }
]
```
ERROR

`none`

### GET /project/:project_id/task/{:task_id}

获取公司详情

```javascript
{
  "_id": <object_id>,
  "componay": <company_id>,
  "project": <project_id>,
  "parent_id": <task_id>,        // 父任务
  "title": "...",                // 任务标题
  "content": "...",              // 任务详情
  "creator": {
    "user_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 创建人
  "owner": {
    "user_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 执行人
  "follower": [{
    "user_id": <user_id>,
    "name": "...",
    "avatar": "..."
  }, ...],  // 关注者
  "time_create": <Date>,            // 创建时间
  "time_up": <Date>,             // 更新时间
  "start_date": <date>,          // 开始时间（optional）
  "due_date": <date>,            // 截止时间（optional）
  "priority": <0,1,2,3>,         // 优先级别
  "subtask": [<task_id>, ...],   // 子任务
  "tag": [{
    "name": "...",
  }, ...],       // 标签
}
```

### GET /project/:project_id/task/{task_id}/comment

任务评论

```javascript
[{                  
  "_id": <object_id>,
  "user": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },
  "content": "",
  "time_add": <Date>,
}, ...]
```

### GET /project/:project_id/task/{taks_id}/log

任务日志

```javascript
"log": [{
  type: "task",
  from: {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },
  to: {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  }
  content: "...",
  time: <Date>
}]
```
