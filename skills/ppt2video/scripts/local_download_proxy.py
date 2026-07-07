#!/usr/bin/env python3
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = "127.0.0.1"
PORT = 61734
DOWNLOAD_DIR = pathlib.Path.home() / "Downloads" / "ppt2video"


def normalize_base_url(raw: str) -> str:
    return (raw or "").rstrip("/") or "http://36.140.182.229:60010/qilinvideo"


def call_progress(base_url: str, service_key: str, task_id: str) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_progress",
            "arguments": {"task_id": task_id},
        },
    }
    req = urllib.request.Request(
        f"{normalize_base_url(base_url)}/mcp",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Service-Key": service_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("error"):
        raise RuntimeError(data["error"].get("message") or "MCP error")
    result = data.get("result") or {}
    if result.get("structuredContent"):
        return result["structuredContent"]
    content = result.get("content") or []
    text = next((item.get("text") for item in content if item.get("type") == "text"), "{}")
    return json.loads(text)


def build_absolute_url(base_url: str, maybe_relative: str) -> str:
    raw = (maybe_relative or "").strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return f"{normalize_base_url(base_url)}{'/' if not raw.startswith('/') else ''}{raw}"


def download_file(url: str, target: pathlib.Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as resp, target.open("wb") as fh:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            fh.write(chunk)


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._send_json(200, {"ok": True})

    def do_POST(self) -> None:
        if self.path != "/api/download":
            self._send_json(404, {"ok": False, "message": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            task_id = (payload.get("task_id") or "").strip()
            base_url = normalize_base_url(payload.get("base_url") or "")
            service_key = (payload.get("service_key") or "").strip()
            if not task_id:
                raise ValueError("task_id is required")
            if not service_key:
                raise ValueError("service_key is required")

            progress = call_progress(base_url, service_key, task_id)
            merged_url = build_absolute_url(base_url, progress.get("merged_url") or "")
            if not merged_url:
                raise ValueError("merged_url not ready")

            filename = pathlib.Path(urllib.parse.urlparse(merged_url).path).name or f"{task_id}.mp4"
            target = DOWNLOAD_DIR / filename
            download_file(merged_url, target)
            self._send_json(
                200,
                {
                    "ok": True,
                    "task_id": task_id,
                    "saved_to": str(target),
                    "merged_url": merged_url,
                },
            )
        except (ValueError, RuntimeError, urllib.error.URLError, json.JSONDecodeError) as error:
            self._send_json(400, {"ok": False, "message": str(error)})
        except Exception as error:  # pragma: no cover
            self._send_json(500, {"ok": False, "message": str(error)})


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"PPT2Video local download proxy listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
