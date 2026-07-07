# 用 GitHub 做墨水屏课表 JSON 服务器

这套方案是：

1. GitHub Pages 负责对外提供静态 JSON。
2. GitHub Actions 定时登录厦大教务接口并生成 `schedule.json`。
3. ESP32 只访问 GitHub Pages，不直接访问教务系统。

## 生成后的接口

如果仓库名是 `电子工艺` 对应的英文仓库名，例如 `xmu-epaper-desk-card`，启用 Pages 后接口通常是：

```text
https://你的用户名.github.io/xmu-epaper-desk-card/schedule.json
```

如果设置了 `PUBLIC_PATH` 这个 Secret，例如 `desk-202607-secret`，接口会变成：

```text
https://你的用户名.github.io/xmu-epaper-desk-card/desk-202607-secret/schedule.json
```

## GitHub 设置

1. 新建或打开 GitHub 仓库。
2. 上传本项目。
3. 进入仓库 `Settings > Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/docs`。
6. 进入 `Settings > Secrets and variables > Actions`。
7. 添加 Secret：

```text
XMU_COOKIE      必填，登录 jw.xmu.edu.cn 后复制出来的 Cookie 请求头
PUBLIC_PATH     可选，随机路径，避免真实 schedule.json 放在根目录
XMU_STUDENT_ID  可选，通常留空也能由登录态识别
XMU_REFERER     可选，课表页面地址，不建议写进代码
```

8. 添加 Variable：

```text
XMU_TERM  例如 20253
XMU_WEEK  例如 1
```

## Cookie 怎么来

用浏览器登录教务系统后，在开发者工具里查看 `jw.xmu.edu.cn` 的请求，把请求头里的 `Cookie:` 后面整段复制到 GitHub Secret `XMU_COOKIE`。

不要把 Cookie、完整登录链接、学号密码写进仓库文件。Cookie 过期后，GitHub Actions 会请求失败，这时重新复制 Cookie 更新 Secret 即可。

## 手动更新

进入 GitHub 仓库的 `Actions > Update XMU schedule JSON > Run workflow`，填入学期和周次，运行后会自动提交新的 `docs/schedule.json`。

## ESP32 使用

把固件里的 HTTP 地址改成 GitHub Pages 的 JSON 地址即可。建议 ESP32 解析这些字段：

```json
{
  "status": "ok",
  "term": "20253",
  "week": 1,
  "updatedAt": "2026-07-07T00:00:00.000Z",
  "courses": [],
  "today": [],
  "next": {
    "name": "电子设计与工艺实训A",
    "room": "新工科大楼303",
    "start": "14:30",
    "end": "17:05"
  }
}
```

## 隐私提醒

GitHub Pages 是公开网页服务。只要别人知道 URL，就能访问 JSON。真实课表可能暴露上课地点和时间，如果介意隐私，建议改用自己的云服务器、Vercel/Cloudflare Worker 带鉴权接口，或至少设置一个不容易猜到的 `PUBLIC_PATH`。
