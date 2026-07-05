---
name: ppt2video
description: 输出 PPT2Video 讲解页面链接，或根据本地 PPT/PPTX/PDF 调用远端服务生成讲解、音频、脚本与合成视频。Use when the user invokes /ppt2video, asks for the PPT2Video upload page, or provides a local presentation file path for narration generation.
---

# PPT2Video

脚本路径：`$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py`

## 工作流

**要页面链接？** → 输出跳转链接（第 1 节）  
**要生成讲解？** → 确认文件绝对路径后执行脚本（第 2 节）  
**已有 task_id？** → 查询或等待进度（第 3 节）

## 1. 输出跳转链接

当用户使用 `/ppt2video` 或要求打开/进入 PPT2Video 时，直接输出：

```markdown
PPT2Video 讲解页面：[点击打开](http://36.140.182.229:60010/qilinvideo/skill-upload?service_key=local-skill-service-key-20260702)
```

不要调用浏览器工具自动打开页面。

## 2. 生成讲解

当用户提供 `.ppt`、`.pptx` 或 `.pdf` 本地文件路径时，执行 `run`（提交并等待完成）：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" run \
  --file "/absolute/path/to/course.pptx"
```

若用户要求生成讲解但未提供文件路径，只询问课件文件的绝对路径。

若只需提交、不等待，使用 `submit`：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" submit \
  --file "/absolute/path/to/course.pptx"
```

### 可选参数

仅在用户明确要求时追加，否则使用默认值：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--mode` | `realtime` | `normal` 或 `realtime` |
| `--duration` | `5` | 目标时长（分钟） |
| `--realtime-duration-level` | `brief` | realtime 模式下的详略级别 |
| `--enable-mouse-tracking` | 关闭 | 启用鼠标轨迹 |

示例：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" run \
  --file "/absolute/path/to/course.pptx" \
  --mode normal \
  --duration 10 \
  --enable-mouse-tracking
```

## 3. 查询或等待任务

用户提供 `task_id` 时：

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" progress \
  --task-id "<task_id>"
```

```bash
python3 "$CODEX_HOME/skills/ppt2video/scripts/ppt_narration_client.py" wait \
  --task-id "<task_id>"
```

## 4. 结果与错误处理

- 脚本退出码 `0` 表示成功，`1` 为业务或校验错误，`2` 为网络/HTTP 错误。
- `stage=done`：按下方模板总结，不要粘贴完整 JSON。
- `stage=error`：说明 `detail` 中的错误信息，并告知用户可重试或检查文件格式。
- 等待超时：告知用户保留 `task_id`，可用 `progress` 继续查询。

成功时按此模板回复：

```markdown
讲解任务已完成。

- 任务 ID：{task_id}
- 状态：{stage}
- 章节数：{chapter_count}
- 合成视频：{merged_url}
- 鼠标轨迹：{是/否}
```
