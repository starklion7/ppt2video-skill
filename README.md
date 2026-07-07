# ppt2video-skill

这是一个可从 GitHub 安装的 Codex skill 仓库，对外提供一个 `ppt2video` 入口：

1. 输出 PPT2Video 讲解页面跳转链接
2. 随 skill 分发一个轻量前端上传页
3. 输入本地 PPT/PPTX/PDF 路径，提交成功后返回任务 ID，并提示可在“我的讲解”页查看

## 安装

在 Codex 中直接说：

```text
使用 $skill-installer 从 GitHub 安装 starklion7/ppt2video-skill，路径是 skills/ppt2video
```

或手动执行：

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo starklion7/ppt2video-skill \
  --path skills/ppt2video
```

安装后重启 Codex，让新 skill 生效。

## 目录

```text
skills/
  ppt2video/
    SKILL.md
    assets/
      upload-ui/
        index.html
        style.css
        app.js
    scripts/
      ppt_narration_client.py
```
