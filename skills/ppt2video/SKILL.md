---
name: ppt2video
description: 当用户提供 PPT/PPTX/PDF 文件路径，并希望通过远端 PPT2Video 服务生成讲解、音频、脚本或合成视频时使用。
---

# PPT2Video

使用远端 PPT2Video 服务为课件生成讲解。这个 skill 只负责调用远端服务：上传文件、创建任务、轮询进度、汇总结果。

## 适用场景

- 用户给出 `.ppt`、`.pptx` 或 `.pdf` 文件路径，并要求生成讲解、配音、脚本或视频。
- 用户给出 `task_id`，要求查询或等待生成进度。

如果用户没有提供文件路径，只询问 PPT/PPTX/PDF 文件路径。

## 服务配置

- 服务地址：`http://36.140.182.229:60010`
- 鉴权请求头：`X-Service-Key`
- 默认服务 key：`local-skill-service-key-20260702`
- 客户端脚本：`scripts/ppt_narration_client.py`

## 使用方式

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
