// ===== Elements =====
const table = document.getElementById("tableInput");
const plannerTab = document.getElementById("plannerTab");
const calendarTab = document.getElementById("calendarTab");
const notesTab = document.getElementById("notesTab");
const plannerSection = document.getElementById("plannerSection");
const calendarSection = document.getElementById("calendarSection");
const notesSection = document.getElementById("notesSection");
const settingsTab = document.getElementById("settingsTab");
const aboutTab = document.getElementById("aboutTab");
const settingsSection = document.getElementById("settingsSection");
const aboutSection = document.getElementById("aboutSection");
const tabMenuButton = document.getElementById("tabMenuButton");
const tabMenuDropdown = document.getElementById("tabMenuDropdown");

const viewTaskPopup = document.getElementById("viewTaskPopup");
const closeViewTask = document.getElementById("closeViewTask");
const editTaskBtn = document.getElementById("editTaskBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");

let currentTaskId = null;
let rowDeleteMode = false;
let columnDeleteMode = false;
let calendar;

// ===== Helpers =====
function showPopup(message, duration = 3000) {
  const popup = document.getElementById("popupMessage");
  if (!popup) return;
  popup.textContent = message;
  popup.style.display = "block";
  setTimeout(() => (popup.style.display = "none"), duration);
}

/* =========================
   Table persistence
========================= */
function saveTable() {
  if (!table) return;
  const data = Array.from(table.rows).map(row =>
    Array.from(row.cells).map(cell => cell.textContent)
  );
  localStorage.setItem("tableData", JSON.stringify(data));
}

function loadTable() {
  if (!table) return;
  const saved = localStorage.getItem("tableData");
  if (!saved) return;
  const data = JSON.parse(saved);
  while (table.rows.length) table.deleteRow(0);
  for (let rowData of data) {
    const row = table.insertRow();
    for (let cellData of rowData) row.insertCell().textContent = cellData;
  }
}

/* =========================
   Section Display
========================= */
function hideAllSections() {
  if (plannerSection) plannerSection.style.display = "none";
  if (calendarSection) calendarSection.style.display = "none";
  if (notesSection) notesSection.style.display = "none";
  if (settingsSection) settingsSection.style.display = "none";
  if (aboutSection) aboutSection.style.display = "none";

  // remove active classes where elements exist
  [plannerTab, calendarTab, notesTab, settingsTab, aboutTab].forEach(el => {
    if (el) el.classList && el.classList.remove("active");
  });
}

function showPlanner() {
  hideAllSections();
  if (plannerSection) plannerSection.style.display = "flex";
  if (plannerTab) plannerTab.classList.add("active");
}

function showCalendar() {
  hideAllSections();
  if (calendarSection) calendarSection.style.display = "block";
  if (calendarTab) calendarTab.classList.add("active");
  if (calendar) {
    calendar.render();
    calendar.updateSize();
  }
}

function showNotes() {
  hideAllSections();
  if (notesSection) notesSection.style.display = "block";
  if (notesTab) notesTab.classList.add("active");
  renderPagesList();
  openActivePage();
}

function showSettings() {
  hideAllSections();
  if (settingsSection) settingsSection.style.display = "block";
  if (settingsTab) settingsTab.classList.add("active");
}

function showAbout() {
  hideAllSections();
  if (aboutSection) aboutSection.style.display = "block";
  if (aboutTab) aboutTab.classList.add("active");
}

/* =========================
   Table helpers
========================= */
function addRow() {
  if (!table) return;
  const numColumns = table.rows[0]?.cells.length || 1;
  const newRow = table.insertRow();
  for (let i = 0; i < numColumns; i++) newRow.insertCell().textContent = "";
  saveTable();
}

function addColumn() {
  if (!table) return;
  for (let row of table.rows) row.insertCell().textContent = "";
  saveTable();
}

function editCell(cell) {
  if (!cell || cell.querySelector("input")) return;
  const original = cell.textContent;
  cell.innerHTML = `<input type="text" value="${original}">`;
  const input = cell.querySelector("input");
  input.focus();
  input.addEventListener("blur", () => {
    cell.textContent = input.value;
    saveTable();
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
  });
}

/* =========================
   Delete Modes
========================= */
function startRemoveRow() {
  rowDeleteMode = true;
  columnDeleteMode = false;
  table && table.classList.add("row-delete-mode");
  table && table.classList.remove("column-delete-mode");
  showPopup("Click a row to delete it.");
}

function startRemoveColumn() {
  columnDeleteMode = true;
  rowDeleteMode = false;
  table && table.classList.add("column-delete-mode");
  table && table.classList.remove("row-delete-mode");
  showPopup("Click a column to delete it.");
}

/* =========================
   Table Listeners
========================= */
if (table) {
  table.addEventListener("click", event => {
    if (rowDeleteMode) {
      const row = event.target.closest("tr");
      if (row) table.deleteRow(Array.from(table.rows).indexOf(row));
      rowDeleteMode = false;
      table.classList.remove("row-delete-mode");
      showPopup("Row deleted. Mode off.");
      saveTable();
      return;
    }

    if (columnDeleteMode) {
      const cell = event.target.closest("td, th");
      if (cell) {
        const index = Array.from(cell.parentElement.cells).indexOf(cell);
        for (let r of table.rows) if (r.cells[index]) r.deleteCell(index);
        saveTable();
      }
      columnDeleteMode = false;
      table.classList.remove("column-delete-mode");
      showPopup("Column deleted. Mode off.");
      return;
    }

    if (event.target.tagName === "TD") editCell(event.target);
  });

  table.addEventListener("mouseover", e => {
    if (!columnDeleteMode) return;
    const cell = e.target.closest("td, th");
    if (!cell) return;
    const index = Array.from(cell.parentElement.cells).indexOf(cell);
    for (let row of table.rows) if (row.cells[index]) row.cells[index].classList.add("column-hover");
  });

  table.addEventListener("mouseout", () => {
    if (!columnDeleteMode) return;
    for (let row of table.rows) for (let cell of row.cells) cell.classList.remove("column-hover");
  });
}

/* =========================
   Dropdown with Smooth Animation
========================= */
if (tabMenuButton && tabMenuDropdown) {
  tabMenuButton.addEventListener("click", e => {
    e.stopPropagation();
    tabMenuDropdown.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    tabMenuDropdown.classList.remove("show");
  });

  const notesDropdownBtn = document.getElementById("notesDropdownBtn");
const notesDropdownMenu = document.getElementById("notesDropdownMenu");

if (notesDropdownBtn && notesDropdownMenu) {
  notesDropdownBtn.addEventListener("click", e => {
    e.stopPropagation();
    notesDropdownMenu.classList.toggle("show");
  });

  document.addEventListener("click", e => {
    if (!notesDropdownMenu.contains(e.target)) {
      notesDropdownMenu.classList.remove("show");
    }
  });
}

  // wire menu items (if present)
  plannerTab && plannerTab.addEventListener("click", () => { showPlanner(); tabMenuDropdown.classList.remove("show"); });
  calendarTab && calendarTab.addEventListener("click", () => { showCalendar(); tabMenuDropdown.classList.remove("show"); });
  notesTab && notesTab.addEventListener("click", () => { showNotes(); tabMenuDropdown.classList.remove("show"); });
  settingsTab && settingsTab.addEventListener("click", () => { showSettings(); tabMenuDropdown.classList.remove("show"); });
  aboutTab && aboutTab.addEventListener("click", () => { showAbout(); tabMenuDropdown.classList.remove("show"); });
}

/* =========================
   Theme Dropdown (small custom menu)
========================= */
const themeBtn = document.getElementById("themeDropdownButton");
const themeMenu = document.getElementById("themeDropdownMenu");

function updateThemeButton() {
  if (!themeBtn) return;
  const current = localStorage.getItem("selectedTheme") || "light";
  themeBtn.textContent = current.charAt(0).toUpperCase() + current.slice(1);
}
updateThemeButton();

if (themeBtn && themeMenu) {
  themeBtn.addEventListener("click", e => {
    e.stopPropagation();
    themeMenu.classList.toggle("show");
  });
  document.addEventListener("click", () => themeMenu.classList.remove("show"));
  themeMenu.querySelectorAll("div").forEach(item => {
    item.addEventListener("click", () => {
      const theme = item.dataset.theme;
      applyTheme(theme);
      updateThemeButton();
      themeMenu.classList.remove("show");
    });
  });
}

/* =========================
   Task Storage
========================= */
function saveTasks(tasks) {
  localStorage.setItem("calendarTasks", JSON.stringify(tasks));
}
function loadTasks() {
  return JSON.parse(localStorage.getItem("calendarTasks") || "[]");
}

/* =========================
   Add Task Popup (unchanged behavior)
   (existing code creates the popup and manages add/edit)
========================= */
// create taskPopup if not present (some previous versions appended it)
// If you already create it elsewhere in HTML or earlier code, skip duplication
if (!document.getElementById("taskPopup")) {
  const taskPopup = document.createElement("div");
  taskPopup.id = "taskPopup";
  taskPopup.innerHTML = `
    <h3>Add Task</h3>
    <div class="fields-container">
      <div class="field"><strong>Title:</strong><input type="text" id="popupTaskTitle"></div>
      <div class="field"><strong>Start Date:</strong><input type="date" id="popupTaskStart"></div>
      <div class="field"><strong>End Date:</strong><input type="date" id="popupTaskEnd"></div>
      <div class="field">
        <strong>Time:</strong>
        <input type="time" id="popupTaskTime">
        <label><input type="checkbox" id="popupAllDay"> All-day</label>
      </div>
      <label for="reminderTime">Remind me in:</label>
      <select id="reminderTime">
        <option value="">No reminder</option>
        <option value="30">30 minutes</option>
        <option value="60">1 hour</option>
        <option value="120">2 hours</option>
        <option value="240">4 hours</option>
      </select>
      <div class="field"><strong>Description:</strong><textarea id="popupTaskDesc"></textarea></div>
    </div>
    <div class="buttons-container">
      <button id="popupCancel">Cancel</button>
      <button id="popupAdd">Save</button>
    </div>
  `;
  document.body.appendChild(taskPopup);
}

// hookup popup controls (if they exist)
const allDayCheckbox = document.getElementById("popupAllDay");
const timeInput = document.getElementById("popupTaskTime");
if (allDayCheckbox && timeInput) {
  allDayCheckbox.addEventListener("change", () => {
    timeInput.disabled = allDayCheckbox.checked;
  });
}
document.getElementById("popupCancel") && document.getElementById("popupCancel").addEventListener("click", () => {
  const p = document.getElementById("taskPopup");
  if (p) p.style.display = "none";
});

document.getElementById("popupAdd") && document.getElementById("popupAdd").addEventListener("click", () => {
  const title = (document.getElementById("popupTaskTitle") || {}).value?.trim?.() || "";
  const startDate = (document.getElementById("popupTaskStart") || {}).value || "";
  let endDate = (document.getElementById("popupTaskEnd") || {}).value || "";
  let time = (document.getElementById("popupTaskTime") || {}).value || "";
  const allDay = (document.getElementById("popupAllDay") || {}).checked || false;
  const desc = (document.getElementById("popupTaskDesc") || {}).value?.trim?.() || "";
  const reminderMinutes = (document.getElementById("reminderTime") || {}).value || "";

  if (!title || !startDate) {
    showPopup("Enter title and start date");
    return;
  }
  if (!endDate) endDate = startDate;

  const start = allDay ? startDate : `${startDate}T${time || "00:00"}`;
  const end = endDate;

  const tasks = loadTasks();
  const id = Date.now() + title;
  tasks.push({ id, title, start, end, description: desc, allDay, reminderMinutes });
  saveTasks(tasks);

  // Only add reminder if user chose a value
  if (reminderMinutes) addReminder(id, parseInt(reminderMinutes));

  // refresh calendar (if present)
  calendar && calendar.refetchEvents && calendar.refetchEvents();
  const p = document.getElementById("taskPopup");
  if (p) p.style.display = "none";
  showPopup("Task saved");
});

/* =========================
   View Task Popup handlers (unchanged)
========================= */
if (closeViewTask) {
  closeViewTask.addEventListener("click", () => {
    viewTaskPopup.style.display = "none";
    currentTaskId = null;
  });
}
if (deleteTaskBtn) {
  deleteTaskBtn.addEventListener("click", () => {
    if (!currentTaskId) return;
    let tasks = loadTasks();
    tasks = tasks.filter(t => t.id !== currentTaskId);
    saveTasks(tasks);
    calendar && calendar.refetchEvents && calendar.refetchEvents();
    viewTaskPopup.style.display = "none";
    showPopup("Task deleted");
    currentTaskId = null;
  });
}
if (editTaskBtn) {
  editTaskBtn.addEventListener("click", () => {
    if (!currentTaskId) return;
    let tasks = loadTasks();
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) return;

    document.getElementById("popupTaskTitle").value = task.title;
    document.getElementById("popupTaskStart").value = task.start.split("T")[0];
    document.getElementById("popupTaskEnd").value = task.end || "";
    document.getElementById("popupTaskTime").value =
      task.start.includes("T") ? task.start.split("T")[1] : "";
    document.getElementById("popupTaskDesc").value = task.description;
    document.getElementById("popupAllDay").checked = task.allDay;
    document.getElementById("popupTaskTime").disabled = task.allDay;
    document.getElementById("reminderTime").value = task.reminderMinutes || "";

    tasks = tasks.filter(t => t.id !== currentTaskId);
    saveTasks(tasks);
    calendar && calendar.refetchEvents && calendar.refetchEvents();

    viewTaskPopup.style.display = "none";
    const p = document.getElementById("taskPopup");
    if (p) p.style.display = "block";
    currentTaskId = null;
  });
}

/* =========================
   Calendar (unchanged)
========================= */
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl || typeof FullCalendar === "undefined") return;
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "addTaskButton dayGridMonth,timeGridWeek,timeGridDay"
    },
    customButtons: {
      addTaskButton: { text: "Add Task", click: () => {
        const p = document.getElementById("taskPopup");
        if (p) p.style.display = "block";
      }}
    },
    events: (fetchInfo, success) => {
      const tasks = loadTasks();
      success(
        tasks.map(t => ({
          id: t.id,
          title: t.title,
          start: t.start,
          end: t.end,
          allDay: t.allDay,
          extendedProps: { description: t.description || "" }
        }))
      );
    },
    eventClick: info => {
      const taskId = info.event.id;
      const task = loadTasks().find(t => t.id === taskId);
      if (!task) return;
      currentTaskId = task.id;

      document.getElementById("viewTaskTitle").textContent = task.title;
      document.getElementById("viewTaskDate").textContent =
        task.start.split("T")[0] +
        (task.end && task.end !== task.start.split("T")[0] ? " → " + task.end : "");
      document.getElementById("viewTaskTime").textContent = task.allDay
        ? "All-day"
        : task.start.includes("T") ? task.start.split("T")[1] : "";
      document.getElementById("viewTaskDesc").textContent = task.description;
      viewTaskPopup.style.display = "block";
    }
  });
  calendar.render();
}

/* =========================
   Notes: pages, editor, sidebar
========================= */
const pagesListEl = document.getElementById("pagesList");
const notesEditor = document.getElementById("notesEditor");
const noteTitleInput = document.getElementById("noteTitleInput");
const newPageBtn = document.getElementById("newPageBtn");
const deletePageBtn = document.getElementById("deletePageBtn");
const exportNoteBtn = document.getElementById("exportNoteBtn");
const lastSavedEl = document.getElementById("lastSaved");
const notesSearch = document.getElementById("notesSearch");

let pages = []; // array of {id,title,content,updated}
let activePageId = null;

/* persistence */
function savePages() {
  try {
    localStorage.setItem("notesPages", JSON.stringify(pages));
    localStorage.setItem("notesActiveId", activePageId || "");
  } catch (e) {
    console.error("Failed to save pages:", e);
  }
}
function loadPages() {
  try {
    const p = JSON.parse(localStorage.getItem("notesPages") || "[]");
    pages = Array.isArray(p) ? p : [];
    const savedActive = localStorage.getItem("notesActiveId");
    activePageId = savedActive || (pages[0] && pages[0].id) || null;
  } catch (e) {
    pages = [];
    activePageId = null;
  }
}

/* utility */
function nowText() {
  return new Date().toLocaleString();
}

function renderPagesList(filter = "") {
  if (!pagesListEl) return;
  const query = (filter || "").toLowerCase().trim();
  pagesListEl.innerHTML = "";
  pages.forEach(page => {
    if (query && !((page.title||"").toLowerCase().includes(query) || (page.content||"").toLowerCase().includes(query))) return;
    const li = document.createElement("li");
    li.dataset.id = page.id;
    li.className = page.id === activePageId ? "active" : "";
    const title = document.createElement("span");
    title.textContent = page.title || "Untitled";
    title.style.flexGrow = "1";
    li.appendChild(title);
    const meta = document.createElement("small");
    meta.textContent = page.updated ? new Date(page.updated).toLocaleString() : "";
    meta.style.marginLeft = "0.5rem";
    meta.style.color = "var(--secondary)";
    li.appendChild(meta);

    li.addEventListener("click", () => {
      setActivePage(page.id);
    });

    pagesListEl.appendChild(li);
  });
}

/* open a page in the editor */
function openActivePage() {
  if (!notesEditor || !noteTitleInput) return;
  const page = pages.find(p => p.id === activePageId);
  if (!page) {
    notesEditor.innerHTML = "";
    noteTitleInput.value = "";
    lastSavedEl && (lastSavedEl.textContent = "No page selected");
    return;
  }
  notesEditor.innerHTML = page.content || "";
  noteTitleInput.value = page.title || "";
  lastSavedEl && (lastSavedEl.textContent = page.updated ? `Saved ${new Date(page.updated).toLocaleString()}` : "Unsaved");
}

/* create a new page */
function createPage(title = "Untitled") {
  const id = "p" + Date.now();
  const page = { id, title, content: "", updated: new Date().toISOString() };
  pages.unshift(page); // put newest first
  activePageId = id;
  savePages();
  renderPagesList();
  openActivePage();
  // focus editor
  setTimeout(() => notesEditor && notesEditor.focus(), 50);
}

/* delete active page */
// Replace old delete function with this
function deleteActivePage() {
  if (!activePageId) return showPopup("No page selected");
  showDeletePopup(activePageId);
}

// ===== Delete Page Confirmation Popup =====
const deleteConfirmPopup = document.createElement("div");
deleteConfirmPopup.id = "deleteConfirmPopup";
deleteConfirmPopup.className = "custom-popup";
deleteConfirmPopup.innerHTML = `
  <div class="popup-content">
    <p>Are you sure you want to delete this page?</p>
    <div class="popup-buttons">
      <button id="confirmDeleteBtn">Delete</button>
      <button id="cancelDeleteBtn">Cancel</button>
    </div>
  </div>
`;
document.body.appendChild(deleteConfirmPopup);

let pageToDelete = null;

function showDeletePopup(pageId) {
  pageToDelete = pageId;
  deleteConfirmPopup.style.display = "block";
}

document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
  pageToDelete = null;
  deleteConfirmPopup.style.display = "none";
});

document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
  if (!pageToDelete) return;

  pages = pages.filter(p => p.id !== pageToDelete);
  savePages();  // no argument
  renderPagesList();  // refresh sidebar
  if (notesEditor) notesEditor.innerHTML = "";  // clear editor
  activePageId = null;
  pageToDelete = null;
  deleteConfirmPopup.style.display = "none";
  showPopup("Page deleted");
});

/* set active page */
function setActivePage(id) {
  if (!id) return;
  activePageId = id;
  renderPagesList();
  openActivePage();
  // highlight in UI
  const el = document.querySelector(`#pagesList li[data-id="${id}"]`);
  el && el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* autosave with debounce */
let saveTimer = null;
function scheduleSave(delay = 700) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    page.title = (noteTitleInput.value || "Untitled").trim();
    page.content = notesEditor.innerHTML;
    page.updated = new Date().toISOString();
    savePages();
    lastSavedEl && (lastSavedEl.textContent = `Saved ${nowText()}`);
    renderPagesList(notesSearch && notesSearch.value ? notesSearch.value : "");
  }, delay);
}

/* export current page as txt */
function exportCurrentPage() {
  const page = pages.find(p => p.id === activePageId);
  if (!page) { showPopup("No page to export"); return; }
  const blob = new Blob([page.title + "\n\n" + (stripHtml(page.content) || "")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (page.title || "note") + ".txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/* wire up notes UI */
if (newPageBtn) newPageBtn.addEventListener("click", () => createPage("Untitled"));
if (deletePageBtn) deletePageBtn.addEventListener("click", deleteActivePage);
if (exportNoteBtn) exportNoteBtn.addEventListener("click", exportCurrentPage);

if (notesSearch) {
  notesSearch.addEventListener("input", (e) => renderPagesList(e.target.value));
}

/* editor handlers */
if (notesEditor) {
  notesEditor.addEventListener("input", () => scheduleSave(800));
  notesEditor.addEventListener("keydown", (e) => {
    // support Ctrl/Cmd+S to save immediately
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      scheduleSave(0);
      showPopup("Saved");
    }
  });
}
if (noteTitleInput) {
  noteTitleInput.addEventListener("input", () => scheduleSave(400));
  noteTitleInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      scheduleSave(0);
      showPopup("Saved");
    }
  });
}

// ===== Live Markdown Formatting for Notes =====
if (notesEditor) {
  notesEditor.addEventListener('keyup', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      const selection = window.getSelection();
      const range = selection.rangeCount ? selection.getRangeAt(0) : null;
      if (!range) return;

      const line = getCurrentLine(notesEditor, range);
      if (!line) return;

      applyMarkdownFormatting(line);
    }
  });

  notesEditor.addEventListener('input', () => scheduleSave(800));
  notesEditor.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      scheduleSave(0);
      showPopup('Saved');
    }
  });
}

function getCurrentLine(editor, range) {
  let node = range.startContainer;
  while (node && node !== editor && node.nodeType !== 1) {
    node = node.parentNode;
  }
  if (node && node !== editor) return node;
  const div = document.createElement('div');
  editor.appendChild(div);
  return div;
}

function applyMarkdownFormatting(line) {
  let text = line.innerText.trim();

  // Headings
  if (text.startsWith('# ')) {
    line.innerText = text.replace(/^#\s/, '');
    line.style.fontSize = '1.8em';
    line.style.fontWeight = '700';
    return;
  }
  if (text.startsWith('## ')) {
    line.innerText = text.replace(/^##\s/, '');
    line.style.fontSize = '1.5em';
    line.style.fontWeight = '600';
    return;
  }
  if (text.startsWith('### ')) {
    line.innerText = text.replace(/^###\s/, '');
    line.style.fontSize = '1.2em';
    line.style.fontWeight = '600';
    return;
  }

  // Bullet list
  if (text.startsWith('* ') || text.startsWith('- ')) {
    line.innerText = '• ' + text.replace(/^(\*|-)\s/, '');
    line.style.marginLeft = '1em';
    line.style.fontSize = '1em';
    return;
  }

    // Numbered list
  if (/^\d+\.\s/.test(text)) {
    line.innerText = text.replace(/^\d+\.\s/, '1. ');
    line.style.marginLeft = '1em';
    line.style.fontSize = '1em';
    return;
  }

  // Bold text **bold**
  if (/\*\*(.*?)\*\*/.test(text)) {
    line.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return;
  }

  // Italic text *italic*
  if (/\*(.*?)\*/.test(text)) {
    line.innerHTML = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return;
  }

  // Inline code `code`
  if (/`(.*?)`/.test(text)) {
    line.innerHTML = text.replace(/`(.*?)`/g, '<code>$1</code>');
    const codes = line.querySelectorAll('code');
    codes.forEach(c => {
      c.style.background = 'var(--grey)';
      c.style.padding = '2px 4px';
      c.style.borderRadius = '4px';
      c.style.fontFamily = 'monospace';
    });
    return;
  }
}

// ==== / Command System ====
const commandPopup = document.createElement('div');
commandPopup.id = 'commandPopup';
commandPopup.style.position = 'absolute';
commandPopup.style.display = 'none';
commandPopup.style.background = 'var(--surface)';
commandPopup.style.border = '1px solid var(--border)';
commandPopup.style.borderRadius = '0.5rem';
commandPopup.style.padding = '0.5rem';
commandPopup.style.zIndex = '3000';
commandPopup.style.minWidth = '180px';
commandPopup.style.maxHeight = '200px';
commandPopup.style.overflowY = 'auto';
document.body.appendChild(commandPopup);

const commands = [
  { name: 'Insert Date', action: () => insertAtCursor(new Date().toLocaleDateString()) },
  { name: 'Insert Time', action: () => insertAtCursor(new Date().toLocaleTimeString()) },
  { name: 'Bold', action: () => wrapSelection('**') },
  { name: 'Italic', action: () => wrapSelection('*') },
  { name: 'Underline', action: () => wrapSelection('__') },
  { name: 'New Line', action: () => insertAtCursor('\n') },
];

let filteredCommands = [...commands];
let selectedIndex = 0;

function insertAtCursor(text) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  // Move cursor after inserted text
  range.setStart(range.endContainer, range.endOffset);
  range.setEnd(range.endContainer, range.endOffset);
  sel.removeAllRanges();
  sel.addRange(range);
}

function wrapSelection(wrapper) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const selectedText = range.toString();
  const wrappedText = wrapper + selectedText + wrapper;
  range.deleteContents();
  range.insertNode(document.createTextNode(wrappedText));
  // Move cursor to end of inserted text
  range.setStart(range.endContainer, range.endOffset);
  range.setEnd(range.endContainer, range.endOffset);
  sel.removeAllRanges();
  sel.addRange(range);
}

function showCommandPopup(x, y) {
  commandPopup.style.left = x + 'px';
  commandPopup.style.top = y + 'px';
  commandPopup.style.display = 'block';
  renderCommands();
}

function hideCommandPopup() {
  commandPopup.style.display = 'none';
  filteredCommands = [...commands];
  selectedIndex = 0;
}

function renderCommands() {
  commandPopup.innerHTML = '';
  filteredCommands.forEach((cmd, i) => {
    const div = document.createElement('div');
    div.textContent = cmd.name;
    div.style.padding = '0.3rem 0.5rem';
    div.style.cursor = 'pointer';
    if (i === selectedIndex) div.style.background = 'var(--primary)';
    div.addEventListener('click', () => {
      cmd.action();
      hideCommandPopup();
    });
    commandPopup.appendChild(div);
  });
}

notesEditor.addEventListener('keydown', (e) => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  if (commandPopup.style.display === 'block') {
    if (e.key === 'ArrowDown') {
      selectedIndex = (selectedIndex + 1) % filteredCommands.length;
      renderCommands();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
      renderCommands();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      filteredCommands[selectedIndex].action();
      hideCommandPopup();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      hideCommandPopup();
    } else if (e.key.length === 1) {
      setTimeout(() => filterCommands(getCurrentWord()), 0);
    }
  } else if (e.key === '/') {
    const range = sel.getRangeAt(0).getBoundingClientRect();
    showCommandPopup(range.left, range.bottom + window.scrollY);
  }
});

function getCurrentWord() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return '';
  const node = sel.anchorNode;
  if (!node) return '';
  const text = node.textContent.slice(0, sel.anchorOffset);
  const match = text.match(/\/(\w*)$/);
  return match ? match[1] : '';
}

function filterCommands(query) {
  filteredCommands = commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));
  selectedIndex = 0;
  renderCommands();
}

/* on page load, initialize notes set */
function initNotes() {
  loadPages();
  if (!pages.length) {
    createPage("Welcome");
    pages[0].content = "<p>Welcome — start writing your notes here.</p>";
    pages[0].updated = new Date().toISOString();
    savePages();
  }
  renderPagesList();
  openActivePage();
}

/* =========================
   Reminders 
========================= */
let reminders = [];

/* Load saved reminders from localStorage */
function loadReminders() {
  const saved = localStorage.getItem("taskReminders");
  if (!saved) return;
  try {
    reminders = JSON.parse(saved).map(r => ({
      ...r,
      time: new Date(r.time),
      triggered: r.triggered
    }));
  } catch (e) {
    reminders = [];
  }
}

/* Save */
function saveReminders() {
  try {
    const serializable = reminders.map(r => ({ ...r, time: r.time.toISOString(), triggered: r.triggered, taskId: r.taskId, title: r.title }));
    localStorage.setItem("taskReminders", JSON.stringify(serializable));
  } catch (e) { console.error(e); }
}

/* Notification permission */
if ("Notification" in window) {
  Notification.requestPermission().then(permission => {
    if (permission !== "granted") console.log("Notifications denied");
  });
}

/* Add reminder to a task */
function addReminder(taskId, minutesBefore) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task || !minutesBefore) return;
  const taskTime = task.allDay ? new Date(task.start + "T00:00") : new Date(task.start);
  const reminderTime = new Date(taskTime.getTime() - minutesBefore * 60000);
  reminders.push({ taskId, title: task.title, time: reminderTime, triggered: false });
  saveReminders();
}

/* Check reminders */
function checkReminders() {
  const now = new Date();
  reminders.forEach(reminder => {
    if (!reminder.triggered && now >= reminder.time) {
      reminder.triggered = true;
      showReminderPopup(reminder.title);
      showSystemNotification(reminder.title);
      saveReminders();
    }
  });
}
setInterval(checkReminders, 30000);

/* reminder popup */
function showReminderPopup(message) {
  const popup = document.createElement("div");
  popup.className = "reminder-popup";
  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 5000);
}

/* system notification */
function showSystemNotification(message) {
  if (Notification.permission === "granted") {
    new Notification("Task Reminder", { body: message });
  }
}

/* Hook into Task Add to add reminder if user chose a value */
document.addEventListener("click", (e) => {
  // If popupAdd exists and is clicked
  if (e.target && e.target.id === "popupAdd") {
    const tasks = loadTasks();
    const latestTask = tasks[tasks.length - 1];
    if (!latestTask) return;
    const reminderValue = (document.getElementById("reminderTime") || {}).value;
    const minutesBefore = reminderValue ? parseInt(reminderValue) : null;
    if (minutesBefore) addReminder(latestTask.id, minutesBefore);
  }
});

/* Rebuild reminders on page load */
window.addEventListener("DOMContentLoaded", () => {
  loadReminders();

  // re-add reminders for tasks that still exist but not yet in reminders
  const tasks = loadTasks();
  tasks.forEach(task => {
    const existing = reminders.find(r => r.taskId === task.id);
    if (!existing && task.reminderMinutes) {
      addReminder(task.id, task.reminderMinutes);
    }
  });
});

/* =========================
   Theme Handling
========================= */
const root = document.documentElement;
const themeSelect = document.getElementById("themeSelect");

const availableThemes = ["light", "dark", "sunset", "mint", "lavender", "peach"];

function applyTheme(theme) {
  if (!availableThemes.includes(theme)) theme = "light";
  root.setAttribute("data-theme", theme);
  localStorage.setItem("selectedTheme", theme);
}

function loadTheme() {
  const saved = localStorage.getItem("selectedTheme") || "light";
  applyTheme(saved);
  if (themeSelect) themeSelect.value = saved;
}

if (themeSelect) {
  themeSelect.addEventListener("change", e => {
    applyTheme(e.target.value);
  });
}

/* =========================
   Init
========================= */
window.addEventListener("DOMContentLoaded", () => {
  loadTable();
  loadTheme();

  document.getElementById("addRowButton") && document.getElementById("addRowButton").addEventListener("click", addRow);
  document.getElementById("addColumnButton") && document.getElementById("addColumnButton").addEventListener("click", addColumn);
  document.getElementById("removeRowButton") && document.getElementById("removeRowButton").addEventListener("click", startRemoveRow);
  document.getElementById("removeColumnButton") && document.getElementById("removeColumnButton").addEventListener("click", startRemoveColumn);

  // tab wiring
  plannerTab && plannerTab.addEventListener("click", showPlanner);
  calendarTab && calendarTab.addEventListener("click", showCalendar);
  notesTab && notesTab.addEventListener("click", showNotes);
  settingsTab && settingsTab.addEventListener("click", showSettings);
  aboutTab && aboutTab.addEventListener("click", showAbout);

  showPlanner();
  initCalendar();

  // init notes
  initNotes();
});

// Ensure delete popup is hidden on load
if (deleteConfirmPopup) deleteConfirmPopup.style.display = "none";
pageToDelete = null;

// Notes settings dropdown
const configButton = document.getElementById('configButton');
const notesConfigDropdown = document.querySelector('.notes-config-dropdown');

if (configButton && notesConfigDropdown) {
  configButton.addEventListener('click', e => {
    e.stopPropagation();
    notesConfigDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!notesConfigDropdown.contains(e.target)) {
      notesConfigDropdown.classList.remove('show');
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const notesEditor = document.getElementById('notesEditor');
  const fontSizeInput = document.getElementById('fontSize');
  const fontFamilySelect = document.getElementById('fontFamily');
  const lineHeightInput = document.getElementById('lineHeight');
  const textColorInput = document.getElementById('textColor');

  if (!notesEditor || !fontSizeInput || !fontFamilySelect || !lineHeightInput || !textColorInput) return;

  // Save editor settings
  function saveEditorSettings() {
    const settings = {
      fontSize: notesEditor.style.fontSize,
      fontFamily: notesEditor.style.fontFamily,
      lineHeight: notesEditor.style.lineHeight,
      color: notesEditor.style.color
    };
    localStorage.setItem('notesEditorSettings', JSON.stringify(settings));
  }

  // Apply settings live
  fontSizeInput.addEventListener('input', e => {
    notesEditor.style.fontSize = e.target.value + 'px';
    saveEditorSettings();
  });

  fontFamilySelect.addEventListener('change', e => {
    notesEditor.style.fontFamily = e.target.value;
    saveEditorSettings();
  });

  lineHeightInput.addEventListener('input', e => {
    notesEditor.style.lineHeight = e.target.value;
    saveEditorSettings();
  });

  textColorInput.addEventListener('input', e => {
    notesEditor.style.color = e.target.value;
    saveEditorSettings();
  });

  // Load saved editor settings
  function loadEditorSettings() {
    const settings = JSON.parse(localStorage.getItem('notesEditorSettings') || '{}');
    if (settings.fontSize) {
      notesEditor.style.fontSize = settings.fontSize;
      fontSizeInput.value = parseInt(settings.fontSize);
    }
    if (settings.fontFamily) {
      notesEditor.style.fontFamily = settings.fontFamily;
      fontFamilySelect.value = settings.fontFamily;
    }
    if (settings.lineHeight) {
      notesEditor.style.lineHeight = settings.lineHeight;
      lineHeightInput.value = parseFloat(settings.lineHeight);
    }
    if (settings.color) {
      notesEditor.style.color = settings.color;
      textColorInput.value = settings.color;
    }
  }

  loadEditorSettings();
});

