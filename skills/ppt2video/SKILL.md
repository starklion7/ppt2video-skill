---
name: ppt2video
description: 当用户使用 /ppt2video、需要 PPT2Video 讲解页面跳转链接，或提供 PPT/PPTX/PDF 本地路径并希望通过远端 PPT2Video 服务生成讲解、音频、脚本或合成视频时使用。
---

# PPT2Video

## 1. 输出跳转链接

当用户使用 `/ppt2video` 或要求打开/进入 PPT2Video 时，直接输出：

```markdown
PPT2Video 讲解页面：[点击打开](http://36.140.182.229:60010/qilinvideo/skill-upload?service_key=local-skill-service-key-20260702)
```

不要调用浏览器工具自动打开页面。

## 2. 提供文件路径生成讲解

当用户提供 `.ppt`、`.pptx` 或 `.pdf` 本地文件路径时，使用脚本调用远端服务：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" run \
  --file "/absolute/path/to/course.pptx"
```

如果用户要求生成讲解但没有提供文件路径，只询问课件文件的绝对路径。

如果用户提供 `task_id`，查询或等待任务：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" progress \
  --task-id "<task_id>"
```

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" wait \
  --task-id "<task_id>"
```

任务完成后只总结 `task_id`、最终 `stage`、章节数量、`merged_url` 和是否启用鼠标轨迹。
