# 项目分组方案

## 原数据结构

```javascript
{
  projects: [
    ObjectId,
    ObjectId,...
  ]
}
```

用户所有公司所有项目全部推在用户collection的projects字段的数组中

## 原获取项目列表接口实现原理

取出用户所有公司的所有项目，使用$in，再添加条件其他条件，如company等，在数据库中查询。

## 原接口功能使用有两处情景

1. 用户在公司中点击项目，获得用户所在公司所进入的所有项目。
2. 在工作台和公司任务界面，获得所有项目，用于匹配展示任务所在项目。

## 业务需求

1. 对项目进行分组，方便查看管理筛选

## 改造方法

为了不影响原数据结构和原接口使用，单独创建新的字段来进行项目分组，方便分组管理和修改，在原功能情景一，匹配分组的情况。

## 新建字段数据结构

在user的collection中添加
```javascript
{
  project_groups: [
    {
      id: ObjectId,
      company_id: ObjectId,
      name: String,
      projects: [
        ObjectId,
        ObjectId,...
      ]
    }
  ]
}
```

## 新接口
1. 查询分组情况
2. 创建新分组
3. 修改分组名称或分组中项目
4. 删除分组
