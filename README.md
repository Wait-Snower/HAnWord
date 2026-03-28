# 汉字密码生成器 (Hanzi Password Generator)

一个基于汉字输入生成确定性密码的 Python 应用，支持交互式和命令行两种运行模式，并支持通过预设模式为不同用途生成不同密码。

---

## 项目概述

该项目通过 `PBKDF2-HMAC-SHA256` 口令派生算法把汉字输入稳定映射为密码，并支持以预设模式混入上下文。相同的汉字、模式和上下文每次都会生成相同的密码，不同模式或上下文会得到不同结果。

### 特性

- 确定性生成：相同汉字、模式和上下文输入产生相同密码
- 字符类型完整：包含大写、小写、数字、特殊符号
- 最小长度 8：避免过短密码
- 汉字检查：严格验证输入必须含有汉字
- 交互重试：交互模式下检测到非法输入后允许重新输入
- 模块化设计：易于扩展和维护

---

## 项目结构

```
HAnWord/
├── desktop/                   # 桌面/命令行核心
│   ├── cli.py
│   ├── core.py
│   ├── analyzer.py
│   ├── config.py
│   ├── ui.py
│   └── __init__.py
├── pwa/                       # 手机离线版
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── README.md
├── tests/                     # 自动化测试
│   ├── test_hanword.py
│   └── test_pwa_parity.js
├── HAnWord.py                 # 兼容入口，转发到 desktop/cli.py
└── README.md
```

---

## 版本说明

- `desktop/` 目录：桌面/命令行版核心，适合电脑终端使用
- `pwa/` 目录：手机离线版，适合浏览器安装到主屏幕使用
- `tests/` 目录：桌面版与 PWA 一致性测试

---

## 快速开始

### 运行方式

```bash
# 交互模式
python3 HAnWord.py

# 命令行模式
python3 HAnWord.py 你好世界 --length 20 --mode site --context github.com
```

### 运行测试

```bash
# Python 测试
python3 -m unittest discover -s tests

# PWA 一致性测试
node --test tests/test_pwa_parity.js
```

---

## 依赖

无额外依赖，仅使用 Python 标准库：
- `hashlib`：SHA-256 / PBKDF2 算法
- `unicodedata`：文本规范化

---

## 安全性说明

- 派生算法：使用 `PBKDF2-HMAC-SHA256`
- 上下文隔离：可选把设备名、应用名、网站名或用途名按模式混入派生流程
- 确定性：同样输入会得到同样结果，便于记忆和恢复
- 字符多样性：保证每个密码包含 4 种字符类型

---

## 手机使用

手机浏览器访问：https://wait-snower.github.io/HAnWord/

---

## License

MIT
