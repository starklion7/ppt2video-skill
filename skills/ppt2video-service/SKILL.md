---
name: ppt2video-service
description: 当用户提供本地 PPT/PPTX/PDF 路径，并希望通过 ppt2video 后端服务生成讲解、音频、脚本或合成视频时使用。也用于查询任务进度、等待任务完成、导出结果和验证服务 key 调用链路。
---

# PPT2Video 后台服务

当用户希望 Codex 直接调用 `ppt2video` 后端，而不是在网页中手动上传时，使用本 skill。

## 功能

- 上传本地 `.ppt`、`.pptx` 或 `.pdf`
- 创建讲解生成任务
- 轮询任务进度直到完成
- 返回任务 ID、阶段、章节数量和生成资源地址

## 默认配置

- 后端地址：`http://127.0.0.1:8000`
- 鉴权请求头：`X-Service-Key`
- 默认 `.env`：`/Users/tsir/workspace/ppt2video/.env`

## 必要输入

如果用户还没有提供文件路径，只询问本地 PPT/PPTX/PDF 的绝对路径。

## 运行

使用随 skill 打包的客户端：

```bash
python3 /Users/tsir/.codex/skills/ppt2video-service/scripts/ppt_narration_client.py run \
  --file "/absolute/path/to/demo.pptx"
```

常用参数：

```bash
python3 /Users/tsir/.codex/skills/ppt2video-service/scripts/ppt_narration_client.py run \
  --file "/absolute/path/to/demo.pptx" \
  --base-url "http://127.0.0.1:8000" \
  --env-file "/Users/tsir/workspace/ppt2video/.env" \
  --mode realtime \
  --duration 5 \
  --realtime-duration-level brief
```

## 其他命令

查询单个任务：

```bash
python3 /Users/tsir/.codex/skills/ppt2video-service/scripts/ppt_narration_client.py progress \
  --task-id "<task_id>"
```

等待已有任务完成：

```bash
python3 /Users/tsir/.codex/skills/ppt2video-service/scripts/ppt_narration_client.py wait \
  --task-id "<task_id>"
```

## 预期行为

- 如果后端没有运行，先明确告知用户。
- 如果缺少服务 key，优先从配置的 `.env` 读取。
- 任务耗时较长时，持续轮询并只总结有意义的阶段变化，不要每次都倾倒原始 JSON。
- 任务完成后至少返回：
  - `task_id`
  - 最终 `stage`
  - 章节数量
  - `merged_url`，如果存在
  - 是否启用鼠标轨迹

## 注意事项

- 本 skill 使用服务 key 接口，不使用页面 JWT 登录流程。
- 如果用户想打开浏览器页面上传，不要单独使用本 skill，应回到 `ppt2video` 的页面模式。
