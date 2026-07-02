# ppt2video-skill

A shareable Codex skill repository for installing the `ppt-narration-service` skill.

## Install

```bash
python3 /Users/tsir/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo <your-github-owner>/ppt2video-skill \
  --path skills/ppt-narration-service
```

After installing, restart Codex.

## Layout

```text
skills/
  ppt-narration-service/
    SKILL.md
    scripts/
      ppt_narration_client.py
```
