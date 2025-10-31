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

const GRID_SIZE = 20; // pixels

let currentTaskId = null;
let rowDeleteMode = false;
let columnDeleteMode = false;
let calendar;

// ===== Helpers =====
function showPopup(message, duration = 3000) {
  const popup = document.getElementById("popupMessage");
  if (!popup) return;
  popup.textContent = message;
  popup.classList.add('show');
  // remove/show using class so CSS transition can animate
  setTimeout(() => popup.classList.remove('show'), duration);
}

// Location / Timezone settings helpers
function getLocationSettings() {
  const defaults = { useDeviceLocation: true, lat: null, lon: null, timezone: 'auto' };
  try {
    const raw = localStorage.getItem('locationSettings') || '{}';
    const parsed = JSON.parse(raw);
    return Object.assign({}, defaults, parsed || {});
  } catch (e) {
    return defaults;
  }
}

function saveLocationSettings(partial) {
  try {
    const cur = getLocationSettings();
    const merged = Object.assign({}, cur, partial || {});
    localStorage.setItem('locationSettings', JSON.stringify(merged));
    // broadcast change so widgets can react
    try { document.dispatchEvent(new CustomEvent('locationSettingsChanged')); } catch (e) {}
  } catch (e) { /* ignore */ }
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
  taskPopup.className = "modal-popup small";
  taskPopup.innerHTML = `
    <button class="modal-top-close" aria-label="Close">&times;</button>
    <div class="modal-header">
      <div class="mh-icon"><i class="fa-solid fa-plus"></i></div>
      <h3>Add Task</h3>
    </div>
    <div class="fields-container modal-body">
      <div class="field"><strong>Title:</strong><input type="text" id="popupTaskTitle"></div>
      <div class="field"><strong>Start Date:</strong><input type="date" id="popupTaskStart"></div>
      <div class="field"><strong>End Date:</strong><input type="date" id="popupTaskEnd"></div>
      <div class="field">
        <strong>Time:</strong>
        <input type="time" id="popupTaskTime">
        <label style="margin-left:0.6rem"><input type="checkbox" id="popupAllDay"> All-day</label>
      </div>
      <div class="field"><strong>Remind me in:</strong>
        <select id="reminderTime">
          <option value="">No reminder</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="240">4 hours</option>
        </select>
      </div>
      <div class="field"><strong>Description:</strong><textarea id="popupTaskDesc"></textarea></div>
    </div>
    <div class="buttons-container modal-actions">
      <button id="popupCancel" class="btn-secondary">Cancel</button>
      <button id="popupAdd" class="btn-primary">Save</button>
    </div>
  `;
  document.body.appendChild(taskPopup);
  // wire the top-close for this dynamically created modal
  taskPopup.querySelector('.modal-top-close')?.addEventListener('click', () => taskPopup.style.display = 'none');
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
    // ensure times render with hour and minute (we'll normalize display in eventDidMount)
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', hour12: true },
    locale: 'en',
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
    ,
    eventDidMount: info => {
      try {
        const el = info.el;
        if (!el) return;
        const timeEl = el.querySelector('.fc-event-time');
        if (!timeEl) return;
        let txt = timeEl.textContent.trim();
        if (!txt) return;

        // Normalize text: remove whitespace, expand single-letter meridiem, lowercase am/pm, remove :00
        // Examples: '12a' -> '12am', '9p' -> '9pm', '12:00 AM' -> '12am', '9:30 PM' -> '9:30pm'
        txt = txt.replace(/\s+/g, ''); // remove spaces
        // If ends with single letter a/p, expand
        txt = txt.replace(/([ap])$/i, (m) => m.toLowerCase() === 'a' ? 'am' : 'pm');
        // Replace AM/PM with lowercase
        txt = txt.replace(/AM|PM/i, (m) => m.toLowerCase());
        // Remove :00 when followed by am/pm
        txt = txt.replace(/:00(?=am|pm)/, '');

        timeEl.textContent = txt;
      } catch (e) { /* ignore */ }
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

let pages = []; // array of {id,title,content,blocks,updated}  -- pages may be migrated to use blocks: [{id,type,html,meta}]
let activePageId = null;

/* persistence */
function savePages() {
  try {
    localStorage.setItem("notesPages", JSON.stringify(pages));
    localStorage.setItem("notesActiveId", activePageId || "");
    // notify listeners (widgets) that pages changed
    try { document.dispatchEvent(new CustomEvent('pagesUpdated')); } catch(e) {}
  } catch (e) {
    console.error("Failed to save pages:", e);
  }
}
function loadPages() {
  try {
    const p = JSON.parse(localStorage.getItem("notesPages") || "[]");
    pages = Array.isArray(p) ? p : [];
    // Migrate legacy pages that used `content` (string) into block model: pages[].blocks = [{id,type,html}]
    pages.forEach((pg, idx) => {
      // if blocks already present and valid, skip
      if (Array.isArray(pg.blocks)) return;
      // convert old `content` string into a single paragraph block
      if (typeof pg.content === 'string') {
        const bid = 'b' + (Date.now() + idx);
        pg.blocks = [{ id: bid, type: 'p', html: pg.content || '' }];
        // remove legacy content to avoid confusion
        try { delete pg.content; } catch (e) {}
      } else {
        pg.blocks = [];
      }
    });
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
    // Support block model: search title and combined block text (fall back to legacy content)
    const pageText = (Array.isArray(page.blocks) ? page.blocks.map(b => stripHtml(b.html || '')).join(' ') : (page.content || '')) || '';
    if (query && !((page.title||"").toLowerCase().includes(query) || pageText.toLowerCase().includes(query))) return;
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
  // Render blocks-based editor for the page
  noteTitleInput.value = page.title || "";
  notesEditor.innerHTML = "";
  // ensure page.blocks exists
  if (!Array.isArray(page.blocks)) page.blocks = [{ id: 'b' + Date.now(), type: 'p', html: '' }];
    page.blocks.forEach(block => {
    const div = document.createElement('div');
    div.className = 'note-block note-block-' + (block.type || 'p');
    div.setAttribute('contenteditable', 'true');
    div.dataset.blockId = block.id;
    div.innerHTML = block.html || '';

    // add drag handle
    const handle = document.createElement('div');
    handle.className = 'note-block-handle';
    handle.title = 'Drag to reorder';
    handle.innerHTML = '⠿';
    handle.style.display = 'inline-block';
    handle.style.width = '1.6rem';
    handle.style.marginRight = '0.5rem';
    handle.style.cursor = 'grab';
    div.prepend(handle);

    // input handler — update block html and schedule save
    div.addEventListener('input', (e) => {
      try {
        const pg = pages.find(p => p.id === activePageId);
        if (!pg) return;
        const b = pg.blocks.find(x => x.id === div.dataset.blockId);
        if (b) b.html = div.innerHTML;
        scheduleSave(800);
      } catch (err) { console.error(err); }
    });

    // key handling: Enter to split block, Backspace at start to merge with previous
    div.addEventListener('keydown', (e) => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // split current block at caret
        const rightHtml = splitBlockAtSelection(div) || '';
        const pg = pages.find(p => p.id === activePageId);
        if (!pg) return;
        const idx = pg.blocks.findIndex(x => x.id === div.dataset.blockId);
        const newBlock = { id: 'b' + Date.now(), type: 'p', html: rightHtml };
        pg.blocks.splice(idx + 1, 0, newBlock);
        // render new block DOM after this div
        const newDiv = document.createElement('div');
        newDiv.className = 'note-block note-block-p';
        newDiv.setAttribute('contenteditable', 'true');
        newDiv.dataset.blockId = newBlock.id;
        newDiv.innerHTML = newBlock.html || '';
        // add handle and listeners
        const newHandle = document.createElement('div');
        newHandle.className = 'note-block-handle';
        newHandle.title = 'Drag to reorder';
        newHandle.innerHTML = '⠿';
        newHandle.style.display = 'inline-block';
        newHandle.style.width = '1.6rem';
        newHandle.style.marginRight = '0.5rem';
        newHandle.style.cursor = 'grab';
        newDiv.prepend(newHandle);
        div.parentNode.insertBefore(newDiv, div.nextSibling);
        // wire listeners for the new block (reuse minimal handlers)
        newDiv.addEventListener('input', () => {
          const pg2 = pages.find(p => p.id === activePageId);
          if (!pg2) return;
          const b2 = pg2.blocks.find(x => x.id === newDiv.dataset.blockId);
          if (b2) b2.html = newDiv.innerHTML;
          scheduleSave(800);
        });
        newDiv.addEventListener('keydown', (ev) => {
          // small handler for merging/backspace will be covered by initial load logic
        });
        // enable DnD on both
        enableBlockDnD(div);
        enableBlockDnD(newDiv);
        // focus new block
        setTimeout(() => { placeCaretAtStart(newDiv); }, 20);
        scheduleSave(200);
      } else if (e.key === 'Backspace') {
        const range = sel.getRangeAt(0);
        if (range.startOffset === 0 && range.endOffset === 0) {
          const pg = pages.find(p => p.id === activePageId);
          if (!pg) return;
          const idx = pg.blocks.findIndex(x => x.id === div.dataset.blockId);
          if (idx > 0) {
            const prev = notesEditor.querySelector(`[data-block-id="${pg.blocks[idx-1].id}"]`);
            pg.blocks[idx-1].html = (pg.blocks[idx-1].html || '') + (div.innerHTML || '');
            pg.blocks.splice(idx,1);
            const toRemove = div;
            setTimeout(() => {
              if (prev) {
                prev.focus();
                placeCaretAtEnd(prev);
              }
              toRemove.remove();
              scheduleSave(200);
            }, 0);
            e.preventDefault();
          }
        }
      }
    });

    notesEditor.appendChild(div);
    // enable DnD
    enableBlockDnD(div);
  });
  lastSavedEl && (lastSavedEl.textContent = page.updated ? `Saved ${new Date(page.updated).toLocaleString()}` : "Unsaved");
  // Apply per-page editor settings (e.g., text color). Fall back to global settings.
  try {
    const global = JSON.parse(localStorage.getItem('notesEditorSettings') || '{}');
    const color = (page.editorSettings && page.editorSettings.color) || global.color || '';
    if (color) notesEditor.style.color = color;
    // keep the color input UI in sync
    const textColorInput = document.getElementById('textColor');
    if (textColorInput) textColorInput.value = (page.editorSettings && page.editorSettings.color) || global.color || '';
  } catch (e) {
    // ignore malformed global settings
  }
}

/* create a new page */
function createPage(title = "Untitled") {
  const id = "p" + Date.now();
  const page = { id, title, blocks: [{ id: 'b' + Date.now(), type: 'p', html: '' }], updated: new Date().toISOString() };
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
deleteConfirmPopup.className = "modal-popup small";
deleteConfirmPopup.innerHTML = `
  <button class="modal-top-close" aria-label="Close">&times;</button>
  <div class="popup-content">
    <p>Are you sure you want to delete this page?</p>
    <div class="popup-buttons modal-actions">
      <button id="confirmDeleteBtn" class="btn-danger">Delete</button>
      <button id="cancelDeleteBtn" class="btn-secondary">Cancel</button>
    </div>
  </div>
`;
document.body.appendChild(deleteConfirmPopup);
// wire top-close
deleteConfirmPopup.querySelector('.modal-top-close')?.addEventListener('click', () => deleteConfirmPopup.style.display = 'none');

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
    // page.blocks should already be kept in sync by block input handlers; just update timestamp
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
  // Export by concatenating block contents (fallback to legacy content)
  const body = Array.isArray(page.blocks) ? page.blocks.map(b => stripHtml(b.html || '')).join('\n\n') : (stripHtml(page.content || '') || '');
  const blob = new Blob([page.title + "\n\n" + body], { type: "text/plain;charset=utf-8" });
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

// --- Formatting helpers that operate on DOM instead of inserting markdown tokens ---
function surroundSelectionWithElement(tagName) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  // If selection is collapsed, insert an empty element and place caret inside
  if (range.collapsed) {
    const el = document.createElement(tagName);
    el.innerHTML = '&nbsp;';
    range.insertNode(el);
    // place caret inside the new element
    const newRange = document.createRange();
    newRange.setStart(el, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return;
  }

  // Extract selected contents, wrap with element, and re-insert
  const extracted = range.extractContents();
  const wrapper = document.createElement(tagName);
  wrapper.appendChild(extracted);
  range.insertNode(wrapper);

  // Move caret after the inserted wrapper
  const newRange = document.createRange();
  newRange.setStartAfter(wrapper);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function applyInlineFormat(tag) {
  try {
    // Use document.execCommand for reliable inline formatting when possible.
    // Map tag to execCommand name
    const cmd = tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : tag === 'u' ? 'underline' : null;
    const sel = window.getSelection();
    // If collapsed, try to select the previous word first
    if (sel.rangeCount && sel.getRangeAt(0).collapsed) {
      const wordRange = getWordRangeBeforeCaret();
      if (wordRange) {
        sel.removeAllRanges();
        sel.addRange(wordRange);
        if (cmd) {
          document.execCommand(cmd);
          // collapse caret after formatting
          const r = document.createRange();
          r.setStart(wordRange.endContainer, wordRange.endOffset);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
          return;
        } else {
          surroundRangeWithElement(wordRange, tag);
          return;
        }
      }
    }

    // If selection not collapsed or no word found, run execCommand on current selection
    if (cmd) {
      document.execCommand(cmd);
      // collapse caret to the end of selection
      if (sel.rangeCount) {
        const r = sel.getRangeAt(0).cloneRange();
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      return;
    }

    // Fallback to DOM wrapping if execCommand not applicable
    surroundSelectionWithElement(tag);
  } catch (e) {
    // fallback to document.execCommand for complex selections
    try { document.execCommand(tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : 'underline'); } catch (err) {}
  }
}

function getWordRangeBeforeCaret() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;

  // Helper: find the previous text node before (container, offset)
  function findPrevTextNode(container, offset) {
    // If container is a text node, use it
    if (container.nodeType === 3) return { node: container, offset };

    // Look into child nodes before offset
    for (let i = offset - 1; i >= 0; i--) {
      let child = container.childNodes[i];
      // descend to the deepest last text node
      while (child && child.nodeType !== 3 && child.lastChild) child = child.lastChild;
      if (child && child.nodeType === 3) return { node: child, offset: child.textContent.length };
    }

    // Move up to parent and repeat
    let parent = container.parentNode;
    let node = container;
    while (parent) {
      const idx = Array.prototype.indexOf.call(parent.childNodes, node);
      for (let i = idx - 1; i >= 0; i--) {
        let sibling = parent.childNodes[i];
        while (sibling && sibling.nodeType !== 3 && sibling.lastChild) sibling = sibling.lastChild;
        if (sibling && sibling.nodeType === 3) return { node: sibling, offset: sibling.textContent.length };
      }
      node = parent;
      parent = parent.parentNode;
    }
    return null;
  }

  const found = findPrevTextNode(range.startContainer, range.startOffset);
  if (!found) return null;
  const node = found.node;
  const offset = found.offset;

  const text = node.textContent.slice(0, offset);
  const m = text.match(/(\S+)$/);
  if (!m) return null;
  const wordStart = offset - m[1].length;
  const r = document.createRange();
  r.setStart(node, wordStart);
  r.setEnd(node, offset);
  return r;
}

function surroundRangeWithElement(range, tagName) {
  const extracted = range.extractContents();
  const wrapper = document.createElement(tagName);
  wrapper.appendChild(extracted);
  range.insertNode(wrapper);
  // place caret after wrapper
  const sel = window.getSelection();
  const newRange = document.createRange();
  newRange.setStartAfter(wrapper);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function applyBlockFormat(tag) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  let node = sel.anchorNode;
  // find nearest block-level node inside notesEditor
  while (node && node !== notesEditor && node.nodeType !== 1) node = node.parentNode;
  if (!node || node === notesEditor) {
    // insert a new block element at caret
    const range = sel.getRangeAt(0);
    const el = document.createElement(tag);
    el.innerHTML = '<br>';
    range.insertNode(el);
    const r = document.createRange();
    r.setStart(el, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return;
  }

  // replace the current line/node with the block element
  const block = document.createElement(tag);
  block.innerHTML = node.innerHTML || node.textContent || '';
  node.parentNode.replaceChild(block, node);

  // place caret at end
  const r2 = document.createRange();
  r2.selectNodeContents(block);
  r2.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r2);
}

/* ===== Block editor helpers ===== */
function getBlockElementFromSelection() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  let node = sel.anchorNode;
  while (node && node !== notesEditor && node.nodeType !== 1) node = node.parentNode;
  if (!node || node === notesEditor) return null;
  // climb until direct child of notesEditor (a block)
  while (node && node.parentNode && node.parentNode !== notesEditor) node = node.parentNode;
  return node && node.parentNode === notesEditor ? node : null;
}

function changeBlockType(blockId, newType) {
  const page = pages.find(p => p.id === activePageId);
  if (!page) return;
  const blk = page.blocks.find(b => b.id === blockId);
  if (!blk) return;
  blk.type = newType;
  // update DOM if present
  const el = notesEditor.querySelector(`[data-block-id="${blockId}"]`);
  if (el) {
    el.className = 'note-block note-block-' + newType;
    // keep html as-is; some types like code may wrap in <code> later via formatting commands
  }
  scheduleSave(200);
}

function splitBlockAtSelection(blockEl) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  // ensure selection is inside blockEl
  if (!blockEl.contains(range.startContainer)) return null;

  // Create a range that spans from caret to the end of blockEl
  const endRange = document.createRange();
  endRange.setStart(range.endContainer, range.endOffset);
  endRange.setEndAfter(blockEl);
  // Extract the contents after the caret
  const extracted = endRange.extractContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(extracted);
  const rightHtml = wrapper.innerHTML;

  // left side remains in blockEl (because we extracted the rest)
  return rightHtml;
}

function placeCaretAtStart(el) {
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(true);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

function placeCaretAtEnd(el) {
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

/* Drag & drop reorder for blocks */
function enableBlockDnD(blockEl) {
  const handle = blockEl.querySelector('.note-block-handle');
  if (!handle) return;
  handle.setAttribute('draggable', 'true');
  handle.addEventListener('dragstart', (ev) => {
    ev.dataTransfer.setData('text/plain', blockEl.dataset.blockId);
    ev.dataTransfer.effectAllowed = 'move';
    blockEl.classList.add('dragging');
  });
  handle.addEventListener('dragend', (ev) => {
    blockEl.classList.remove('dragging');
  });
  blockEl.addEventListener('dragover', (ev) => {
    ev.preventDefault();
  });
  blockEl.addEventListener('drop', (ev) => {
    ev.preventDefault();
    const srcId = ev.dataTransfer.getData('text/plain');
    const tgtId = blockEl.dataset.blockId;
    if (!srcId || srcId === tgtId) return;
    const pg = pages.find(p => p.id === activePageId);
    if (!pg) return;
    const srcIdx = pg.blocks.findIndex(b => b.id === srcId);
    const tgtIdx = pg.blocks.findIndex(b => b.id === tgtId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moving] = pg.blocks.splice(srcIdx,1);
    // insert before target
    const insertAt = srcIdx < tgtIdx ? tgtIdx : tgtIdx;
    pg.blocks.splice(insertAt,0,moving);
    // reorder DOM
    const srcEl = notesEditor.querySelector(`[data-block-id="${srcId}"]`);
    const tgtEl = blockEl;
    if (srcEl && tgtEl) {
      notesEditor.insertBefore(srcEl, tgtEl);
    }
    scheduleSave(200);
  });
}

const commands = [
  { name: 'Insert Date', action: () => insertAtCursor(new Date().toLocaleDateString()) },
  { name: 'Insert Time', action: () => insertAtCursor(new Date().toLocaleTimeString()) },
  { name: 'Bold', action: () => applyInlineFormat('strong') },
  { name: 'Italic', action: () => applyInlineFormat('em') },
  { name: 'Underline', action: () => applyInlineFormat('u') },
  { name: 'Heading 1', action: () => {
      const el = getBlockElementFromSelection(); if (!el) return; changeBlockType(el.dataset.blockId, 'h1'); }, },
  { name: 'Heading 2', action: () => { const el = getBlockElementFromSelection(); if (!el) return; changeBlockType(el.dataset.blockId, 'h2'); }, },
  { name: 'Heading 3', action: () => { const el = getBlockElementFromSelection(); if (!el) return; changeBlockType(el.dataset.blockId, 'h3'); }, },
  { name: 'Code block', action: () => { const el = getBlockElementFromSelection(); if (!el) return; changeBlockType(el.dataset.blockId, 'code'); }, },
  { name: 'Toggle To-do', action: () => { const el = getBlockElementFromSelection(); if (!el) return; changeBlockType(el.dataset.blockId, 'todo'); }, },
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
  console.debug('[cmd] showCommandPopup', { x, y });
  commandPopup.style.left = x + 'px';
  commandPopup.style.top = y + 'px';
  // reset filter and selection when opening
  filteredCommands = [...commands];
  selectedIndex = 0;
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
  console.debug('[cmd] renderCommands - filteredCommands count', filteredCommands && filteredCommands.length);
    if (!filteredCommands || filteredCommands.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No commands';
    empty.style.padding = '0.4rem 0.6rem';
    commandPopup.appendChild(empty);
    selectedIndex = 0;
    return;
  }

  // ensure selectedIndex is within bounds
  if (selectedIndex < 0) selectedIndex = 0;
  if (selectedIndex > filteredCommands.length - 1) selectedIndex = filteredCommands.length - 1;

  filteredCommands.forEach((cmd, i) => {
    const div = document.createElement('div');
    div.textContent = cmd.name;
    div.style.padding = '0.3rem 0.5rem';
    div.style.cursor = 'pointer';
    if (i === selectedIndex) div.style.background = 'var(--primary)';
    div.addEventListener('click', () => {
      console.debug('[cmd] click', cmd && cmd.name);
      try {
        // remove the typed '/command' trigger before executing action
        try { removeCommandTrigger(); } catch (e) { console.error('removeCommandTrigger failed', e); }
        // execute the command safely
        if (cmd && typeof cmd.action === 'function') {
          console.debug('[cmd] executing action for', cmd.name);
          cmd.action();
          console.debug('[cmd] executed action for', cmd.name);
        } else {
          console.warn('[cmd] no action function', cmd);
        }
      } catch (err) {
        console.error('command action error', err);
      } finally {
        hideCommandPopup();
      }
    });
    commandPopup.appendChild(div);
  });
}

if (notesEditor) notesEditor.addEventListener('keydown', (e) => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  if (commandPopup.style.display === 'block') {
    if (e.key === 'ArrowDown') {
      if (filteredCommands && filteredCommands.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        renderCommands();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (filteredCommands && filteredCommands.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        renderCommands();
      }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      console.debug('[cmd] keydown Enter selectedIndex', selectedIndex, 'filtered len', filteredCommands && filteredCommands.length);
      try {
        try { removeCommandTrigger(); } catch (e) { console.error('removeCommandTrigger failed', e); }
        const cmd = (filteredCommands && filteredCommands[selectedIndex]) || null;
        if (cmd && typeof cmd.action === 'function') {
          console.debug('[cmd] executing (Enter) ', cmd.name);
          cmd.action();
          console.debug('[cmd] executed (Enter) ', cmd.name);
        } else {
          console.warn('[cmd] no command to execute on Enter', cmd);
        }
      } catch (err) {
        console.error('execute command failed', err);
      } finally {
        hideCommandPopup();
      }
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
/* end if(notesEditor) guard */

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

function removeCommandTrigger() {
  try {
    console.debug('[cmd] removeCommandTrigger start');
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
  // Build a string of the text immediately before the caret by finding the previous text node
  function findPrevTextNode(container, offset) {
    if (container.nodeType === 3) return { node: container, offset };
    for (let i = offset - 1; i >= 0; i--) {
      let child = container.childNodes[i];
      while (child && child.nodeType !== 3 && child.lastChild) child = child.lastChild;
      if (child && child.nodeType === 3) return { node: child, offset: child.textContent.length };
    }
    let parent = container.parentNode;
    let node = container;
    while (parent) {
      const idx = Array.prototype.indexOf.call(parent.childNodes, node);
      for (let i = idx - 1; i >= 0; i--) {
        let sibling = parent.childNodes[i];
        while (sibling && sibling.nodeType !== 3 && sibling.lastChild) sibling = sibling.lastChild;
        if (sibling && sibling.nodeType === 3) return { node: sibling, offset: sibling.textContent.length };
      }
      node = parent;
      parent = parent.parentNode;
    }
    return null;
  }

    const found = findPrevTextNode(range.startContainer, range.startOffset);
    if (!found) return;
    const node = found.node;
    const offset = found.offset;

    const text = node.textContent || '';
    // remove the trailing '/word' (slash plus word chars) just before caret
    const m = text.slice(0, offset).match(/\/(\w*)$/);
    if (m) {
      console.debug('[cmd] removeCommandTrigger matched', m[0]);
      const lastSlash = offset - m[0].length;
      const before = text.slice(0, lastSlash);
      const after = text.slice(offset);
      node.textContent = before + after;
      const r = document.createRange();
      r.setStart(node, before.length);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      console.debug('[cmd] removeCommandTrigger removed, new text segment', before.slice(-40));
    }
  } catch (e) {
    console.error('removeCommandTrigger error', e);
  }
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
  // Load table and theme
  loadTable();
  loadTheme();

/* =========================
   Widgets
========================= */
const GRID_SIZE = 20;
let widgetsData = []; // stores widgets info

// ===== Helpers =====
function saveWidgets() {
  localStorage.setItem("widgets", JSON.stringify(widgetsData));
}

function loadWidgets() {
  const saved = JSON.parse(localStorage.getItem("widgets") || "[]");
  saved.forEach(data => {
    addWidgetFromPreset(data.preset, true, data);
  });
}

// ===== Drag & Resize =====
function makeWidgetDraggableAndResizable(widget, dataIndex) {
  const header = widget.querySelector(".widget-header");
  let isDragging = false, offsetX = 0, offsetY = 0;
  // mouse drag
  header.addEventListener("mousedown", e => {
    isDragging = true;
    offsetX = e.clientX - widget.offsetLeft;
    offsetY = e.clientY - widget.offsetTop;
    widget.style.zIndex = 1000;
    e.preventDefault();
  });

  // touch drag
  header.addEventListener('touchstart', e => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    isDragging = true;
    offsetX = t.clientX - widget.offsetLeft;
    offsetY = t.clientY - widget.offsetTop;
    widget.style.zIndex = 1000;
    // prevent scrolling while dragging
    e.preventDefault();
  }, { passive: false });

  function handleDragMove(clientX, clientY) {
    let left = Math.round((clientX - offsetX) / GRID_SIZE) * GRID_SIZE;
    let top = Math.round((clientY - offsetY) / GRID_SIZE) * GRID_SIZE;
    const container = widget.parentElement || document.getElementById('dashboard');
    const maxLeft = Math.max(0, (container.clientWidth - widget.offsetWidth));
    const maxTop = Math.max(0, (container.clientHeight - widget.offsetHeight));
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left > maxLeft) left = maxLeft;
    if (top > maxTop) top = maxTop;
    widget.style.left = left + "px";
    widget.style.top = top + "px";
    if (dataIndex != null) {
      widgetsData[dataIndex].left = left;
      widgetsData[dataIndex].top = top;
      saveWidgets();
    }
  }

  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    handleDragMove(e.clientX, e.clientY);
  });

  document.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    handleDragMove(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    widget.style.zIndex = "";
  });

  document.addEventListener('touchend', () => {
    isDragging = false;
    widget.style.zIndex = "";
  });

  const handle = document.createElement("div");
  handle.classList.add("resize-handle");
  widget.appendChild(handle);

  let isResizing = false, startX, startY, startW, startH;

  handle.addEventListener("mousedown", e => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = widget.offsetWidth;
    startH = widget.offsetHeight;
  });

  // touch start for resize
  handle.addEventListener('touchstart', e => {
    e.stopPropagation();
    const t = e.touches && e.touches[0];
    if (!t) return;
    isResizing = true;
    startX = t.clientX;
    startY = t.clientY;
    startW = widget.offsetWidth;
    startH = widget.offsetHeight;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("mousemove", e => {
    if (!isResizing) return;
    let newW = Math.round((startW + (e.clientX - startX)) / GRID_SIZE) * GRID_SIZE;
    let newH = Math.round((startH + (e.clientY - startY)) / GRID_SIZE) * GRID_SIZE;

    // enforce min sizes defined on element
    const minW = parseInt(widget.style.minWidth) || 160;
    const minH = parseInt(widget.style.minHeight) || 120;
    if (newW < minW) newW = minW;
    if (newH < minH) newH = minH;

    // clamp to container so resize can't push outside
    const container = widget.parentElement || document.getElementById('dashboard');
    const maxW = Math.max(0, container.clientWidth - widget.offsetLeft);
    const maxH = Math.max(0, container.clientHeight - widget.offsetTop);
    if (newW > maxW) newW = maxW;
    if (newH > maxH) newH = maxH;

    widget.style.width = newW + "px";
    widget.style.height = newH + "px";

    if (dataIndex != null) {
      widgetsData[dataIndex].width = newW;
      widgetsData[dataIndex].height = newH;
      saveWidgets();
    }
  });

  // touch move for resize
  document.addEventListener('touchmove', e => {
    if (!isResizing) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    let newW = Math.round((startW + (t.clientX - startX)) / GRID_SIZE) * GRID_SIZE;
    let newH = Math.round((startH + (t.clientY - startY)) / GRID_SIZE) * GRID_SIZE;

    const minW = parseInt(widget.style.minWidth) || 160;
    const minH = parseInt(widget.style.minHeight) || 120;
    if (newW < minW) newW = minW;
    if (newH < minH) newH = minH;

    const container = widget.parentElement || document.getElementById('dashboard');
    const maxW = Math.max(0, container.clientWidth - widget.offsetLeft);
    const maxH = Math.max(0, container.clientHeight - widget.offsetTop);
    if (newW > maxW) newW = maxW;
    if (newH > maxH) newH = maxH;

    widget.style.width = newW + "px";
    widget.style.height = newH + "px";

    if (dataIndex != null) {
      widgetsData[dataIndex].width = newW;
      widgetsData[dataIndex].height = newH;
      saveWidgets();
    }
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("mouseup", () => { isResizing = false; });
  document.addEventListener('touchend', () => { isResizing = false; });
}

// Clamp a single widget's position and size so it fits inside the dashboard container
function clampWidgetToContainer(widget) {
  try {
    const container = widget.parentElement || document.getElementById('dashboard');
    if (!container) return;
    // ensure width/height are numbers
    let width = widget.offsetWidth;
    let height = widget.offsetHeight;
    let left = parseInt(widget.style.left) || widget.offsetLeft || 0;
    let top = parseInt(widget.style.top) || widget.offsetTop || 0;

    // max allowed by container
    const maxW = Math.max(0, container.clientWidth - left - 8); // allow small padding
    const maxH = Math.max(0, container.clientHeight - top - 8);

    // enforce max and min
    const minW = parseInt(widget.style.minWidth) || 160;
    const minH = parseInt(widget.style.minHeight) || 120;

    if (width > maxW) width = Math.max(minW, maxW);
    if (height > maxH) height = Math.max(minH, maxH);

    // adjust left/top if overflow
    const maxLeft = Math.max(0, container.clientWidth - width);
    const maxTop = Math.max(0, container.clientHeight - height);
    if (left > maxLeft) left = maxLeft;
    if (top > maxTop) top = maxTop;

    widget.style.width = width + 'px';
    widget.style.height = height + 'px';
    widget.style.left = left + 'px';
    widget.style.top = top + 'px';

    // update widgetsData if present
    const idx = widget.dataset.index != null ? parseInt(widget.dataset.index) : null;
    if (idx != null && widgetsData[idx]) {
      widgetsData[idx].left = left; widgetsData[idx].top = top;
      widgetsData[idx].width = width; widgetsData[idx].height = height;
      saveWidgets();
    }
  } catch (e) { console.warn('clampWidget failed', e); }
}

function clampAllWidgets() {
  document.querySelectorAll('#dashboard .widget').forEach(w => clampWidgetToContainer(w));
}

// ===== Create Widget =====
function addWidget(title, content, preset = "blank", savedData = null, isLoaded = false) {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  const widget = document.createElement("div");
  widget.classList.add("widget");
  widget.style.position = "absolute";
  // sensible defaults per preset so widgets fit their content better on creation
  const presetDefaults = {
    blank: { w: 200, h: 150, minW: 160, minH: 120 },
    weather: { w: 420, h: 240, minW: 360, minH: 200 },
    clock: { w: 220, h: 220, minW: 180, minH: 160 },
    calendar: { w: 420, h: 300, minW: 320, minH: 240 },
    reminders: { w: 240, h: 180, minW: 220, minH: 160 },
    recentNotes: { w: 260, h: 180, minW: 220, minH: 140 }
  };

  const def = presetDefaults[preset] || presetDefaults.blank;
  widget.style.width = (savedData?.width || def.w) + "px";
  widget.style.height = (savedData?.height || def.h) + "px";
  widget.style.top = (savedData?.top || 0) + "px";
  widget.style.left = (savedData?.left || 0) + "px";

  // Per-preset minimum sizes (user requested weather large, clock small, etc.)
  // Start with reasonable minima; allow per-preset overrides below
  let minW = 160, minH = 120;
  if (preset === 'weather') { minW = 360; minH = 200; }
  else if (preset === 'clock') { minW = 180; minH = 160; }
  else if (preset === 'calendar') { minW = 320; minH = 240; }
  else if (preset === 'reminders') { minW = 220; minH = 160; }
  // apply minimums to element and ensure initial size respects them
  widget.style.minWidth = minW + 'px';
  widget.style.minHeight = minH + 'px';
  // adjust starting width/height if below minimum
  const curW = parseInt(widget.style.width) || 0;
  const curH = parseInt(widget.style.height) || 0;
  if (curW < minW) widget.style.width = minW + 'px';
  if (curH < minH) widget.style.height = minH + 'px';

  // Widget colors should be controlled by CSS/theme classes; avoid inline color overrides here.

  // Header
  const header = document.createElement("div");
  header.classList.add("widget-header");
  header.textContent = title;

  // Header styling handled via CSS; avoid inline overrides so theme classes can apply

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.title = "Delete Widget";
  deleteBtn.style.float = "right";
  deleteBtn.addEventListener("click", () => {
    dashboard.removeChild(widget);
    if (widget.dataset.index != null) {
      widgetsData.splice(widget.dataset.index, 1);
      saveWidgets();
      reloadWidgetIndices();
    }
  });

  header.appendChild(deleteBtn);
  widget.appendChild(header);

  // Apply widget-only theme class (read user preference)
  try {
    const widgetsTheme = localStorage.getItem('widgetsTheme') || 'inherit';
    if (widgetsTheme === 'dark') widget.classList.add('widget-theme-dark');
    else if (widgetsTheme === 'light') widget.classList.add('widget-theme-light');
    // if 'inherit', do nothing; widgets will follow CSS variables
  } catch (e) { /* ignore */ }

  // Body
  const body = document.createElement("div");
  body.classList.add("widget-body");
  body.innerHTML = content;
  widget.appendChild(body);

  dashboard.appendChild(widget);

  // ensure widget doesn't start outside bounds
  try { clampWidgetToContainer(widget); } catch (e) {}

  // Save widget only if new
  let dataIndex = widgetsData.length;
  widget.dataset.index = dataIndex;

  if (!isLoaded) {
    widgetsData.push({
      title,
      content,
      preset,
      top: parseInt(widget.style.top),
      left: parseInt(widget.style.left),
      width: parseInt(widget.style.width),
      height: parseInt(widget.style.height)
    });
    saveWidgets();
  } else {
    widgetsData.push({
      title,
      content,
      preset,
      top: parseInt(widget.style.top),
      left: parseInt(widget.style.left),
      width: parseInt(widget.style.width),
      height: parseInt(widget.style.height)
    });
  }

  makeWidgetDraggableAndResizable(widget, dataIndex);

  if (preset === "clock") {
    // Initialize analog + digital clock inside widget
    const analog = widget.querySelector('.analog-clock');
    const digital = widget.querySelector('.digital-clock');
    function updateAnalogAndDigital() {
      try {
        const loc = getLocationSettings();
        const tz = loc.timezone && loc.timezone !== 'auto' ? loc.timezone : null;
        let hr = 0, min = 0, sec = 0;

        if (tz) {
          // use Intl to obtain hour/min/sec in the desired timezone
          const parts = new Intl.DateTimeFormat('en-US', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: tz }).formatToParts(new Date());
          parts.forEach(p => {
            if (p.type === 'hour') hr = parseInt(p.value);
            if (p.type === 'minute') min = parseInt(p.value);
            if (p.type === 'second') sec = parseInt(p.value);
          });
        } else {
          const now = new Date();
          hr = now.getHours();
          min = now.getMinutes();
          sec = now.getSeconds();
        }

        const secDeg = (sec / 60) * 360;
        const minDeg = (min / 60) * 360 + (sec / 60) * 6;
        const hrDeg = ((hr % 12) / 12) * 360 + (min / 60) * 30;

        if (analog) {
          const hourHand = analog.querySelector('.hand.hour');
          const minHand = analog.querySelector('.hand.minute');
          const secHand = analog.querySelector('.hand.second');
          if (hourHand) hourHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${hrDeg}deg)`;
          if (minHand) minHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${minDeg}deg)`;
          if (secHand) secHand.style.transform = `translateX(-50%) translateY(-100%) rotate(${secDeg}deg)`;
        }

        if (digital) {
          if (tz) digital.textContent = new Date().toLocaleTimeString([], { timeZone: tz });
          else digital.textContent = new Date().toLocaleTimeString();
        }
      } catch (e) {
        console.warn('clock update failed', e);
      }
    }
    updateAnalogAndDigital();
    // update once per second
    setInterval(updateAnalogAndDigital, 1000);
    // respond to settings changes
    document.addEventListener('locationSettingsChanged', updateAnalogAndDigital);
  }

  if (preset === "calendar") {
    const calendarEl = widget.querySelector('.mini-calendar');

    function buildCalendar(year, month) {
      // month: 0-11
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const startDay = first.getDay(); // 0-6 (Sun-Sat)
      const daysInMonth = last.getDate();

      const today = new Date();
      const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

      let html = '';
      html += `<div class="mc-header"><button class='nav-btn prev'>&lt;</button><div class='mc-title'>${first.toLocaleString('default',{month:'long'})} ${year}</div><button class='nav-btn next'>&gt;</button></div>`;
      html += '<table><thead><tr>';
      const daysShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      for (let d of daysShort) html += `<th>${d}</th>`;
      html += '</tr></thead><tbody>';

      let day = 1 - startDay;
      for (let wk = 0; wk < 6; wk++) {
        html += '<tr>';
        for (let dow = 0; dow < 7; dow++) {
          if (day < 1 || day > daysInMonth) {
            html += `<td class='empty'></td>`;
          } else {
            const cls = (isThisMonth && day === today.getDate()) ? 'today' : '';
            html += `<td class='${cls}'>${day}</td>`;
          }
          day++;
        }
        html += '</tr>';
        if (day > daysInMonth) break;
      }
      html += '</tbody></table>';
      calendarEl.innerHTML = html;

      // wire navigation
      const prev = calendarEl.querySelector('.nav-btn.prev');
      const next = calendarEl.querySelector('.nav-btn.next');
      if (prev) prev.addEventListener('click', () => {
        const m = month - 1;
        const y = m < 0 ? year -1 : year;
        const mm = (m + 12) % 12;
        buildCalendar(y, mm);
      });
      if (next) next.addEventListener('click', () => {
        const m = month + 1;
        const y = m > 11 ? year +1 : year;
        const mm = m % 12;
        buildCalendar(y, mm);
      });
    }

    if (calendarEl) {
      const now = new Date();
      buildCalendar(now.getFullYear(), now.getMonth());
    }
  }

  if (preset === "weather") {
    const weatherMain = widget.querySelector('.weather-main');
    const weatherDesc = widget.querySelector('.weather-desc');

    function codeToText(code) {
      // rough mapping from Open-Meteo weathercode
      const map = {
        0: 'Clear',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Rain',
        65: 'Heavy rain',
        66: 'Freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow',
        73: 'Snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Moderate showers',
        82: 'Violent showers',
        95: 'Thunderstorm',
        99: 'Hail'
      };
      return map[code] || 'Unknown';
    }

    function codeToIcon(code) {
      // return an emoji icon for simple UI (FontAwesome is available but emoji is portable)
      const icons = {
        0: '☀️',
        1: '🌤️',
        2: '⛅',
        3: '☁️',
        45: '🌫️',
        48: '🌫️',
        51: '🌦️',
        53: '🌧️',
        55: '🌧️',
        56: '🌧️',
        57: '🌧️',
        61: '🌧️',
        63: '🌧️',
        65: '🌧️',
        66: '🌧️',
        67: '🌧️',
        71: '🌨️',
        73: '🌨️',
        75: '🌨️',
        80: '🌦️',
        81: '🌧️',
        82: '⛈️',
        95: '⛈️',
        99: '🧊'
      };
      return icons[code] || 'ℹ️';
    }

    function fetchWeather(lat, lon, tz) {
      // Request current weather, hourly humidity+precip probability and daily summary for forecast
      const tzParam = tz && tz !== 'auto' ? `&timezone=${encodeURIComponent(tz)}` : '&timezone=auto';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset${tzParam}`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (!data || !data.current_weather) {
            if (weatherDesc) weatherDesc.textContent = 'Weather unavailable';
            return;
          }

          const cw = data.current_weather;
          const temp = Math.round(cw.temperature);
          const code = cw.weathercode;

          // icon and descriptions
          const icon = codeToIcon(code);
          if (widget.querySelector('.weather-icon')) widget.querySelector('.weather-icon').textContent = icon;
          if (weatherMain) weatherMain.textContent = `${temp}°C`;
          if (weatherDesc) weatherDesc.textContent = codeToText(code);

          // humidity & precip from hourly arrays (pick current hour)
          try {
            const now = new Date();
            const times = (data.hourly && data.hourly.time) || [];
            const humidArr = (data.hourly && data.hourly.relativehumidity_2m) || [];
            const precipArr = (data.hourly && data.hourly.precipitation_probability) || [];

            let idx = -1;
            if (times && times.length) {
              const hourKey = now.toISOString().slice(0, 13);
              for (let i = 0; i < times.length; i++) {
                const t = times[i];
                if (!t) continue;
                if (t.slice(0, 13) === hourKey) { idx = i; break; }
              }
              if (idx === -1) {
                for (let i = times.length - 1; i >= 0; i--) {
                  const t = new Date(times[i]);
                  if (t <= now) { idx = i; break; }
                }
              }
            }

            const hum = (idx >= 0 && humidArr[idx] != null) ? Math.round(humidArr[idx]) : null;
            const precipProb = (idx >= 0 && precipArr[idx] != null) ? Math.round(precipArr[idx]) : null;

            const humEl = widget.querySelector('.weather-humidity');
            const precipEl = widget.querySelector('.weather-precip');
            const windEl = widget.querySelector('.weather-wind');
            const sunEl = widget.querySelector('.weather-sun');

            if (humEl) humEl.textContent = hum != null ? `Humidity: ${hum}%` : '';
            if (precipEl) precipEl.textContent = precipProb != null ? `Precip: ${precipProb}%` : '';
            if (windEl) {
              const wind = cw.windspeed != null ? Math.round(cw.windspeed) : null;
              const dir = cw.winddirection != null ? `${Math.round(cw.winddirection)}°` : '';
              windEl.textContent = wind != null ? `Wind: ${wind} m/s ${dir}` : '';
            }

            // sunrise/sunset from daily (first item)
            if (data.daily && data.daily.sunrise && data.daily.sunset) {
              try {
                const sr = data.daily.sunrise[0];
                const ss = data.daily.sunset[0];
                // show only time part
                const srT = sr ? new Date(sr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const ssT = ss ? new Date(ss).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                if (sunEl) sunEl.textContent = srT && ssT ? `☀ ${srT} ↘ ${ssT}` : '';
              } catch (err) { /* ignore */ }
            }

            // build a small 3-day forecast if daily data exists
            const fcEl = widget.querySelector('.weather-forecast');
            if (fcEl && data.daily && data.daily.time) {
              try {
                fcEl.innerHTML = '';
                const timesD = data.daily.time || [];
                const tmax = data.daily.temperature_2m_max || [];
                const tmin = data.daily.temperature_2m_min || [];
                const pprob = data.daily.precipitation_probability_max || [];
                const days = Math.min(3, timesD.length - 1); // skip day 0 (today) or include today; we'll include next 3 days starting at 0
                const start = 0; // include today
                const count = Math.min(3, timesD.length - start);
                for (let i = start; i < start + count; i++) {
                  const d = timesD[i];
                  const date = new Date(d);
                  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
                  const ic = codeToIcon((Array.isArray(data.daily.weathercode) && data.daily.weathercode[i] != null) ? data.daily.weathercode[i] : code);
                  const max = tmax[i] != null ? Math.round(tmax[i]) : '-';
                  const min = tmin[i] != null ? Math.round(tmin[i]) : '-';
                  const pp = pprob[i] != null ? `${Math.round(pprob[i])}%` : '';
                  const card = document.createElement('div');
                  card.style.display = 'flex';
                  card.style.flexDirection = 'column';
                  card.style.alignItems = 'center';
                  card.style.fontSize = '0.8rem';
                  card.style.padding = '0.15rem 0.4rem';
                  card.style.borderRadius = '0.35rem';
                  card.style.background = 'transparent';
                  card.innerHTML = `<div style="font-weight:700">${weekday}</div><div style='font-size:1rem'>${ic}</div><div style='font-size:0.8rem'>${max}°/${min}°</div><div style='font-size:0.75rem'>${pp}</div>`;
                  fcEl.appendChild(card);
                }
              } catch (err) {
                console.warn('forecast build failed', err);
              }
            }

          } catch (err) {
            console.warn('weather parse error', err);
          }
        })
        .catch(err => {
          if (weatherDesc) weatherDesc.textContent = 'Weather unavailable';
          console.error('weather fetch error', err);
        });
    }

    function updateWeather() {
      const loc = getLocationSettings();
      const tz = loc.timezone || 'auto';
      // If user allows device location, try geolocation, otherwise use overrides or fallback
      if (loc.useDeviceLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude, tz);
        }, err => {
          // fall back to overrides or default (London)
          if (loc.lat != null && loc.lon != null) fetchWeather(loc.lat, loc.lon, tz);
          else fetchWeather(51.5074, -0.1278, tz);
        }, { timeout: 5000 });
      } else {
        if (loc.lat != null && loc.lon != null) fetchWeather(loc.lat, loc.lon, tz);
        else fetchWeather(51.5074, -0.1278, tz);
      }
    }

    updateWeather();
    // refresh every 10 minutes
    setInterval(updateWeather, 10 * 60 * 1000);
    // respond to settings changes
    document.addEventListener('locationSettingsChanged', updateWeather);
  }

    // Ensure widgets clamp when window is resized (prevent overflow)
    window.addEventListener('resize', () => {
      // throttle with requestAnimationFrame
      window.requestAnimationFrame(() => clampAllWidgets());
    });

  if (preset === "recentNotes") {
    // populate recent notes list (most recently updated first)
    const listWrap = document.createElement('div');
    listWrap.className = 'recent-notes-list';
    body.innerHTML = '';
    body.appendChild(listWrap);

    function renderRecent() {
      listWrap.innerHTML = '';
      try {
        const recentPages = (pages || []).slice().sort((a,b)=> (b.updated||0) > (a.updated||0) ? 1 : -1).slice(0,3);
        if (!recentPages.length) {
          const none = document.createElement('div');
          none.className = 'recent-empty';
          none.textContent = 'No pages yet';
          listWrap.appendChild(none);
          return;
        }

        recentPages.forEach(p => {
          const row = document.createElement('button');
          row.className = 'recent-note-item';
          const title = document.createElement('div');
          title.className = 'rni-title';
          title.textContent = p.title || 'Untitled';
          const sub = document.createElement('div');
          sub.className = 'rni-sub';
          const dt = p.updated ? new Date(p.updated).toLocaleString() : '';
          sub.textContent = dt;
          row.appendChild(title);
          row.appendChild(sub);
          row.addEventListener('click', () => {
            // open that page in Notes view
            setActivePage(p.id);
            showNotes();
            // give focus to editor briefly
            setTimeout(() => document.getElementById('notesEditor')?.focus?.(), 120);
          });
          listWrap.appendChild(row);
        });
      } catch (e) {
        console.error('renderRecent error', e);
      }
    }

    renderRecent();
    // refresh when pages change elsewhere
    document.addEventListener('pagesUpdated', renderRecent);
    // expose refresh in case other code wants to call it
    widget.refreshRecentNotes = renderRecent;
  }

  if (preset === "quotes") {
    // Daily quote: cached per-day in localStorage to avoid too many API calls.
    const quoteWrap = document.createElement('div');
    quoteWrap.className = 'quote-widget';
    body.innerHTML = '';
    body.appendChild(quoteWrap);

    const quoteText = document.createElement('div');
    quoteText.className = 'quote-text';
    const quoteAuthor = document.createElement('div');
    quoteAuthor.className = 'quote-author';
    quoteWrap.appendChild(quoteText);
    quoteWrap.appendChild(quoteAuthor);

    async function loadDailyQuote() {
      try {
        const today = new Date().toISOString().slice(0,10);
        const key = 'dailyQuote_'+today;
        const cached = localStorage.getItem(key);
        if (cached) {
          const q = JSON.parse(cached);
          quoteText.textContent = q.content || '';
          quoteAuthor.textContent = q.author ? '— ' + q.author : '';
          return;
        }

        // fetch from quotable API
        quoteText.textContent = 'Loading quote…';
        quoteAuthor.textContent = '';
        let q = null;
        try {
          const res = await fetch('https://api.quotable.io/random');
          if (res.ok) {
            const data = await res.json();
            q = { content: data.content || data.quote || '', author: data.author || data.a || '' };
          }
        } catch (e) {
          console.warn('quotable fetch failed', e);
        }
        // fallback quotes
        if (!q) {
          const fallbacks = [
            { content: "Do what you can, with what you have, where you are.", author: 'Theodore Roosevelt' },
            { content: "The only limit to our realization of tomorrow is our doubts of today.", author: 'Franklin D. Roosevelt' },
            { content: "In the middle of difficulty lies opportunity.", author: 'Albert Einstein' },
            { content: "The best way out is always through.", author: 'Robert Frost' }
          ];
          q = fallbacks[Math.floor(Math.random()*fallbacks.length)];
        }
        
        localStorage.setItem(key, JSON.stringify(q));
        quoteText.textContent = q.content;
        quoteAuthor.textContent = q.author ? '— ' + q.author : '';
      } catch (e) {
        console.error('loadDailyQuote failed', e);
        quoteText.textContent = 'Could not load quote.';
        quoteAuthor.textContent = '';
      }
    }

    loadDailyQuote();
    // refresh daily at midnight (approx)
    const now = new Date();
    const untilMidnight = (new Date(now.getFullYear(), now.getMonth(), now.getDate()+1) - now) + 2000;
    setTimeout(() => { loadDailyQuote(); setInterval(loadDailyQuote, 24*60*60*1000); }, untilMidnight);
  }

  if (preset === 'tasks') {
    // editable tasks list with checkboxes; persisted in widgetsData[dataIndex].tasks
    body.innerHTML = '';
    const tasksWrap = document.createElement('div');
    tasksWrap.className = 'tasks-widget';
    const list = document.createElement('div');
    list.className = 'tasks-list';
    const addRow = document.createElement('div');
    addRow.className = 'tasks-add';
    const addInput = document.createElement('input');
    addInput.placeholder = 'Add a task and press Enter';
    addRow.appendChild(addInput);
    tasksWrap.appendChild(list);
    tasksWrap.appendChild(addRow);
    body.appendChild(tasksWrap);

    // load saved tasks if present
    let savedTasks = [];
    try {
      const idx = widget.dataset.index != null ? parseInt(widget.dataset.index) : null;
      if (idx != null && savedData && savedData.tasks) savedTasks = savedData.tasks;
      else if (idx != null && widgetsData[idx] && widgetsData[idx].tasks) savedTasks = widgetsData[idx].tasks;
    } catch (e) { savedTasks = []; }

    function renderTasks() {
      list.innerHTML = '';
      (savedTasks || []).forEach((t,i) => {
        const row = document.createElement('div');
        row.className = 'task-row';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done;
        const txt = document.createElement('div'); txt.className = 'task-text'; txt.contentEditable = true; txt.innerText = t.text || '';
        cb.addEventListener('change', () => { savedTasks[i].done = cb.checked; persist(); renderTasks(); });
        txt.addEventListener('input', () => { savedTasks[i].text = txt.innerText; persist(); });
        row.appendChild(cb); row.appendChild(txt);
        list.appendChild(row);
      });
    }

    function persist() {
      const idx = widget.dataset.index != null ? parseInt(widget.dataset.index) : null;
      if (idx != null) {
        widgetsData[idx].tasks = savedTasks;
        saveWidgets();
      }
    }

    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = addInput.value.trim();
        if (!val) return;
        savedTasks.unshift({ text: val, done: false });
        addInput.value = '';
        persist();
        renderTasks();
      }
    });

    // allow deleting a task by emptying its text and pressing Backspace when empty
    list.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const node = sel.anchorNode;
        const row = node && node.closest ? node.closest('.task-row') : null;
        if (row) {
          const idx = Array.from(list.children).indexOf(row);
          const txtEl = row.querySelector('.task-text');
          if (txtEl && txtEl.innerText.trim() === '') {
            savedTasks.splice(idx,1); persist(); renderTasks();
          }
        }
      }
    });

    renderTasks();
  }

  return widget;
}

function addWidgetFromPreset(preset, isLoaded = false, savedData = null) {
  let title = "New Widget", content = "";

  switch(preset) {
    case "blank": title = "Blank Widget"; content = ""; break;
  case "weather":
    title = "Weather";
    content = `
      <div class="weather-widget">
        <div class="weather-top" style="display:flex;align-items:center;gap:0.6rem;justify-content:center">
          <div class="weather-icon" style="font-size:1.6rem"></div>
          <div>
            <div class="weather-main" style="font-size:1.25rem;font-weight:700"></div>
            <div class="weather-desc" style="font-size:0.9rem"></div>
          </div>
        </div>
  <div class="weather-extra" style="margin-top:0.5rem;font-size:0.85rem;display:flex;gap:0.5rem;flex-direction:column;align-items:center">
          <div class="weather-stats" style="display:flex;gap:0.6rem;flex-wrap:wrap;justify-content:center">
            <div class="weather-humidity"></div>
            <div class="weather-precip"></div>
            <div class="weather-wind"></div>
            <div class="weather-sun"></div>
          </div>
          <div class="weather-forecast" style="display:flex;gap:0.4rem;margin-top:0.5rem;align-items:center;justify-content:center"></div>
        </div>
      </div>
    `;
    break;
    case "recentNotes": title = "Recent Notes"; content = "Recent notes here"; break;
  case "calendar": title = "Calendar"; content = "<div class='mini-calendar' data-year='' data-month=''></div>"; break;
    case "reminders": title = "Reminders"; content = "Reminders here"; break;
    case "tasks": title = "Tasks"; content = "Task list here"; break;
  case "clock": title = "Clock"; content = "<div class='analog-clock'><div class='face'><div class='hand hour'></div><div class='hand minute'></div><div class='hand second'></div></div></div><div class='digital-clock'></div>"; break;
    case "quotes": title = "Daily Quote"; content = "Quote here"; break;
  }

  return addWidget(title, content, preset, savedData, isLoaded);
}

function reloadWidgetIndices() {
  document.querySelectorAll("#dashboard .widget").forEach((w, i) => w.dataset.index = i);
}

// Preset popup logic
document.getElementById("addWidgetButton")?.addEventListener("click", () => {
  widgetPresetPopup.style.display = "block";
});
closePresetPopup?.addEventListener("click", () => { widgetPresetPopup.style.display = "none"; });
widgetPresetOptions?.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    addWidgetFromPreset(btn.dataset.preset);
    widgetPresetPopup.style.display = "none";
  });
});

// Load saved widgets
loadWidgets();
  // clamp widgets in case container size changed or saved positions are out of bounds
  setTimeout(clampAllWidgets, 50);

  // Move the Add Widget button out of the sidebar and turn it into a FAB for better visibility
  try {
    const moveAddWidgetToFab = () => {
      const btn = document.getElementById('addWidgetButton');
      if (!btn) return;
      // keep existing behavior but restyle and relocate
      // remove sidebar button styles that conflict with FAB
      btn.classList.remove('btn');
      btn.classList.add('fab');
      // use an icon for more consistent centering
      btn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      btn.setAttribute('aria-label', 'Add Widget');
      // append to body so fixed positioning works reliably
      document.body.appendChild(btn);
      // optional small label (insert only once)
      if (!document.querySelector('.fab-label')) {
        const lbl = document.createElement('div');
        lbl.className = 'fab-label';
        lbl.textContent = 'Add Widget';
        document.body.appendChild(lbl);
      }
    };
    // run after a tick in case DOM elements are still being set up
    setTimeout(moveAddWidgetToFab, 50);
  } catch (e) {
    console.error('FAB move failed', e);
  }

  // wire top-close buttons added to modals (hide their containing modal)
  document.querySelectorAll('.modal-top-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = btn.closest('.modal-popup');
      if (modal) modal.style.display = 'none';
    });
  });

  // keep body.modal-open in sync with visible modals so backdrop styles apply
  setInterval(() => {
    const anyOpen = Array.from(document.querySelectorAll('.modal-popup')).some(m => m.style.display && m.style.display !== 'none');
    if (anyOpen) document.body.classList.add('modal-open'); else document.body.classList.remove('modal-open');
  }, 120);

  // Widget theme selector wiring: apply saved widget-only theme and wire settings control
  try {
    const widgetThemeSelect = document.getElementById('widgetThemeSelect');
    const applyWidgetTheme = (mode) => {
      document.querySelectorAll('#dashboard .widget').forEach(w => {
        w.classList.remove('widget-theme-dark', 'widget-theme-light');
        if (mode === 'dark') w.classList.add('widget-theme-dark');
        if (mode === 'light') w.classList.add('widget-theme-light');
      });
      localStorage.setItem('widgetsTheme', mode);
    };
    const saved = localStorage.getItem('widgetsTheme') || 'inherit';
    if (widgetThemeSelect) {
      widgetThemeSelect.value = saved;
      widgetThemeSelect.addEventListener('change', (e) => applyWidgetTheme(e.target.value));
      // apply on load
      applyWidgetTheme(saved);
    }
  } catch (e) { console.warn('widget theme wiring failed', e); }

  // Location/timezone settings wiring (clock & weather)
  try {
    const useDeviceLocation = document.getElementById('useDeviceLocation');
    const locationOverrides = document.getElementById('locationOverrides');
    const overrideLat = document.getElementById('overrideLat');
    const overrideLon = document.getElementById('overrideLon');
    const overrideTimezone = document.getElementById('overrideTimezone');
    const overrideTimezoneSearch = document.getElementById('overrideTimezoneSearch');
    const overrideCity = document.getElementById('overrideCity');

    // popular location list (capital / major city, lat, lon, timezone)
    // expanded set covering many important countries and capitals
    const popularCities = [
      { name: 'London, UK', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
      { name: 'Washington, D.C., USA', lat: 38.9072, lon: -77.0369, tz: 'America/New_York' },
      { name: 'Ottawa, Canada', lat: 45.4215, lon: -75.6972, tz: 'America/Toronto' },
      { name: 'Mexico City, Mexico', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
      { name: 'Brasília, Brazil', lat: -15.8267, lon: -47.9218, tz: 'America/Sao_Paulo' },
      { name: 'Buenos Aires, Argentina', lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
      { name: 'Santiago, Chile', lat: -33.4489, lon: -70.6693, tz: 'America/Santiago' },
      { name: 'Lima, Peru', lat: -12.0464, lon: -77.0428, tz: 'America/Lima' },
      { name: 'Bogotá, Colombia', lat: 4.7110, lon: -74.0721, tz: 'America/Bogota' },
      { name: 'Caracas, Venezuela', lat: 10.4806, lon: -66.9036, tz: 'America/Caracas' },
      { name: 'Reykjavík, Iceland', lat: 64.1466, lon: -21.9426, tz: 'Atlantic/Reykjavik' },
      { name: 'Lisbon, Portugal', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon' },
      { name: 'Madrid, Spain', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
      { name: 'Paris, France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
      { name: 'Rome, Italy', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome' },
      { name: 'Berlin, Germany', lat: 52.52, lon: 13.4050, tz: 'Europe/Berlin' },
      { name: 'Amsterdam, Netherlands', lat: 52.3676, lon: 4.9041, tz: 'Europe/Amsterdam' },
      { name: 'Brussels, Belgium', lat: 50.8503, lon: 4.3517, tz: 'Europe/Brussels' },
      { name: 'Vienna, Austria', lat: 48.2082, lon: 16.3738, tz: 'Europe/Vienna' },
      { name: 'Prague, Czechia', lat: 50.0755, lon: 14.4378, tz: 'Europe/Prague' },
      { name: 'Warsaw, Poland', lat: 52.2297, lon: 21.0122, tz: 'Europe/Warsaw' },
      { name: 'Budapest, Hungary', lat: 47.4979, lon: 19.0402, tz: 'Europe/Budapest' },
      { name: 'Stockholm, Sweden', lat: 59.3293, lon: 18.0686, tz: 'Europe/Stockholm' },
      { name: 'Oslo, Norway', lat: 59.9139, lon: 10.7522, tz: 'Europe/Oslo' },
      { name: 'Helsinki, Finland', lat: 60.1699, lon: 24.9384, tz: 'Europe/Helsinki' },
      { name: 'Copenhagen, Denmark', lat: 55.6761, lon: 12.5683, tz: 'Europe/Copenhagen' },
      { name: 'Athens, Greece', lat: 37.9838, lon: 23.7275, tz: 'Europe/Athens' },
      { name: 'Ankara, Turkey', lat: 39.9334, lon: 32.8597, tz: 'Europe/Istanbul' },
      { name: 'Moscow, Russia', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
      { name: 'New Delhi, India', lat: 28.6139, lon: 77.2090, tz: 'Asia/Kolkata' },
      { name: 'Islamabad, Pakistan', lat: 33.6844, lon: 73.0479, tz: 'Asia/Karachi' },
      { name: 'Dhaka, Bangladesh', lat: 23.8103, lon: 90.4125, tz: 'Asia/Dhaka' },
      { name: 'Colombo, Sri Lanka', lat: 6.9271, lon: 79.8612, tz: 'Asia/Colombo' },
      { name: 'Beijing, China', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai' },
      { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
      { name: 'Seoul, South Korea', lat: 37.5665, lon: 126.9780, tz: 'Asia/Seoul' },
      { name: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
      { name: 'Jakarta, Indonesia', lat: -6.2088, lon: 106.8456, tz: 'Asia/Jakarta' },
      { name: 'Canberra, Australia', lat: -35.2809, lon: 149.1300, tz: 'Australia/Sydney' },
      { name: 'Wellington, New Zealand', lat: -41.2865, lon: 174.7762, tz: 'Pacific/Auckland' },
  { name: 'Pretoria (administrative), South Africa', lat: -25.7479, lon: 28.2293, tz: 'Africa/Johannesburg' },
  { name: 'Tripoli, Libya', lat: 32.8872, lon: 13.1913, tz: 'Africa/Tripoli' },
  { name: 'Harare, Zimbabwe', lat: -17.8252, lon: 31.0335, tz: 'Africa/Harare' },
      { name: 'Abuja, Nigeria', lat: 9.0765, lon: 7.3986, tz: 'Africa/Lagos' },
      { name: 'Nairobi, Kenya', lat: -1.2921, lon: 36.8219, tz: 'Africa/Nairobi' },
      { name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
      { name: 'Riyadh, Saudi Arabia', lat: 24.7136, lon: 46.6753, tz: 'Asia/Riyadh' },
      { name: 'Abu Dhabi, UAE', lat: 24.4539, lon: 54.3773, tz: 'Asia/Dubai' },
      { name: 'Jerusalem, Israel', lat: 31.7683, lon: 35.2137, tz: 'Asia/Jerusalem' },
      { name: 'Tehran, Iran', lat: 35.6892, lon: 51.3890, tz: 'Asia/Tehran' },
      { name: 'Hanoi, Vietnam', lat: 21.0278, lon: 105.8342, tz: 'Asia/Ho_Chi_Minh' },
      { name: 'Bangkok, Thailand', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok' },
      { name: 'Manila, Philippines', lat: 14.5995, lon: 120.9842, tz: 'Asia/Manila' },
      { name: 'Kuala Lumpur, Malaysia', lat: 3.1390, lon: 101.6869, tz: 'Asia/Kuala_Lumpur' }
    ];

    // Autocomplete/typeahead for locations: show clickable suggestions as user types
    const overrideLocationInput = document.getElementById('overrideLocationInput');
    const locationSuggestions = document.getElementById('locationSuggestions');
    // hidden field #overrideCity remains as storage target (we created a hidden input in HTML)
    const hiddenOverrideCity = document.getElementById('overrideCity');

    let suggestionIndex = -1;
    let currentSuggestions = [];

    function clearSuggestions() {
      if (!locationSuggestions) return;
      locationSuggestions.innerHTML = '';
      locationSuggestions.style.display = 'none';
      suggestionIndex = -1;
      currentSuggestions = [];
    }

    function showSuggestionsFor(query) {
      if (!locationSuggestions || !overrideLocationInput) return;
      const q = (query || '').toLowerCase().trim();
      const results = q ? popularCities.filter(c => c.name.toLowerCase().includes(q)) : popularCities.slice(0, 30);
      currentSuggestions = results;
      locationSuggestions.innerHTML = '';
      if (!results.length) {
        const d = document.createElement('div');
        d.className = 'suggestion';
        d.textContent = 'No results';
        d.style.opacity = '0.6';
        locationSuggestions.appendChild(d);
        locationSuggestions.style.display = 'block';
        return;
      }

      results.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'suggestion';
        d.textContent = c.name;
        d.tabIndex = 0;
        d.addEventListener('click', () => selectSuggestion(i));
        d.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') selectSuggestion(i);
        });
        locationSuggestions.appendChild(d);
      });
      locationSuggestions.style.display = 'block';
      suggestionIndex = -1;
    }

    function selectSuggestion(i) {
      const city = currentSuggestions[i];
      if (!city) return;
      // set visible input and hidden field
      if (overrideLocationInput) overrideLocationInput.value = city.name;
      if (hiddenOverrideCity) hiddenOverrideCity.value = String(popularCities.indexOf(city));
      if (overrideLat) overrideLat.value = city.lat;
      if (overrideLon) overrideLon.value = city.lon;
      if (overrideTimezone) {
        populateTimezoneOptions('');
        overrideTimezone.value = city.tz || 'auto';
      }
      saveLocationSettings({ lat: city.lat, lon: city.lon, timezone: city.tz });
      clearSuggestions();
      showPopup('Location saved');
    }

    if (overrideLocationInput) {
      let locTimer = null;
      overrideLocationInput.addEventListener('input', (e) => {
        clearTimeout(locTimer);
        locTimer = setTimeout(() => {
          const q = e.target.value || '';
          if (!q) {
            // show top results when empty
            showSuggestionsFor('');
          } else showSuggestionsFor(q);
        }, 120);
      });

      overrideLocationInput.addEventListener('keydown', (e) => {
        const items = locationSuggestions ? Array.from(locationSuggestions.querySelectorAll('.suggestion')) : [];
        if (e.key === 'ArrowDown') {
          if (!items.length) return;
          suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
          items.forEach((it, idx) => it.classList.toggle('active', idx === suggestionIndex));
          items[suggestionIndex].scrollIntoView({ block: 'nearest' });
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          if (!items.length) return;
          suggestionIndex = Math.max(suggestionIndex - 1, 0);
          items.forEach((it, idx) => it.classList.toggle('active', idx === suggestionIndex));
          items[suggestionIndex].scrollIntoView({ block: 'nearest' });
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (suggestionIndex >= 0 && currentSuggestions[suggestionIndex]) {
            selectSuggestion(suggestionIndex);
            e.preventDefault();
          }
        } else if (e.key === 'Escape') {
          clearSuggestions();
        }
      });

      // clicking outside closes suggestions
      document.addEventListener('click', (ev) => {
        const wrap = document.getElementById('overrideLocationWrap');
        if (wrap && !wrap.contains(ev.target)) clearSuggestions();
      });

      // show initial top results when input focused
      overrideLocationInput.addEventListener('focus', () => showSuggestionsFor(overrideLocationInput.value || ''));
    }

    // timezone list (common IANA zones). Searchable via the input above.
    const timezoneList = [
      'Africa/Cairo','Africa/Johannesburg','America/Los_Angeles','America/Denver','America/Chicago','America/New_York',
      'America/Sao_Paulo','America/Argentina/Buenos_Aires','America/Mexico_City','America/Toronto','America/Vancouver',
      'Asia/Tokyo','Asia/Shanghai','Asia/Hong_Kong','Asia/Singapore','Asia/Bangkok','Asia/Kolkata','Asia/Dubai',
      'Europe/London','Europe/Berlin','Europe/Paris','Europe/Madrid','Europe/Rome','Europe/Moscow','Europe/Istanbul',
      'Pacific/Auckland','Australia/Sydney','Australia/Melbourne','Pacific/Honolulu','Atlantic/Reykjavik','UTC'
    ];

    function populateTimezoneOptions(filter) {
      if (!overrideTimezone) return;
      const f = (filter||'').toLowerCase();
      // if there's no search text, keep the select hidden and only have the 'auto' option
      if (!f) {
        overrideTimezone.innerHTML = '<option value="auto">Auto (from location)</option>';
        overrideTimezone.style.display = 'none';
        return;
      }

      // when user types, reveal and populate matching zones
      overrideTimezone.style.display = 'block';
      overrideTimezone.innerHTML = '<option value="auto">Auto (from location)</option>';
      timezoneList.filter(tz => tz.toLowerCase().includes(f)).forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz; opt.textContent = tz; overrideTimezone.appendChild(opt);
      });
    }
    // initial state: keep the timezone select hidden until the user types
    if (overrideTimezone) overrideTimezone.style.display = 'none';

    if (overrideTimezoneSearch) {
      overrideTimezoneSearch.addEventListener('input', (e) => populateTimezoneOptions(e.target.value));
      // allow pressing enter to focus select only when it's visible/populated
      overrideTimezoneSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (overrideTimezone && overrideTimezone.style.display !== 'none' && overrideTimezone.options.length > 1) {
            overrideTimezone.focus();
            e.preventDefault();
          }
        }
      });
    }

    const refreshLocationUI = () => {
      const s = getLocationSettings();
      if (useDeviceLocation) useDeviceLocation.checked = !!s.useDeviceLocation;
      if (locationOverrides) locationOverrides.style.display = useDeviceLocation && useDeviceLocation.checked ? 'none' : 'block';
      if (overrideLat) overrideLat.value = s.lat != null ? s.lat : '';
      if (overrideLon) overrideLon.value = s.lon != null ? s.lon : '';
      if (overrideTimezone) overrideTimezone.value = s.timezone || 'auto';
    };

    if (useDeviceLocation) {
      useDeviceLocation.addEventListener('change', (e) => {
        saveLocationSettings({ useDeviceLocation: e.target.checked });
        refreshLocationUI();
      });
    }

    if (overrideLat) overrideLat.addEventListener('input', (e) => saveLocationSettings({ lat: e.target.value ? parseFloat(e.target.value) : null }));
    if (overrideLon) overrideLon.addEventListener('input', (e) => saveLocationSettings({ lon: e.target.value ? parseFloat(e.target.value) : null }));
    if (overrideTimezone) overrideTimezone.addEventListener('change', (e) => saveLocationSettings({ timezone: e.target.value }));

    // initialize UI from saved settings
    refreshLocationUI();
  } catch (e) { console.warn('location settings wiring failed', e); }

  // Tab wiring
  plannerTab && plannerTab.addEventListener("click", showPlanner);
  calendarTab && calendarTab.addEventListener("click", showCalendar);
  notesTab && notesTab.addEventListener("click", showNotes);
  settingsTab && settingsTab.addEventListener("click", showSettings);
  aboutTab && aboutTab.addEventListener("click", showAbout);

  // Default view
  showPlanner();
  initCalendar();

  // Initialize notes
  initNotes();
  initNotesEditor();

  // Hide delete popup
  if (deleteConfirmPopup) deleteConfirmPopup.style.display = "none";
  pageToDelete = null;

  // Notes config dropdown
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

/* =========================
   Notes Editor Init
========================= */
function initNotesEditor() {
  const notesEditor = document.getElementById('notesEditor');
  const fontSizeInput = document.getElementById('fontSize');
  const fontFamilySelect = document.getElementById('fontFamily');
  const lineHeightInput = document.getElementById('lineHeight');
  const textColorInput = document.getElementById('textColor');

  if (!notesEditor || !fontSizeInput || !fontFamilySelect || !lineHeightInput || !textColorInput) return;

  // Apply and save settings
  const saveEditorSettings = () => {
    const settings = {
      fontSize: notesEditor.style.fontSize,
      fontFamily: notesEditor.style.fontFamily,
      lineHeight: notesEditor.style.lineHeight,
      color: notesEditor.style.color
    };
    localStorage.setItem('notesEditorSettings', JSON.stringify(settings));
  };

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
    // Apply color to the editor immediately
    notesEditor.style.color = e.target.value;
    // Save color as a per-page setting if a page is active, otherwise save as global
    if (activePageId) {
      const page = pages.find(p => p.id === activePageId);
      if (page) {
        page.editorSettings = page.editorSettings || {};
        page.editorSettings.color = e.target.value;
        page.updated = new Date().toISOString();
        savePages();
        renderPagesList(notesSearch && notesSearch.value ? notesSearch.value : "");
      }
    } else {
      saveEditorSettings();
    }
  });

  // Load saved settings
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
    // set as global default color; individual pages may override this
    notesEditor.style.color = settings.color;
    textColorInput.value = settings.color;
  }
}

function loadEditorSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem('notesEditorSettings') || '{}');
    const editor = document.getElementById('notesEditor');
    if (!editor || !settings) return;
    if (settings.fontSize) editor.style.fontSize = settings.fontSize;
    if (settings.fontFamily) editor.style.fontFamily = settings.fontFamily;
    if (settings.lineHeight) editor.style.lineHeight = settings.lineHeight;
    if (settings.color) editor.style.color = settings.color;
  } catch (e) {
    // ignore malformed settings
  }
}

  loadEditorSettings();
})
