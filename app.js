(function () {
  // Paste the deployed Google Apps Script Web App URL here.
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIwRIyAPAqbgTHhEL4FEHqDhpSd1htsDcJWuUr1rmVa6Vw0CTc4fZN5o_SWZ4uak9z/exec";
  const STORAGE_KEY = "rm2026-recent";
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
  document.querySelector("#calendarButton").addEventListener("click", () => {
    if (typeof datePicker.showPicker === "function") datePicker.showPicker();
    else datePicker.click();
  });
  datePicker.addEventListener("change", () => {
    if (datePicker.value) date.value = displayDate(new Date(`${datePicker.value}T00:00:00`));
  });

  function money(value) { return value ? `RM ${Number(value).toFixed(2)}` : "—"; }
  function getRecent() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (_) { return []; } }
  function renderRecent(rows) {
    recentList.innerHTML = rows.length ? rows.map((row) => `<article class="recent-row"><div><strong>${escapeHtml(row.item)}</strong><small>${row.displayDate || row.date}${row.other ? ` · ${escapeHtml(row.other)}` : ""}</small></div><div class="recent-actions"><span>${row.dt ? `+${money(row.dt)}` : `-${money(row.kt)}`}</span>${row.row ? `<button class="delete-button" type="button" data-row="${row.row}">删除</button>` : ""}</div></article>`).join("") : '<p class="empty">还没有本机记录</p>';
  }
  async function loadRecent() {
    if (!APPS_SCRIPT_URL) return renderRecent(getRecent());
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?records=30`);
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.records)) throw new Error("records failed");
      renderRecent(result.records);
    } catch (_) { renderRecent(getRecent()); }
  }
  function renderBalance(value) { balanceAmount.textContent = value == null ? "RM —" : `RM ${Number(value).toFixed(2)}`; }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function setStatus(message, type) { status.textContent = message; status.className = `status ${type || ""}`; }
  async function loadBalance() {
    if (!APPS_SCRIPT_URL) return;
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const result = await response.json();
      if (typeof result.balance === "number") renderBalance(result.balance);
    } catch (_) { /* Keep the balance placeholder when the sheet is unavailable. */ }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.dt && !data.kt) return setStatus("请填写进账或出账。", "error");
    if (data.dt && data.kt) return setStatus("一笔记录请只填写进账或出账其中一项。", "error");
    const normalizedDate = isoDate(data.date);
    if (!normalizedDate) return setStatus("日期请使用 日/月/年，例如 10/08/2026。", "error");
    const payload = { date: normalizedDate, displayDate: data.date, item: data.item.trim(), other: data.other.trim(), dt: data.dt || "", kt: data.kt || "" };
    setStatus(APPS_SCRIPT_URL ? "正在保存…" : "界面已完成，但尚未连接 Google Sheet。", "pending");
    if (APPS_SCRIPT_URL) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        if (!response.ok) throw new Error("save failed");
        const result = await response.json();
        if (typeof result.balance === "number") renderBalance(result.balance);
        payload.row = result.row;
        setStatus("已保存到 RM2026。", "success");
      } catch (_) { return setStatus("保存失败，请检查连接设置。", "error"); }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([payload, ...getRecent()].slice(0, 50)));
    await loadRecent();
    form.reset();
    date.value = displayDate(new Date());
    datePicker.value = new Date().toISOString().slice(0, 10);
  });
  document.querySelector("#clearButton").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); loadRecent(); });
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
