# auth

## 挂载点
```
/company/plan
```


### GET /

```javascript
{
  current: <String>, // auth type
  list: [{
    name: <String>,
    type: <String>, // free pro ent
    description: <String>,
    store: <Int>,
    member: <Int>,
    fee: <Currency>,
    fee_per_member: <Currency>,
    ext_info: <String>,
  }...]
}
```

### POST /auth

提交认证

```javascript

```

### PUT /auth

更新认证

```javascript

```

### PUT /auth/cancel

取消认证

```javascript

```
