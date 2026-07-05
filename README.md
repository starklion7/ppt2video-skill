# ppt2video-skill

这是一个可从 GitHub 安装的 Codex skill 仓库，包含 PPT2Video 的页面入口和后台生成讲解能力。

## 安装

```bash
python3 /Users/tsir/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo starklion7/ppt2video-skill \
  --path skills/ppt2video skills/ppt2video-service
```

安装后重启 Codex，让新 skill 生效。

## 目录

```text
skills/
  ppt2video/
    SKILL.md
  ppt2video-service/
    SKILL.md
    scripts/
      ppt_narration_client.py
  ppt-narration-service/
    SKILL.md
    scripts/
      ppt_narration_client.py
```
