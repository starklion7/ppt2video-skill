const DEFAULT_BASE_URL = "http://36.140.182.229:60010/qilinvideo";
const DEFAULT_SERVICE_KEY = "local-skill-service-key-20260702";
const LOCAL_PROXY_BASE_URL = "http://127.0.0.1:61734";
const STORAGE_KEY = "ppt2video-local-ui-settings";
const TASK_KEY = "ppt2video-local-ui-task";

const state = {
  taskId: "",
  pollTimer: null,
  progress: null,
  selectedChapterIndex: 0,
  realtimeLevel: "brief",
  editingScript: false,
};

const els = {
  uploadPage: document.getElementById("upload-page"),
  playbackPage: document.getElementById("playback-page"),
  baseUrl: document.getElementById("base-url"),
  serviceKey: document.getElementById("service-key"),
  pptFile: document.getElementById("ppt-file"),
  uploadCard: document.getElementById("upload-card"),
  uploadEmpty: document.getElementById("upload-empty"),
  uploadFileState: document.getElementById("upload-file-state"),
  uploadFileLogo: document.getElementById("upload-file-logo"),
  selectedFileName: document.getElementById("selected-file-name"),
  removeFileButton: document.getElementById("remove-file-button"),
  submitButton: document.getElementById("submit-button"),
  submitButtonText: document.getElementById("submit-button-text"),
  styleOptions: Array.from(document.querySelectorAll(".style-option")),
  serviceDot: document.getElementById("service-dot"),
  serviceState: document.getElementById("service-state"),
  mcpUrlPreview: document.getElementById("mcp-url-preview"),
  checkServiceButton: document.getElementById("check-service-button"),
  chapterList: document.getElementById("chapter-list"),
  chapterTotal: document.getElementById("chapter-total"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  progressPercent: document.getElementById("progress-percent"),
  durationPill: document.getElementById("duration-pill"),
  stageChip: document.getElementById("stage-chip"),
  sidebarGenerating: document.getElementById("sidebar-generating"),
  taskId: document.getElementById("task-id"),
  taskStage: document.getElementById("task-stage"),
  taskDetail: document.getElementById("task-detail"),
  pptName: document.getElementById("ppt-name"),
  previewImage: document.getElementById("preview-image"),
  videoPlaceholder: document.getElementById("video-placeholder"),
  scriptEditor: document.getElementById("script-editor"),
  editScriptButton: document.getElementById("edit-script-button"),
  saveScriptButton: document.getElementById("save-script-button"),
  cancelScriptButton: document.getElementById("cancel-script-button"),
  downloadVideoButton: document.getElementById("download-video-button"),
  downloadScriptButton: document.getElementById("download-script-button"),
  importScriptButton: document.getElementById("import-script-button"),
  fullscreenButton: document.getElementById("fullscreen-button"),
  playButton: document.getElementById("play-button"),
  speedButton: document.getElementById("speed-button"),
  timeline: document.getElementById("timeline"),
  seekFilled: document.getElementById("seek-filled"),
  currentTime: document.getElementById("current-time"),
  totalTime: document.getElementById("total-time"),
  downloadAnchor: document.getElementById("download-anchor"),
};

function normalizeBaseUrl(raw) {
  return ((raw || "").trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function getMcpUrl() {
  return `${normalizeBaseUrl(els.baseUrl.value)}/mcp`;
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      baseUrl: els.baseUrl.value.trim(),
      serviceKey: els.serviceKey.value,
      realtimeLevel: state.realtimeLevel,
    }),
  );
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    els.baseUrl.value = saved.baseUrl || DEFAULT_BASE_URL;
    els.serviceKey.value = saved.serviceKey || DEFAULT_SERVICE_KEY;
    state.realtimeLevel = saved.realtimeLevel || "brief";
  } catch (_error) {
    els.baseUrl.value = DEFAULT_BASE_URL;
    els.serviceKey.value = DEFAULT_SERVICE_KEY;
  }
  updateStyleOptions();
  updateMcpPreview();
}

function saveTask() {
  localStorage.setItem(TASK_KEY, JSON.stringify({ taskId: state.taskId || "" }));
}

function loadTask() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASK_KEY) || "{}");
    state.taskId = saved.taskId || "";
  } catch (_error) {
    state.taskId = "";
  }
}

function showPage(name) {
  els.uploadPage.classList.toggle("active", name === "upload");
  els.playbackPage.classList.toggle("active", name === "playback");
  document.body.classList.toggle("is-playback", name === "playback");
}

function updateMcpPreview() {
  els.mcpUrlPreview.textContent = getMcpUrl();
}

function setServiceState(kind, text) {
  els.serviceDot.className = "service-dock__dot";
  if (kind) els.serviceDot.classList.add(kind);
  els.serviceState.textContent = text;
}

function updateStyleOptions() {
  els.styleOptions.forEach((button) => {
    button.classList.toggle("active", button.dataset.value === state.realtimeLevel);
  });
}

function updateFileState(file) {
  const hasFile = Boolean(file);
  els.uploadCard.classList.toggle("has-file", hasFile);
  els.uploadEmpty.classList.toggle("hidden", hasFile);
  els.uploadFileState.classList.toggle("hidden", !hasFile);
  if (file) {
    els.selectedFileName.textContent = file.name;
    els.uploadFileLogo.textContent = /\.pdf$/i.test(file.name) ? "PDF" : "PPT";
  } else {
    els.selectedFileName.textContent = "";
    els.uploadFileLogo.textContent = "PPT";
  }
}

function getHeaders() {
  const serviceKey = els.serviceKey.value.trim();
  if (!serviceKey) throw new Error("请先填写服务 Key");
  return {
    "Content-Type": "application/json",
    "X-Service-Key": serviceKey,
  };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_error) {
    throw new Error(text || `HTTP ${response.status}`);
  }
  if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);
  return payload;
}

async function callMcp(method, params = {}) {
  const response = await fetch(getMcpUrl(), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });
  const payload = await parseJsonResponse(response);
  if (payload.error) throw new Error(payload.error.message || `MCP error ${payload.error.code}`);
  return payload.result || {};
}

async function callMcpTool(name, args = {}) {
  const result = await callMcp("tools/call", { name, arguments: args });
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((item) => item.type === "text")?.text || "{}";
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { text };
  }
}

async function fileToBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
  return dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
}

function buildAbsoluteUrl(baseUrl, maybeRelative) {
  const raw = (maybeRelative || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${normalizeBaseUrl(baseUrl)}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function getProgressPercent(progress) {
  if (typeof progress.progress === "number") return Math.max(0, Math.min(100, progress.progress));
  const detail = String(progress.detail || "");
  const match = detail.match(/第\s*(\d+)\s*\/\s*(\d+)\s*页/);
  if (match) {
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (total > 0) return Math.round((current / total) * 100);
  }
  return progress.stage === "done" ? 100 : 0;
}

function getChapterTitle(chapter, index) {
  return chapter.title || chapter.ppt_title || chapter.page_title || `第${index + 1}页`;
}

function getChapterScript(chapter) {
  return chapter.script || chapter.subtitle || chapter.text || chapter.narration || "";
}

function renderChapters(progress) {
  const chapters = Array.isArray(progress.chapters) ? progress.chapters : [];
  els.chapterTotal.textContent = `${chapters.length} 页`;
  els.chapterList.innerHTML = "";
  if (!chapters.length) return;
  if (state.selectedChapterIndex >= chapters.length) state.selectedChapterIndex = 0;
  chapters.forEach((chapter, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sidebar__item";
    if (index === state.selectedChapterIndex) button.classList.add("active");
    button.textContent = getChapterTitle(chapter, index);
    button.addEventListener("click", () => {
      state.selectedChapterIndex = index;
      renderProgress(state.progress);
    });
    els.chapterList.appendChild(button);
  });
}

function renderSelectedChapter(progress) {
  const chapters = Array.isArray(progress.chapters) ? progress.chapters : [];
  const chapter = chapters[state.selectedChapterIndex] || chapters[0];
  const script = chapter ? getChapterScript(chapter) : "";
  if (!state.editingScript) {
    els.scriptEditor.value = script || "字幕生成中...";
  }
  const imageUrl = buildAbsoluteUrl(els.baseUrl.value, chapter?.image_url || chapter?.cover_url || "");
  if (imageUrl) {
    els.previewImage.src = imageUrl;
    els.previewImage.hidden = false;
    els.videoPlaceholder.hidden = true;
  } else {
    els.previewImage.hidden = true;
    els.videoPlaceholder.hidden = false;
  }
}

function renderProgress(progress) {
  state.progress = progress;
  const stage = progress.stage || "-";
  const detail = progress.detail || "-";
  const totalSeconds = Number(progress.total_duration_seconds || progress.duration_seconds || 0);
  const percent = getProgressPercent(progress);
  const mergedUrl = buildAbsoluteUrl(els.baseUrl.value, progress.merged_url || "");
  const done = stage === "done";

  els.taskId.textContent = state.taskId || "-";
  els.taskStage.textContent = stage;
  els.taskDetail.textContent = detail;
  els.pptName.textContent = progress.ppt_original_name || progress.filename || "PPT2Video";
  els.progressFill.style.width = `${percent}%`;
  els.progressText.textContent = detail || (done ? "完成" : "处理中");
  els.progressPercent.textContent = `${percent}%`;
  els.durationPill.textContent = totalSeconds ? `全文讲解时长: ${formatTime(totalSeconds)}` : "全文讲解时长: 估算中...";
  els.stageChip.textContent = done ? "讲解已完成" : stage === "error" ? "生成失败" : "讲解生成中";
  els.totalTime.textContent = totalSeconds ? formatTime(totalSeconds) : "0:00";
  els.currentTime.textContent = "0:00";
  els.timeline.value = "0";
  els.seekFilled.style.width = "0%";
  els.sidebarGenerating.classList.toggle("hidden", done);
  els.downloadVideoButton.disabled = !mergedUrl;
  els.downloadScriptButton.disabled = !Array.isArray(progress.chapters) || progress.chapters.length === 0;
  renderChapters(progress);
  renderSelectedChapter(progress);
  if (done || stage === "error") stopPolling();
}

async function checkService() {
  saveSettings();
  updateMcpPreview();
  setServiceState("", "检查中...");
  try {
    const initResult = await callMcp("initialize", {});
    await callMcp("tools/list", {});
    setServiceState("ok", initResult.serverInfo?.name ? `已连接 ${initResult.serverInfo.name}` : "服务正常");
  } catch (error) {
    setServiceState("error", error.message);
  }
}

async function submitTask() {
  const file = els.pptFile.files?.[0];
  if (!file) {
    alert("请先选择 PPT / PPTX / PDF 文件");
    return;
  }
  saveSettings();
  updateMcpPreview();
  els.submitButton.disabled = true;
  els.submitButtonText.textContent = "上传中...";
  setServiceState("", "上传中...");
  try {
    const fileBase64 = await fileToBase64(file);
    const data = await callMcpTool("submit_narration_base64", {
      filename: file.name,
      file_base64: fileBase64,
      duration: 5,
      enable_mouse_tracking: false,
      mode: "realtime",
      realtime_duration_level: state.realtimeLevel,
    });
    state.taskId = data.task_id || "";
    setServiceState("ok", "任务已提交");
    saveTask();
    showPage("playback");
    startPolling();
    await refreshProgress();
  } catch (error) {
    setServiceState("error", error.message);
    alert(`提交失败: ${error.message}`);
  } finally {
    els.submitButton.disabled = false;
    els.submitButtonText.textContent = "生成讲解";
  }
}

async function refreshProgress() {
  if (!state.taskId) return;
  try {
    const data = await callMcpTool("get_progress", { task_id: state.taskId });
    renderProgress(data);
  } catch (error) {
    setServiceState("error", `进度刷新失败: ${error.message}`);
  }
}

function startPolling() {
  stopPolling();
  state.pollTimer = window.setInterval(refreshProgress, 1500);
}

function stopPolling() {
  if (state.pollTimer) {
    window.clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function callLocalDownloadProxy(taskId) {
  const response = await fetch(`${LOCAL_PROXY_BASE_URL}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task_id: taskId,
      base_url: normalizeBaseUrl(els.baseUrl.value),
      service_key: els.serviceKey.value.trim(),
    }),
  });
  const payload = await parseJsonResponse(response);
  if (!payload.ok) throw new Error(payload.message || "下载失败");
  return payload;
}

async function downloadVideo() {
  if (!state.taskId) {
    alert("当前没有任务");
    return;
  }
  try {
    const progress = await callMcpTool("get_progress", { task_id: state.taskId });
    const mergedUrl = buildAbsoluteUrl(els.baseUrl.value, progress.merged_url || "");
    if (!mergedUrl) throw new Error("远端结果中没有 merged_url");
    const payload = await callLocalDownloadProxy(state.taskId);
    alert(`视频已保存到本地:\n${payload.saved_to}`);
  } catch (error) {
    alert(`下载失败: ${error.message}`);
  }
}

function exportScript() {
  const chapters = state.progress?.chapters || [];
  const content = chapters
    .map((chapter, index) => `${index + 1}. ${getChapterTitle(chapter, index)}\n${getChapterScript(chapter)}`)
    .join("\n\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  els.downloadAnchor.href = url;
  els.downloadAnchor.download = `${(state.progress?.ppt_original_name || "ppt2video").replace(/\.[^.]+$/, "")}-subtitles.txt`;
  els.downloadAnchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function beginEditScript() {
  state.editingScript = true;
  els.scriptEditor.readOnly = false;
  els.scriptEditor.focus();
}

function cancelEditScript() {
  state.editingScript = false;
  els.scriptEditor.readOnly = true;
  if (state.progress) renderSelectedChapter(state.progress);
}

function saveEditedScript() {
  state.editingScript = false;
  els.scriptEditor.readOnly = true;
  const chapters = state.progress?.chapters || [];
  const current = chapters[state.selectedChapterIndex];
  if (current) current.script = els.scriptEditor.value;
}

function bindEvents() {
  els.baseUrl.addEventListener("input", updateMcpPreview);
  els.baseUrl.addEventListener("change", saveSettings);
  els.serviceKey.addEventListener("change", saveSettings);
  els.checkServiceButton.addEventListener("click", checkService);
  els.styleOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.realtimeLevel = button.dataset.value;
      updateStyleOptions();
      saveSettings();
    });
  });
  els.pptFile.addEventListener("change", () => updateFileState(els.pptFile.files?.[0] || null));
  els.removeFileButton.addEventListener("click", () => {
    els.pptFile.value = "";
    updateFileState(null);
  });
  els.uploadCard.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.uploadCard.classList.add("drag");
  });
  els.uploadCard.addEventListener("dragleave", () => els.uploadCard.classList.remove("drag"));
  els.uploadCard.addEventListener("drop", (event) => {
    event.preventDefault();
    els.uploadCard.classList.remove("drag");
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    els.pptFile.files = dt.files;
    updateFileState(file);
  });
  els.submitButton.addEventListener("click", submitTask);
  els.downloadVideoButton.addEventListener("click", downloadVideo);
  els.downloadScriptButton.addEventListener("click", exportScript);
  els.importScriptButton.addEventListener("click", () => alert("本地页暂未接入字幕导入。"));
  els.fullscreenButton.addEventListener("click", () => {
    const target = document.querySelector(".player-area__video-shell");
    if (target?.requestFullscreen) void target.requestFullscreen();
  });
  els.editScriptButton.addEventListener("click", beginEditScript);
  els.cancelScriptButton.addEventListener("click", cancelEditScript);
  els.saveScriptButton.addEventListener("click", saveEditedScript);
  els.playButton.addEventListener("click", () => alert("本地页暂未接入在线播放控件。"));
  els.speedButton.addEventListener("click", () => alert("本地页暂未接入倍速播放。"));
  els.timeline.addEventListener("input", () => {
    els.seekFilled.style.width = `${els.timeline.value}%`;
  });
}

async function init() {
  loadSettings();
  loadTask();
  bindEvents();
  updateFileState(null);
  if (state.taskId) {
    showPage("playback");
    startPolling();
    await refreshProgress();
  } else {
    showPage("upload");
  }
}

void init();
