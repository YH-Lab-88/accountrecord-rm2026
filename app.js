(function () {
  // Paste the deployed Google Apps Script Web App URL here.
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIwRIyAPAqbgTHhEL4FEHqDhpSd1htsDcJWuUr1rmVa6Vw0CTc4fZN5o_SWZ4uak9z/exec";
  const STORAGE_KEY = "rm2026-recent";
  const CACHE_RECORDS_KEY = "rm2026-sheet-records-v2";
  const CACHE_BALANCE_KEY = "rm2026-sheet-balance-v1";
  const CACHE_SELECTION_KEY = "rm2026-selection-options-v1";
  const FORM_DRAFT_KEY = "rm2026-form-draft-v1";
  const DEFAULT_SELECTION_OPTIONS = ["Low Salary", "Maxis 2267289110 Mr Tee"];
  const form = document.querySelector("#entryForm");
  const status = document.querySelector("#status");
  const recentList = document.querySelector("#recentList");
  const balanceAmount = document.querySelector("#balanceAmount");
  const date = document.querySelector("#date");
  const datePicker = document.querySelector("#datePicker");
  function displayDate(dateObject) {
    const day = String(dateObject.getDate()).padStart(2, "0");
    const month = String(dateObject.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${dateObject.getFullYear()}`;
  }
  function isoDate(displayValue) {
    const match = String(displayValue).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
  }
  date.value = displayDate(new Date());
  datePicker.value = new Date().toISOString().slice(0, 10);
  function saveFormDraft() { localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(Object.fromEntries(new FormData(form).entries()))); }
  function restoreFormDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(FORM_DRAFT_KEY) || "null");
      if (!draft) return;
      ["date", "item", "other", "link", "kt", "dt"].forEach((name) => { if (draft[name] != null) form.elements[name].value = draft[name]; });
    } catch (_) {}
  }
  restoreFormDraft();
  form.addEventListener("input", saveFormDraft);
  form.addEventListener("change", saveFormDraft);
  document.querySelector("#calendarButton").addEventListener("click", () => {
    if (typeof datePicker.showPicker === "function") datePicker.showPicker();
    else datePicker.click();
  });
  datePicker.addEventListener("change", () => {
    if (datePicker.value) date.value = displayDate(new Date(`${datePicker.value}T00:00:00`));
  });
  const calculator = document.querySelector("#calculator");
  const calculatorDisplay = document.querySelector("#calculatorDisplay");
  let calculatorExpression = "";
  function showCalculator() { calculatorExpression = ""; calculatorDisplay.textContent = "0"; calculator.hidden = false; }
  document.querySelector("#calculatorButton").addEventListener("click", showCalculator);
  calculator.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.id === "calculatorCancel") return (calculator.hidden = true);
    if (button.id === "calculatorClear") calculatorExpression = "";
    else if (button.id === "calculatorBackspace") calculatorExpression = calculatorExpression.slice(0, -1);
    else if (button.id === "calculatorEquals") {
      try { const safe = calculatorExpression.replace(/%/g, "/100"); const result = Function(`"use strict"; return (${safe})`)(); if (!Number.isFinite(result)) throw new Error(); document.querySelector("#kt").value = Number(result.toFixed(2)); calculator.hidden = true; return; } catch (_) { calculatorDisplay.textContent = "错误"; return; }
    } else if (button.dataset.calc) calculatorExpression += button.dataset.calc;
    calculatorDisplay.textContent = calculatorExpression || "0";
  });

  function money(value) { return value ? `RM ${Number(value).toFixed(2)}` : "—"; }
  function recentDate(row) { const value = String(row.date || row.displayDate || ""); const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/); return iso ? `${iso[3]}/${iso[2]}` : value.slice(0, 5); }
  function getRecent() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (_) { return []; } }
  function getCachedRecords() { try { return JSON.parse(localStorage.getItem(CACHE_RECORDS_KEY) || "[]"); } catch (_) { return []; } }
  function cacheRecords(rows) { localStorage.setItem(CACHE_RECORDS_KEY, JSON.stringify(rows.slice(0, 100))); }
  function renderRecent(rows) {
    recentList.innerHTML = rows.length ? rows.map((row) => `<article class="recent-row"><time>${escapeHtml(recentDate(row))}</time><div class="recent-item"><strong>${escapeHtml(row.item)}</strong>${row.other ? `<small>${escapeHtml(row.other)}</small>` : ""}</div><span class="recent-amount">${Number(row.dt || row.kt || 0).toFixed(2)}</span>${row.row ? `<button class="delete-button" type="button" data-row="${row.row}">删除</button>` : ""}</article>`).join("") : '<p class="empty">还没有本机记录</p>';
  }
  async function loadRecent() {
    const cached = getCachedRecords();
    if (cached.length) renderRecent(cached);
    else if (!APPS_SCRIPT_URL) renderRecent(getRecent());
    if (!APPS_SCRIPT_URL) return;
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?records=100`);
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.records)) throw new Error("records failed");
      cacheRecords(result.records);
      renderRecent(result.records);
    } catch (_) { if (!cached.length) renderRecent(getRecent()); }
  }
  async function loadSelectionOptions() {
    const renderOptions = (options) => {
      const list = document.querySelector("#selectionList");
      list.innerHTML = options.length ? options.map((option) => `<button class="selection-option" type="button" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("") : '<p class="empty">暂无固定项目</p>';
    };
    let cachedOptions = [];
    try { cachedOptions = JSON.parse(localStorage.getItem(CACHE_SELECTION_KEY) || "[]"); } catch (_) {}
    if (cachedOptions.length) renderOptions(cachedOptions);
    else renderOptions(DEFAULT_SELECTION_OPTIONS);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?options=selection`);
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.options)) throw new Error("options failed");
      const options = result.options.length ? result.options : DEFAULT_SELECTION_OPTIONS;
      localStorage.setItem(CACHE_SELECTION_KEY, JSON.stringify(options));
      renderOptions(options);
    } catch (_) {}
  }
  function renderBalance(value) { balanceAmount.textContent = value == null ? "RM —" : `RM ${Number(value).toFixed(2)}`; }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function setStatus(message, type) { status.textContent = message; status.className = `status ${type || ""}`; }
  async function loadBalance() {
    if (!APPS_SCRIPT_URL) return;
    const cachedBalance = Number(localStorage.getItem(CACHE_BALANCE_KEY));
    if (Number.isFinite(cachedBalance)) renderBalance(cachedBalance);
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const result = await response.json();
      if (typeof result.balance === "number") { localStorage.setItem(CACHE_BALANCE_KEY, String(result.balance)); renderBalance(result.balance); }
    } catch (_) { /* Keep the balance placeholder when the sheet is unavailable. */ }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.dt && !data.kt) return setStatus("请填写进账或出账。", "error");
    if (data.dt && data.kt) return setStatus("一笔记录请只填写进账或出账其中一项。", "error");
    const normalizedDate = isoDate(data.date);
    if (!normalizedDate) return setStatus("日期请使用 日/月/年，例如 10/08/2026。", "error");
    const payload = { date: normalizedDate, displayDate: data.date, item: data.item.trim(), other: data.other.trim(), link: data.link.trim(), dt: data.dt || "", kt: data.kt || "" };
    setStatus(APPS_SCRIPT_URL ? "正在保存…" : "界面已完成，但尚未连接 Google Sheet。", "pending");
    if (APPS_SCRIPT_URL) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        if (!response.ok) throw new Error("save failed");
        const result = await response.json();
        if (typeof result.balance === "number") { localStorage.setItem(CACHE_BALANCE_KEY, String(result.balance)); renderBalance(result.balance); }
        payload.row = result.row;
        setStatus("已保存到 RM2026。", "success");
      } catch (_) { return setStatus("保存失败，请检查连接设置。", "error"); }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([payload, ...getRecent()].slice(0, 50)));
    localStorage.removeItem(FORM_DRAFT_KEY);
    await loadRecent();
    form.reset();
    date.value = displayDate(new Date());
    datePicker.value = new Date().toISOString().slice(0, 10);
  });
  document.querySelector("#clearButton").addEventListener("click", loadRecent);
  document.querySelector("#syncButton").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    setStatus("正在更新 Sheet 资料…", "pending");
    await Promise.all([loadRecent(), loadBalance()]);
    button.disabled = false;
    setStatus("资料已更新。", "success");
  });
  const selectionPicker = document.querySelector("#selectionPicker");
  document.querySelector("#selectionButton").addEventListener("click", async () => { selectionPicker.hidden = false; await loadSelectionOptions(); });
  document.querySelector("#itemClear").addEventListener("click", () => { document.querySelector("#item").value = ""; document.querySelector("#item").focus(); });
  document.querySelector("#linkClear").addEventListener("click", () => { document.querySelector("#link").value = ""; document.querySelector("#link").focus(); });
  document.querySelector("#pasteButton").addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.querySelector("#link").value = text.trim();
      saveFormDraft();
      document.querySelector("#link").focus();
      setStatus("链接已贴上。", "success");
    } catch (_) { setStatus("无法读取剪贴板，请允许浏览器访问剪贴板。", "error"); }
  });
  document.querySelector("#otherClear").addEventListener("click", () => { document.querySelector("#other").value = ""; document.querySelector("#other").focus(); });
  document.querySelector("#selectionClose").addEventListener("click", () => { selectionPicker.hidden = true; });
  document.querySelector("#selectionList").addEventListener("click", (event) => { const button = event.target.closest(".selection-option"); if (!button) return; document.querySelector("#item").value = button.dataset.value; selectionPicker.hidden = true; });
  recentList.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-button");
    if (!button) return;
    const rows = [...recentList.querySelectorAll(".recent-row")];
    const index = Number(button.dataset.index);
    const row = button.dataset.row ? { row: Number(button.dataset.row) } : null;
    if (!row || !row.row || !confirm("确定要删除这笔记录吗？Google Sheet 的对应记录也会被删除。")) return;
    if (!APPS_SCRIPT_URL) return setStatus("尚未连接 Google Sheet。", "error");
    button.disabled = true;
    setStatus("正在删除…", "pending");
    try {
      const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete", row: row.row }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("delete failed");
      await loadRecent();
      if (typeof result.balance === "number") renderBalance(result.balance);
      setStatus("记录已删除。", "success");
    } catch (_) { button.disabled = false; setStatus("删除失败，请检查连接。", "error"); }
  });
  renderRecent(getRecent());
  loadRecent();
  loadBalance();
})();
