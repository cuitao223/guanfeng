---
name: login-cloud
description: 云平台登录模板。还原品牌区、接入数量、右侧登录卡、验证码和邮箱验证两步。演示可在本地走完并进入平台。使用前先读本技能。
---

# 云平台登录

这是一整页登录，不放进列表壳。

状态是 `approved`，版本 `0.1.0`。地球装饰用页面内的倾斜网格和标记，不复制陆地掩膜或站点坐标。验证码在演示里画在本地画布上，便于没有认证服务时完成校验。接入服务后改为 `GET /code` 的图片。

记住密码只保存账号名。历史页面还会把加密后的密码写入 Cookie，这一份不保存密码。

## 页面

- 左上标题，左下接入雷达和接入风电场。数量来自 `GET /device/open/counts` 的 `radarCount`、`windfarmCount`。请求失败时显示横线，不额外提示。
- 右上切换中文和英文。
- 登录卡：账号、密码、验证码、记住密码、登录。
- 密码校验通过且接口要求邮箱验证时，进入第二步。演示里校验通过后直接进入第二步。验证码 6 位数字，可返回、可重发。
- 演示登录成功后写入本地会话并回到模板入口。

文案键在 `loginCloud`。接口文件放到 `src/api/auth/loginCloud.js`。

| 动作 | 方法 | 路径 |
| --- | --- | --- |
| 登录 | POST | `/auth/login` |
| 邮箱验证 | POST | `/auth/login/email/verify` |
| 重发验证码 | POST | `/auth/login/email/resend` |
| 图片验证码 | GET | `/code` |
| 接入数量 | GET | `/device/open/counts` |

## 使用

1. 路由放在布局外面，并加入免登录白名单。
2. 把 `api.js` 放到 `src/api/auth/loginCloud.js`。
3. 在中英文语言包注册 `loginCloud`。
