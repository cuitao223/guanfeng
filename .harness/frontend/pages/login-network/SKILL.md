---
name: login-network
description: 登录模板。全屏背景左侧放置欢迎语、平台名称、账号、密码和记住密码。演示可在校验后进入平台。使用前先读本技能。
---

# 平台

这是一整页登录，不放进列表壳。

状态是 `approved`，版本 `0.1.0`。背景视频是 `assets/login.mp4`，海报是 `assets/login-bg.jpg`，都来自历史页。验证码和注册入口在历史页里是关闭的，这一份也不显示。

记住密码只保存账号名。历史页面还会把加密后的密码写入 Cookie，这一份不保存密码。

## 页面

- 全屏循环播放 `assets/login.mp4`，未播放时显示 `assets/login-bg.jpg`。
- 登录卡靠左：欢迎登录、平台名称、账号、密码、记住密码、登录。
- 登录请求是 `POST /login`，字段为 `username`、`password`、`code`、`uuid`。
- 演示在校验通过后写入本地会话并回到模板入口。接入认证服务时改为调用上面的登录接口。

文案键在 `loginNetwork`。接口文件放到 `src/api/auth/loginNetwork.js`。

## 使用

1. 路由放在布局外面，并加入免登录白名单。
2. 把 `api.js` 放到 `src/api/auth/loginNetwork.js`。
3. 在中英文语言包注册 `loginNetwork`。
