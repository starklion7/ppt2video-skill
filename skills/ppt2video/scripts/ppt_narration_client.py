#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


DEFAULT_BASE_URL = "http://36.140.182.229:60010"
DEFAULT_SERVICE_KEY = "local-skill-service-key-20260702"


def resolve_service_key() -> str:
    return DEFAULT_SERVICE_KEY


def build_headers(service_key: str, content_type: str = None) -> dict:
    headers = {"X-Service-Key": service_key}
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def parse_response(resp_bytes: bytes) -> dict:
    text = resp_bytes.decode("utf-8")
    data = json.loads(text)
    if not isinstance(data, dict):
        raise RuntimeError("接口返回不是 JSON 对象")
    code = data.get("code", 200)
    if code != 200:
        raise RuntimeError(data.get("message") or ("接口返回 code=%s" % code))
    return data.get("data") or {}


def http_get_json(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return parse_response(resp.read())


def encode_multipart(fields: dict, file_field: str, file_path: str) -> tuple:
    boundary = "----CodexPpt2Video%s" % uuid.uuid4().hex
    lines = []
    for key, value in fields.items():
        lines.append(("--" + boundary).encode("utf-8"))
        lines.append(('Content-Disposition: form-data; name="%s"' % key).encode("utf-8"))
        lines.append(b"")
        lines.append(str(value).encode("utf-8"))

    filename = os.path.basename(file_path)
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    lines.append(("--" + boundary).encode("utf-8"))
    lines.append(
        ('Content-Disposition: form-data; name="%s"; filename="%s"' % (file_field, filename)).encode("utf-8")
    )
    lines.append(("Content-Type: %s" % mime_type).encode("utf-8"))
    lines.append(b"")
    lines.append(file_bytes)
    lines.append(("--" + boundary + "--").encode("utf-8"))
    lines.append(b"")

    body = b"\r\n".join(lines)
    return body, "multipart/form-data; boundary=%s" % boundary


def submit_task(args) -> dict:
    service_key = resolve_service_key()
    if not os.path.isfile(args.file):
        raise RuntimeError("文件不存在: %s" % args.file)
    body, content_type = encode_multipart(
        fields={
            "duration_minutes": args.duration,
            "enable_mouse_tracking": "true" if args.enable_mouse_tracking else "false",
            "mode": args.mode,
            "realtime_duration_level": args.realtime_duration_level,
        },
        file_field="file",
        file_path=args.file,
    )
    req = urllib.request.Request(
        DEFAULT_BASE_URL.rstrip("/") + "/api/upload-ppt",
        data=body,
        headers=build_headers(service_key, content_type),
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=args.submit_timeout) as resp:
        data = parse_response(resp.read())
    return {"task_id": data.get("task_id")}


def get_progress(args, task_id: str) -> dict:
    service_key = resolve_service_key()
    url = DEFAULT_BASE_URL.rstrip("/") + "/api/task/%s/progress" % urllib.parse.quote(task_id)
    return http_get_json(url, build_headers(service_key))


def wait_task(args, task_id: str) -> dict:
    deadline = time.time() + args.wait_timeout
    last_stage = None
    while True:
        progress = get_progress(args, task_id)
        stage = progress.get("stage")
        detail = progress.get("detail") or ""
        if stage != last_stage:
            print("[progress] stage=%s detail=%s" % (stage, detail), flush=True)
            last_stage = stage
        if stage in ("done", "error"):
            return progress
        if time.time() >= deadline:
            raise RuntimeError("等待任务超时: %s" % task_id)
        time.sleep(args.interval)


def cmd_submit(args) -> int:
    result = submit_task(args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def cmd_progress(args) -> int:
    progress = get_progress(args, args.task_id)
    print(json.dumps(progress, ensure_ascii=False, indent=2))
    return 0


def cmd_wait(args) -> int:
    progress = wait_task(args, args.task_id)
    print(json.dumps(progress, ensure_ascii=False, indent=2))
    return 0


def cmd_run(args) -> int:
    submit_result = submit_task(args)
    task_id = submit_result["task_id"]
    print("[submit] task_id=%s" % task_id, flush=True)
    progress = wait_task(args, task_id)
    summary = {
        "task_id": task_id,
        "stage": progress.get("stage"),
        "detail": progress.get("detail"),
        "chapter_count": len(progress.get("chapters") or []),
        "merged_url": progress.get("merged_url"),
        "enable_mouse_tracking": progress.get("enable_mouse_tracking"),
        "ppt_original_name": progress.get("ppt_original_name"),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description="ppt2video narration service client")
    subparsers = parser.add_subparsers(dest="command", required=True)

    submit = subparsers.add_parser("submit")
    submit.add_argument("--file", required=True)
    submit.add_argument("--mode", default="realtime", choices=["normal", "realtime"])
    submit.add_argument("--duration", type=int, default=5)
    submit.add_argument("--realtime-duration-level", default="brief")
    submit.add_argument("--enable-mouse-tracking", action="store_true")
    submit.add_argument("--submit-timeout", type=int, default=120)
    submit.set_defaults(func=cmd_submit)

    progress = subparsers.add_parser("progress")
    progress.add_argument("--task-id", required=True)
    progress.set_defaults(func=cmd_progress)

    wait = subparsers.add_parser("wait")
    wait.add_argument("--task-id", required=True)
    wait.add_argument("--interval", type=int, default=5)
    wait.add_argument("--wait-timeout", type=int, default=3600)
    wait.set_defaults(func=cmd_wait)

    run = subparsers.add_parser("run")
    run.add_argument("--file", required=True)
    run.add_argument("--mode", default="realtime", choices=["normal", "realtime"])
    run.add_argument("--duration", type=int, default=5)
    run.add_argument("--realtime-duration-level", default="brief")
    run.add_argument("--enable-mouse-tracking", action="store_true")
    run.add_argument("--submit-timeout", type=int, default=120)
    run.add_argument("--interval", type=int, default=5)
    run.add_argument("--wait-timeout", type=int, default=3600)
    run.set_defaults(func=cmd_run)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.func(args)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print("HTTPError %s: %s" % (e.code, body), file=sys.stderr)
        return 2
    except urllib.error.URLError as e:
        print("URLError: %s" % e, file=sys.stderr)
        return 2
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
