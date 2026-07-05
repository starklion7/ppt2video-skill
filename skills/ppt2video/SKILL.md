---
name: ppt2video
description: 当用户使用 /ppt2video、想获取 PPT2Video 讲解页面链接，或提供 PPT/PPTX/PDF 本地路径并希望通过远端 PPT2Video 服务生成讲解、音频、脚本或合成视频时使用。支持两个功能：(1) 提供讲解页面 URL，(2) 输入本地文件路径执行生成讲解任务。
---

# PPT2Video

PPT2Video 提供两个远端能力：

1. 提供讲解页面 URL
2. 输入本地课件路径执行生成讲解任务

## 路由规则

- 如果用户只输入 `/ppt2video`，先简洁列出两个功能并询问要执行哪一个。
- 如果用户要“打开讲解页面”、“打开上传页”、“进入 PPT2Video”，不要自动打开浏览器；直接把讲解页面 URL 作为 Markdown 链接发给用户点击。
- 如果用户要“生成讲解”、“执行生成任务”，但没有提供文件路径，询问 `.ppt`、`.pptx` 或 `.pdf` 的绝对路径。
- 如果用户提供 `.ppt`、`.pptx` 或 `.pdf` 文件路径，调用远端服务生成讲解。
- 如果用户提供 `task_id`，查询或等待该任务进度。

## 页面链接规则

- 不要调用浏览器工具自动打开或跳转 PPT2Video 页面。
- 对用户选择功能 1 时，只提供可点击 URL，不请求浏览器权限。

## 服务配置

- 服务地址：`http://36.140.182.229:60010`
- 鉴权请求头：`X-Service-Key`
- 默认服务 key：`local-skill-service-key-20260702`
- 客户端脚本：`scripts/ppt_narration_client.py`

## 功能 1：提供讲解页面 URL

链接：

```text
http://36.140.182.229:60010/qilinvideo/skill-upload?service_key=local-skill-service-key-20260702
```

对用户只需简洁回复：

```markdown
PPT2Video 讲解页面：[点击打开](http://36.140.182.229:60010/qilinvideo/skill-upload?service_key=local-skill-service-key-20260702)
```

## 功能 2：生成讲解任务

创建任务并等待完成：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" run \
  --file "/absolute/path/to/demo.pptx"
```

常用生成参数：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" run \
  --file "/absolute/path/to/demo.pptx" \
  --mode realtime \
  --duration 5 \
  --realtime-duration-level brief
```

查询任务：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" progress \
  --task-id "<task_id>"
```

等待任务完成：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" wait \
  --task-id "<task_id>"
```

## 输出要求

任务完成后，向用户总结：

- `task_id`
- 最终 `stage`
- 章节数量
- `merged_url`，如果存在
- 是否启用鼠标轨迹

任务耗时较长时，只汇报有意义的阶段变化，不要倾倒原始 JSON。
