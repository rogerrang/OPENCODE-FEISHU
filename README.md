# Roger BRAIN

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Mac-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Cost-Free-orange?style=flat-square" alt="Cost">
</p>

> 🧠 通过飞书群聊远程控制你的 AI 编程助手 (OpenCode)

一个完全0费用的轻量级双向命令系统，让你在飞书群聊里直接发送指令，让 OpenCode 在本地电脑上执行代码任务，并把执行结果实时返回到群聊。

---

## 🌟 功能特性

- **群聊即终端**：在飞书群里发消息 = 在本地执行命令
- **会话保持**：首次启动后自动绑定 Session，后续命令自动延续上下文
- **安全可靠**：支持飞书 Encrypt Key 加密签名验证，拒绝伪造请求
- **开箱即用**：一行命令启动，自动启动 OpenCode 服务 + Webhook 桥接 + 隧道

---

## 📋 准备工作

在开始之前，你需要准备好以下内容：

### 1. 安装依赖

```bash
npm install
```

### 2. 创建飞书自定义机器人

1. 打开飞书群 → 点击右上角 **Settings (⚙️)** → ** Bots **
2. 点击 **添加自定义机器人**
3. 给机器人起个名字（比如 `Roger`）
4. **重要**：勾选 **启用Encrypt Key**（后面会用到）
5. 复制 Webhook URL 和 Encrypt Key，备用

### 3. 安装 Cloudflare Tunnel (Tunnel)

用于把本地端口暴露到公网，让飞书能访问到你的电脑。

**Windows:**
```bash
# 方法1: 下载二进制 (推荐)
# https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
# 重命名为 cloudflared.exe 放到项目根目录的 bin/ 文件夹下

# 方法2: 用 scoop
scoop install cloudflared
```

**Mac:**
```bash
brew install cloudflared
```

### 4. 配置 config.js

复制配置模板文件：

```bash
cp config.example.js config.js
```

然后编辑 `config.js`，填入你的配置：

```javascript
module.exports = {
    // 飞书机器人 Webhook URL（必填）
    FEISHU_WEBHOOK: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx...",

    // 你想让 AI 操作的项目目录（必填）
    WORK_DIR: "C:\\Users\\你的用户名\\Desktop\\你的项目",

    // 飞书 Encrypt Key（强烈建议填上，否则关闭加密模式）
    FEISHU_ENCRYPT_KEY: "xxxxxxxxxxxxxxxxxxxxxx",

    // OpenCode 模型选择
    OPENCODE_MODEL: "opencode/claude-3-5-sonnet",
};
```

---

## 🚀 启动

### 一键启动

```bash
# Windows
RUN_COMMANDER.bat

# Mac/Linux (需要自己写启动脚本，或手动执行以下命令)
```

启动脚本会自动：
1. 杀掉旧的 node 进程
2. 启动 `opencode serve`（端口 55222）
3. 启动 webhook 桥接服务（端口 3000）
4. 启动 Cloudflare Tunnel，生成公网 URL

启动成功后，终端会显示类似这样的 URL：

```
Copy this URL to Feishu:
https://your-tunnel-url.trycloudflare.com
```

### 配置飞书 Webhook

1. 回到飞书群 → **Settings** → **Bots** → 点击你的机器人
2. 在 **Webhook URL** 填入上面的 URL + `/webhook`
   - 例如：`https://your-tunnel-url.trycloudflare.com/webhook`
3. 在 **事件订阅** 里：
   - 勾选 `im.message`
   - 接收人权限选择 `所有成员`
4. 点击 **保存**

保存时飞书会发送一个验证请求到你的服务器。如果配置正确，会显示 **验证成功**。

---

## 📖 使用方法

### 首次使用

在飞书群里发送：

```
帮我创建一个 hello.py 文件，内容是 print("Hello World")
```

Roger 会：
1. 回复 `🚀 首次开启 处理中...`
2. 在本地 `WORK_DIR` 目录下执行命令
3. 返回执行结果

### 后续使用

第二次发送命令时，Roger 会自动延续上一次对话的上下文：

```
帮我给刚才的 hello.py 添加一个函数
```

你不需要重复描述上下文，Roger 会记得你之前做了什么。

---

## 🔧 常见问题

### Q: 飞书提示 "返回数据不是合法的 JSON 格式"

通常是因为：
1. **Encrypt Key 没填**：在飞书后台启用了加密，但 `config.js` 里没填 `FEISHU_ENCRYPT_KEY`
2. **签名验证失败**：检查日志 `server.log`，看具体是解密失败还是签名失败

### Q: OpenCode 报 "command not found"

确保 `opencode` 命令已经在系统 PATH 里，或者在 `config.js` 里指定完整路径：

```javascript
OPENCODE_CMD: "C:\\path\\to\\opencode.exe",
```

### Q: 怎么更换 AI 模型？

在 `config.js` 里修改：

```javascript
OPENCODE_MODEL: "opencode/claude-3-7-sonnet",
# 或
OPENCODE_MODEL: "antigravity-manager/gemini-3-flash",
```

### Q: 怎么查看日志？

项目目录下的 `server.log` 记录了所有请求和执行日志。

---

## 🛡️ 安全说明

- **Encrypt Key**：强烈建议在飞书后台启用并填入 `config.js`。启用后所有请求都会经过 AES-256-CBC 加密 + SHA256 签名验证。
- **Webhook URL**：Tunnel URL 是公网可访问的，建议只在可信网络使用，或使用飞书的 IP 白名单功能。
- **敏感信息**：`config.js` 包含你的飞书 Webhook 地址，**不要提交到 Git**（已配置 .gitignore 自动忽略）。

---

## 📁 项目结构

```
remote-control/
├── server.js              # 主服务代码
├── config.example.js      # 配置模板（复制为 config.js 使用）
├── config.js              # 你的个人配置（不提交 Git）
├── package.json           # Node 依赖
├── RUN_COMMANDER.bat      # Windows 一键启动脚本
├── bin/
│   └── cloudflared.exe    # Cloudflare Tunnel 客户端
├── .gitignore             # Git 忽略配置
└── README.md              # 本文档
```

---

## 🏆 为什么选 Roger BRAIN？

| 对比项 | Roger BRAIN | 向日葵/TimDesk 等远程桌面 | OpenCode 官方手机版 |
|--------|-------------|--------------------------|---------------------|
| **费用** | ✅ 完全免费 | ❌ 付费会员才能高清 | ❌ 仅支持网页版 |
| **手机使用** | ✅ 飞书App即开即用 | ❌ 手机远程桌面体验极差 | ❌ 必须用电脑浏览器 |
| **部署难度** | ✅ 5分钟开箱即用 | ❌ 需要复杂内网穿透配置 | N/A |
| **AI能力** | ✅ 继承OpenCode全部能力 | ❌ 只是屏幕投影 | ✅ 官方能力 |
| **实时交互** | ✅ 消息推送结果 | ❌ 需要盯着屏幕 | ✅ 需用浏览器 |
| **安全** | ✅ 飞书签名加密 | ❌ 依赖厂商安全 | ✅ 官方安全 |

**简单来说**：Roger BRAIN = **免费 + 手机随时用 + 继承OpenCode 80%功能**

特别适合：
- 通勤/外出时用手机临时让AI改个bug
- 不想开电脑但需要AI帮忙看代码
- 轻度代码任务（改文件、查代码、跑脚本）

---
## 写在最后
本人是纯代码小白，对于CS一窍不通，本项目是opencode加白嫖的模型完成全部的代码编写
在这次项目成功运行之前本人已经尝试了好几次打通opencode桌面端到国内生态移动端的流程
碍于模型能力和应该是我的思考方向有问题，失败了很多次，消耗在这个项目上的时间应该有十余个小时
不过鉴于我个人对于这个opencode远程操作的渴望和不想只在网页端查看的妥协，最后在（以下模型均为白嫖）
Gemini 3 flash minimax m2.5 Claude sonnet 4.6 可能还有Nemotron 3 super的帮助下
终于是把这个东西手搓了出来，开源只希望看到这个项目的人能继续改进这个项目让它变得更好
毕竟现在的功能还不完善，但起码是跑起来了
建议各位想跟我一样纯0费用白嫖的人都去整个antigravity manager白嫖Gemini 3 flash
因为现在opencode的minimax的额度好像也经不起用了，希望能帮到像我一样一点CS不懂但还是想赛博搭积木的朋友


## 🤝 许可证

```
MIT License

Copyright (c) 2025 Roger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
