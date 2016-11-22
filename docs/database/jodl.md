# Abot JODL

## 概述

对于于 JSON 对象的描述，有很多种方式，最流行的当属 JSON Schema：

http://json-schema.org/

还有 OpenAPI Specification：

https://github.com/OAI/OpenAPI-Specification

这些描述方式本身使用 JSON（或者 yaml），兼容性好，但缺点也明显，语言累赘，可读性差，因此在此我们设计了一种新的描述语言来定义 JSON 数据结构：

**JODL** [dʒoʊdl] - JSON Object Defination Language，即 JSON 对象描述语言。

JODL 的基本结构与 JSON 相同，但有些不一样：

* 对象中属性的 key 无需双引号包裹;
* 允许 Object、Array 最后一项允许逗号 `,`；
* 其中字段的值以 `Type` 形式表示其数据类型、描述；

## 应用场景

JODL 可用于数据库结构定义（如 mongodb），JSON 数据的校验等场景。

## 数据类型

### 基本类型

| Type | Description | Example |
| ---- | ----------- | ------- |
| `String` | 字符串 | `"my company"` |
| `Boolean` `Bool` | 布尔型 | `true`, `false` |
| `Number` | 数字 | `1`, `3.1415926`, `-128` |
| `Integer` `Int` | 整数 | `128`, `-55`, `0` |
| `Double` `Float` | 浮点数 | `3.1415926` |
| `Date` | javascript 日期对象 | `ISODate("2014-02-10T10:50:42.389Z")` |
| `ObjectId` | mongodb ObjectId() | `ObjectId("569f02df333b79f8077540b8")` |

### 复合数据类型

复合数据类型有 Object 和 Array，其表示方法与 JSON 相同，对于 Array，展示其内部成员的样式

Example:
```javascript
{
  friends: [{
    _id: ObjectId[link=user._id],
    name: String,
    avatar: String[url],
  }...]
}
```
### 衍生类型

| Type | Description | Example |
| ---- | ----------- | ------- |
| `Type[Enum:e1,e2,e3...]` | 枚举类型 | `Int[Enum:1,2,3]` |
| `String[/.../]` | 带有正则的字符串 | `String[/[\d]{11}/]` |

### 自定义类型

对于重复使用的复合数据类型，可使用自定义类型

```javascript
URI: String[/https?:\/\/(\w+)*\.\w\/.+/]

UserItem: {
  _id: ObjectId,
  name: String,
  avatar: URI,
}
```

在一个数据描述中自定义类型可在定义时直接使用，方便定义迭代结构（如树形结构）：

参见 [company](#company) 集合中 structure 的定义

## 类型修饰符

* 类型修饰符用于加入在数据类型名称后面的 `[]` 中，表示对类型额外的解释；
* 类型修饰符可以有值，作为其选项，使用 `=` 连接，类型描述符的值不需要引号；
* 多个类型修饰符使用 `;` 连接；

| Type | Description | Example |
| ---- | ----------- | ------- |
| `auto` | 该字段为 mongodb 自动生成 | `_id: ObjectId[auto]` |
| `optional` | 非必须项目 | `description: String[optional]` |
| `rel` | 表示关联字段 | `user_id: ObjectId[rel=user._id]` |
