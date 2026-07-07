const DEFAULT_BASE_URL = "http://36.140.182.229:60010/qilinvideo";
const STORAGE_KEY = "ppt2video-upload-ui-settings";

const els = {
  baseUrl: document.getElementById("base-url"),
  serviceKey: document.getElementById("service-key"),
  backendUrlPreview: document.getElementById("backend-url-preview"),
  file: document.getElementById("ppt-file"),
  duration: document.getElementById("duration"),
  mode: document.getElementById("mode"),
  realtimeLevel: document.getElementById("realtime-level"),
  mouseTracking: document.getElementById("mouse-tracking"),
  uploadForm: document.getElementById("upload-form"),
  submitButton: document.getElementById("submit-button"),
  checkHealthButton: document.getElementById("check-health-button"),
  refreshButton: document.getElementById("refresh-button"),
  autoPollButton: document.getElementById("auto-poll-button"),
  taskId: document.getElementById("task-id"),
  taskStage: document.getElementById("task-stage"),
  taskDetail: document.getElementById("task-detail"),
  logBox: document.getElementById("log-box"),
  pptName: document.getElementById("ppt-name"),
  chapterCount: document.getElementById("chapter-count"),
  mergedUrl: document.getElementById("merged-url"),
  chapterList: document.getElementById("chapter-list"),
};

let currentTaskId = "";
let pollTimer = null;

function normalizeBaseUrl(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return DEFAULT_BASE_URL.replace(/\/+$/, "");
  return trimmed.replace(/\/+$/, "");
}

function saveSettings() {
  const payload = {
    baseUrl: els.baseUrl.value.trim(),
    serviceKey: els.serviceKey.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    els.baseUrl.value = saved.baseUrl || DEFAULT_BASE_URL;
    els.serviceKey.value = saved.serviceKey || "";
  } catch (_err) {
    els.baseUrl.value = DEFAULT_BASE_URL;
    els.serviceKey.value = "";
  }
  refreshBaseUrlPreview();
}

function refreshBaseUrlPreview() {
  els.backendUrlPreview.textContent = normalizeBaseUrl(els.baseUrl.value) + "/";
}

function appendLog(message, kind = "info") {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const prefix = kind === "error" ? "[ERROR]" : kind === "success" ? "[OK]" : "[INFO]";
  els.logBox.textContent += `\n${time} ${prefix} ${message}`;
  els.logBox.scrollTop = els.logBox.scrollHeight;
}

function setIdleState() {
  els.submitButton.disabled = false;
  els.refreshButton.disabled = !currentTaskId;
  els.autoPollButton.disabled = !currentTaskId;
}

function setBusyState() {
  els.submitButton.disabled = true;
  els.refreshButton.disabled = true;
  els.autoPollButton.disabled = true;
}

function getHeaders() {
  const serviceKey = els.serviceKey.value.trim();
  if (!serviceKey) {
    throw new Error("请先填写服务 Key");
  }
  return {
    "X-Service-Key": serviceKey,
  };
}

async function parseApiResponse(response) {
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error(`接口返回无法解析: ${text || "(empty)"}`);
  }
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
  if ((payload.code ?? 200) !== 200) {
    throw new Error(payload.message || `接口返回 code=${payload.code}`);
  }
  return payload.data || {};
}

function buildAbsoluteUrl(baseUrl, maybeRelative) {
  const raw = (maybeRelative || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${normalizeBaseUrl(baseUrl)}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

async function checkHealth() {
  saveSettings();
  refreshBaseUrlPreview();
  appendLog("开始检查后端健康状态…");
  try {
    const response = await fetch(`${normalizeBaseUrl(els.baseUrl.value)}/health`);
    const data = await response.json();
    appendLog(`服务可达: ${JSON.stringify(data)}`, "success");
  } catch (error) {
    appendLog(`服务不可达: ${error.message}`, "error");
  }
}

async function submitTask(event) {
  event.preventDefault();
  saveSettings();
  refreshBaseUrlPreview();
  const file = els.file.files?.[0];
  if (!file) {
    appendLog("请先选择 PPT / PPTX / PDF 文件", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("duration_minutes", String(els.duration.value || 5));
  formData.append("enable_mouse_tracking", els.mouseTracking.checked ? "true" : "false");
  formData.append("mode", els.mode.value);
  formData.append("realtime_duration_level", els.realtimeLevel.value);

  try {
    setBusyState();
    appendLog(`开始上传文件: ${file.name}`);
    const response = await fetch(`${normalizeBaseUrl(els.baseUrl.value)}/api/upload-ppt`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    const data = await parseApiResponse(response);
    currentTaskId = data.task_id || "";
    els.taskId.textContent = currentTaskId || "-";
    appendLog(`任务已创建: ${currentTaskId}`, "success");
    setIdleState();
    if (currentTaskId) {
      startPolling();
      await refreshProgress();
    }
  } catch (error) {
    appendLog(`上传失败: ${error.message}`, "error");
    setIdleState();
  }
}

function renderResult(progressData) {
  const chapters = progressData.chapters || [];
  els.pptName.textContent = progressData.ppt_original_name || "-";
  els.chapterCount.textContent = String(chapters.length);
  const mergedAbsoluteUrl = buildAbsoluteUrl(els.baseUrl.value, progressData.merged_url || "");
  els.mergedUrl.textContent = mergedAbsoluteUrl || "-";
  els.mergedUrl.href = mergedAbsoluteUrl || "#";

  els.chapterList.innerHTML = "";
  chapters.forEach((chapter, index) => {
    const li = document.createElement("li");
    li.className = "chapter-item";
    const audioUrl = buildAbsoluteUrl(els.baseUrl.value, chapter.audio_url || "");
    const imageUrl = buildAbsoluteUrl(els.baseUrl.value, chapter.image_url || "");
    li.innerHTML = `
      <p class="chapter-title">${index + 1}. ${escapeHtml(chapter.title || `第${index + 1}页`)}</p>
      <p class="chapter-meta">
        状态: ${escapeHtml(String(chapter.status ?? "-"))}
        ${audioUrl ? ` | <a href="${audioUrl}" target="_blank" rel="noreferrer">音频</a>` : ""}
        ${imageUrl ? ` | <a href="${imageUrl}" target="_blank" rel="noreferrer">页面图</a>` : ""}
      </p>
    `;
    els.chapterList.appendChild(li);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function refreshProgress() {
  if (!currentTaskId) {
    appendLog("当前没有任务 ID，无法刷新", "error");
    return;
  }
  try {
    els.refreshButton.disabled = true;
    const response = await fetch(
      `${normalizeBaseUrl(els.baseUrl.value)}/api/task/${encodeURIComponent(currentTaskId)}/progress`,
      {
        headers: getHeaders(),
      }
    );
    const data = await parseApiResponse(response);
    els.taskStage.textContent = data.stage || "-";
    els.taskDetail.textContent = data.detail || "-";
    renderResult(data);
    appendLog(`进度刷新成功: stage=${data.stage || "-"} detail=${data.detail || "-"}`);
    if (data.stage === "done") {
      stopPolling();
      appendLog("任务已完成", "success");
    } else if (data.stage === "error") {
      stopPolling();
      appendLog(`任务失败: ${data.detail || "未知错误"}`, "error");
    }
  } catch (error) {
    appendLog(`刷新进度失败: ${error.message}`, "error");
  } finally {
    els.refreshButton.disabled = false;
    els.autoPollButton.disabled = !currentTaskId;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = window.setInterval(refreshProgress, 5000);
  els.autoPollButton.textContent = "停止轮询";
  els.autoPollButton.disabled = false;
  appendLog("已开启自动轮询（5 秒）");
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
    appendLog("已停止自动轮询");
  }
  els.autoPollButton.textContent = "开始轮询";
}

function togglePolling() {
  if (!currentTaskId) return;
  if (pollTimer) {
    stopPolling();
  } else {
    startPolling();
    void refreshProgress();
  }
}

function bindEvents() {
  els.baseUrl.addEventListener("input", refreshBaseUrlPreview);
  els.baseUrl.addEventListener("change", saveSettings);
  els.serviceKey.addEventListener("change", saveSettings);
  els.uploadForm.addEventListener("submit", submitTask);
  els.checkHealthButton.addEventListener("click", checkHealth);
  els.refreshButton.addEventListener("click", refreshProgress);
  els.autoPollButton.addEventListener("click", togglePolling);
}

function init() {
  loadSettings();
  bindEvents();
  setIdleState();
  els.logBox.textContent = "等待操作…";
}

init();
