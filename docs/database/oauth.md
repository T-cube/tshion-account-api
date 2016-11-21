# Oauth Related Collections

## Description

## Basic Type Define

```javascript
OauthToken: String[32];
```

## Tables

### Table `oauth.clients`

```javascript
{
  _id: ObjectID,
  client_id: String,
  client_secret: String
}
```

### Table `oauth.code`

```javascript
{
  _id: ObjectID,
  user_id: ObjectID
  client_id: String,
  code: String,
  expires: Date,
}
```

### Table `oauth.accesstoken`

```javascript
{
  _id: ObjectID,
  access_token: OauthToken,
  client_id: String,
  user_id: ObjectID,
  expires: Date,
}
```

### Table `oauth.refreshtoken`

```javascript
{
  _id: ObjectID,
  refreshtoken: OauthToken,
  client_id: String,
  user_id: ObjectID,
  expires: Date,
}
```
