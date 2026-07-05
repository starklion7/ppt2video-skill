---
name: ppt2video
description: 当用户想用 /ppt2video 风格入口打开 PPT2Video 正式上传讲解工作台，或让 Codex 直接调用 ppt2video 后端为本地 PPT/PPTX/PDF 生成讲解、音频、脚本或合成视频时使用。
---

# PPT2Video

这是 PPT2Video 项目的顶层入口 skill。根据用户意图选择页面上传模式或后台直连模式。

## 优先交互方式

1. 用户想打开页面、上传表单、讲解页、工作台时：
   - 使用预置服务 key：`local-skill-service-key-20260702`
   - 打开页面时带上 `?service_key=local-skill-service-key-20260702`
   - 页面会把 key 写入浏览器本地存储 `ppt2video_service_key`，然后清理地址栏参数
   - 优先打开正式前端入口：`/qilinvideo/skill-upload`
   - 当前部署地址：
     `http://36.140.182.229:60010/qilinvideo/skill-upload?service_key=local-skill-service-key-20260702`

2. 用户已经给出本地 `.ppt`、`.pptx` 或 `.pdf` 路径，并希望 Codex 直接生成讲解时：
   - 切换到 `ppt2video-service` skill
   - 使用它的客户端上传文件、轮询进度，并汇总生成结果

## 页面模式

适用于用户说：

- “打开讲解页”
- “打开上传讲解页面”
- “打开 PPT2Video 上传页”
- “我想在页面里上传 PPT”
- “生成讲解”，但还没有提供本地文件路径

优先打开：

- `http://36.140.182.229:60010/qilinvideo/skill-upload?service_key=local-skill-service-key-20260702`

如果页面最终跳转到 `/qilinvideo/video/create`，这通常是实际讲解创建工作台，继续在该页面操作即可。

## 后台模式

适用于用户已经提供本地文件路径，或明确要求“你帮我直接生成”。此时不要重新实现上传流程，改用 `ppt2video-service`。

## 注意事项

- 优先使用正式前端工作台，不使用本地原型 HTML。
- 页面入口应该走服务 key 模式，不走 JWT 登录模式。
- 打开页面时必须带上预置 `service_key`，避免让用户手动粘贴 key。
