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

## 豆包大模型仿真接入

固件已预留火山方舟 OpenAI 兼容接口：

```text
https://ark.cn-beijing.volces.com/api/v3/chat/completions
```

不要把 API Key 写进仓库。需要测试时在 `platformio.ini` 的 `build_flags` 本地临时加入：

```ini
-DDOUBAO_API_KEY=\"你的火山方舟API Key\"
-DDOUBAO_MODEL_ID=\"你的模型ID或接入点ID\"
```

串口输入 `ai:你好` 或 `doubao:你好` 会尝试调用豆包；未配置密钥时会显示本地回显并在状态页提示 `AI未配置`。
