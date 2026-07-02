---
name: ppt-narration-service
description: Use when the user wants to upload a local PPT/PPTX/PDF and generate narration, audio, scripts, or merged video through the local ppt2video backend service. Also use for polling task progress, exporting results, and validating the service-key based integration from Codex.
---

# PPT Narration Service

Use this skill when the user wants Codex to call the local `ppt2video` backend directly instead of using the web UI.

## What this skill does

- Upload a local `.ppt`, `.pptx`, or `.pdf`
- Start a narration-generation task
- Poll task progress until completion
- Return the task id, stage, chapter count, and generated asset URLs

## Defaults

- Backend base URL: `http://127.0.0.1:8000`
- Auth header: `X-Service-Key`
- Default `.env`: `/Users/tsir/workspace/ppt2video/.env`

## Required input

Ask the user only for the local PPT/PPTX/PDF path if it is not already known.

## Run it

Use the bundled client:

```bash
python3 /Users/tsir/workspace/ppt2video/.codex/skills/ppt-narration-service/scripts/ppt_narration_client.py run \
  --file "/absolute/path/to/demo.pptx"
```

Useful options:

```bash
python3 /Users/tsir/workspace/ppt2video/.codex/skills/ppt-narration-service/scripts/ppt_narration_client.py run \
  --file "/absolute/path/to/demo.pptx" \
  --base-url "http://127.0.0.1:8000" \
  --env-file "/Users/tsir/workspace/ppt2video/.env" \
  --mode realtime \
  --duration 5 \
  --realtime-duration-level brief
```

## Other commands

Check one task:

```bash
python3 /Users/tsir/workspace/ppt2video/.codex/skills/ppt-narration-service/scripts/ppt_narration_client.py progress \
  --task-id "<task_id>"
```

Wait on an existing task:

```bash
python3 /Users/tsir/workspace/ppt2video/.codex/skills/ppt-narration-service/scripts/ppt_narration_client.py wait \
  --task-id "<task_id>"
```

## Expected behavior

- If the backend is not running, report that first.
- If the service key is missing, read it from the configured `.env`.
- When the task is long-running, keep polling and summarize meaningful stage changes instead of dumping raw JSON every time.
- When the task completes, return at least:
  - `task_id`
  - final `stage`
  - chapter count
  - `merged_url` if present
  - whether mouse tracking was enabled

## Notes

- This skill uses the service-key interface, not the page JWT login flow.
- If the user wants the browser page experience, do not use this skill alone; switch to the browser workflow instead.
