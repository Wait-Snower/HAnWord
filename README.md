# HAnWord PWA

手机离线版，和仓库根目录的桌面 Python 版分开维护。

## 特点

- 在浏览器本地计算，不上传汉字输入
- 可添加到手机主屏幕，离线使用
- 支持 `设备`、`应用`、`网站`、`其他用途` 四种模式
- 使用与桌面版一致的 `PBKDF2-HMAC-SHA256` 派生流程

## 在线访问

手机浏览器打开：https://wait-snower.github.io/HAnWord/

## 本地预览

```bash
cd pwa
python3 -m http.server 8080
```

然后浏览器打开 `http://localhost:8080`

## 与桌面版的关系

- 根目录版本：桌面/命令行 Python 版
- 本目录版本：移动端离线 PWA
- 两个版本使用同一套 `PBKDF2-HMAC-SHA256` 参数，相同输入生成相同密码
