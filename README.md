# XMU E-Paper Desk Card Schedule Server

这个仓库用于给 ESP32 墨水屏电子桌牌提供课表 JSON。

默认接口：

```text
https://sunrise690.github.io/kebiao/schedule.json
```

当前 `sunrise690/kebiao` 已设置为 Public，并启用 GitHub Pages：`main` 分支 `/docs` 目录发布。

如果设置了 GitHub Secret `PUBLIC_PATH`，接口会变成：

```text
https://sunrise690.github.io/kebiao/<PUBLIC_PATH>/schedule.json
```

## 文件说明

- `docs/schedule.json`：GitHub Pages 对外提供的课表 JSON。
- `docs/terms/index.json`：可选择的学期索引。
- `docs/terms/<学期>/schedule.json`：各学期独立保存的课表；例如 `terms/20253/schedule.json`。
- `docs/index.html`：简单状态页。
- `tools/update_xmu_schedule.mjs`：把厦大教务接口数据转换成 ESP32 易解析 JSON 的脚本。
- `.github/workflows/update-schedule.yml`：定时更新 JSON 的 GitHub Actions。
- `GITHUB_PAGES_SERVER.md`：完整配置步骤。

## 必填设置

在 GitHub 仓库里进入 `Settings > Secrets and variables > Actions`，添加：

```text
XMU_COOKIE
```

这个值来自登录厦大教务系统后的请求头 `Cookie:`。不要把 Cookie 写进仓库文件。

更多步骤见 `GITHUB_PAGES_SERVER.md`。

每次更新会同时写入兼容地址 `schedule.json`、当前学期目录及学期索引。切换 `XMU_TERM` 后，旧学期目录会保留，不会被新学期覆盖。

## 豆包接入说明

固件已预留火山方舟 OpenAI 兼容接口：

```text
https://ark.cn-beijing.volces.com/api/v3/chat/completions
```

不要把 API Key 写进本仓库。4.2 寸 XiaoZhi 固件通过
`self.deskcard.set_doubao_config` 将 Key 保存到设备 NVS；状态接口不会返回 Key。
量产或对外部署时应改用服务器代理，避免设备固件被读取后泄露凭据。
