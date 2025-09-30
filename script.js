// ===== Elements =====
const table = document.getElementById("tableInput");
const plannerTab = document.getElementById("plannerTab");
const calendarTab = document.getElementById("calendarTab");
const plannerSection = document.getElementById("plannerSection");
const calendarSection = document.getElementById("calendarSection");
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

function saveTable() {
  const data = Array.from(table.rows).map(row =>
    Array.from(row.cells).map(cell => cell.textContent)
  );
  localStorage.setItem("tableData", JSON.stringify(data));
}

function loadTable() {
  const saved = localStorage.getItem("tableData");
  if (!saved) return;
  const data = JSON.parse(saved);
  while (table.rows.length) table.deleteRow(0);
  for (let rowData of data) {
    const row = table.insertRow();
    for (let cellData of rowData) row.insertCell().textContent = cellData;
  }
}

// ===== Section Display =====
function hideAllSections() {
  plannerSection.style.display = "none";
  calendarSection.style.display = "none";
  settingsSection.style.display = "none";
  aboutSection.style.display = "none";

  plannerTab.classList.remove("active");
  calendarTab.classList.remove("active");
  settingsTab.classList.remove("active");
  aboutTab.classList.remove("active");
}

function showPlanner() {
  hideAllSections();
  plannerSection.style.display = "flex";
  plannerTab.classList.add("active");
}

function showCalendar() {
  hideAllSections();
  calendarSection.style.display = "block";
  calendarTab.classList.add("active");
  if (calendar) {
    calendar.render();
    calendar.updateSize();
  }
}

function showSettings() {
  hideAllSections();
  settingsSection.style.display = "block";
  settingsTab.classList.add("active");
}

function showAbout() {
  hideAllSections();
  aboutSection.style.display = "block";
  aboutTab.classList.add("active");
}

// ===== Table =====
function addRow() {
  const numColumns = table.rows[0]?.cells.length || 1;
  const newRow = table.insertRow();
  for (let i = 0; i < numColumns; i++) newRow.insertCell().textContent = "";
  saveTable();
}

function addColumn() {
  for (let row of table.rows) row.insertCell().textContent = "";
  saveTable();
}

function editCell(cell) {
  if (cell.querySelector("input")) return;
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

// ===== Delete Modes =====
function startRemoveRow() {
  rowDeleteMode = true;
  columnDeleteMode = false;
  table.classList.add("row-delete-mode");
  table.classList.remove("column-delete-mode");
  showPopup("Click a row to delete it.");
}

function startRemoveColumn() {
  columnDeleteMode = true;
  rowDeleteMode = false;
  table.classList.add("column-delete-mode");
  table.classList.remove("row-delete-mode");
  showPopup("Click a column to delete it.");
}

// ===== Table Listeners =====
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
  for (let row of table.rows)
    if (row.cells[index]) row.cells[index].classList.add("column-hover");
});

table.addEventListener("mouseout", () => {
  if (!columnDeleteMode) return;
  for (let row of table.rows)
    for (let cell of row.cells) cell.classList.remove("column-hover");
});

// ===== Dropdown =====
tabMenuButton.addEventListener("click", e => {
  e.stopPropagation();
  tabMenuDropdown.style.display =
    tabMenuDropdown.style.display === "flex" ? "none" : "flex";
});

document.addEventListener("click", () => (tabMenuDropdown.style.display = "none"));

plannerTab.addEventListener("click", () => {
  showPlanner();
  tabMenuDropdown.style.display = "none";
});
calendarTab.addEventListener("click", () => {
  showCalendar();
  tabMenuDropdown.style.display = "none";
});
settingsTab.addEventListener("click", () => {
  showSettings();
  tabMenuDropdown.style.display = "none";
});
aboutTab.addEventListener("click", () => {
  showAbout();
  tabMenuDropdown.style.display = "none";
});

// ===== Task Storage =====
function saveTasks(tasks) {
  localStorage.setItem("calendarTasks", JSON.stringify(tasks));
}
function loadTasks() {
  return JSON.parse(localStorage.getItem("calendarTasks") || "[]");
}

// ===== Add Task Popup =====
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
    <div class="field"><strong>Description:</strong><textarea id="popupTaskDesc"></textarea></div>
  </div>
  <div class="buttons-container">
    <button id="popupCancel">Cancel</button>
    <button id="popupAdd">Save</button>
  </div>
`;
document.body.appendChild(taskPopup);

const allDayCheckbox = document.getElementById("popupAllDay");
const timeInput = document.getElementById("popupTaskTime");
allDayCheckbox.addEventListener("change", () => {
  timeInput.disabled = allDayCheckbox.checked;
});

document.getElementById("popupCancel").addEventListener("click", () => {
  taskPopup.style.display = "none";
});

document.getElementById("popupAdd").addEventListener("click", () => {
  const title = document.getElementById("popupTaskTitle").value.trim();
  const startDate = document.getElementById("popupTaskStart").value;
  let endDate = document.getElementById("popupTaskEnd").value;
  let time = document.getElementById("popupTaskTime").value;
  const allDay = document.getElementById("popupAllDay").checked;
  const desc = document.getElementById("popupTaskDesc").value.trim();

  if (!title || !startDate) {
    showPopup("Enter title and start date");
    return;
  }
  if (!endDate) endDate = startDate;

  const start = allDay ? startDate : `${startDate}T${time || "00:00"}`;
  const end = endDate;

  const tasks = loadTasks();
  const id = Date.now() + title;
  tasks.push({ id, title, start, end, description: desc, allDay });
  saveTasks(tasks);

  calendar.refetchEvents();
  taskPopup.style.display = "none";
  showPopup("Task saved");
});

// ===== View Task Popup =====
closeViewTask.addEventListener("click", () => {
  viewTaskPopup.style.display = "none";
  currentTaskId = null;
});

deleteTaskBtn.addEventListener("click", () => {
  if (!currentTaskId) return;
  let tasks = loadTasks();
  tasks = tasks.filter(t => t.id !== currentTaskId);
  saveTasks(tasks);
  calendar.refetchEvents();
  viewTaskPopup.style.display = "none";
  showPopup("Task deleted");
  currentTaskId = null;
});

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

  tasks = tasks.filter(t => t.id !== currentTaskId);
  saveTasks(tasks);
  calendar.refetchEvents();

  viewTaskPopup.style.display = "none";
  taskPopup.style.display = "block";
  currentTaskId = null;
});

// ===== Calendar =====
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "addTaskButton dayGridMonth,timeGridWeek,timeGridDay"
    },
    customButtons: {
      addTaskButton: { text: "Add Task", click: () => (taskPopup.style.display = "block") }
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
        (task.end && task.end !== task.start.split("T")[0]
          ? " → " + task.end
          : "");
      document.getElementById("viewTaskTime").textContent = task.allDay
        ? "All-day"
        : task.start.includes("T")
        ? task.start.split("T")[1]
        : "";
      document.getElementById("viewTaskDesc").textContent = task.description;
      viewTaskPopup.style.display = "block";
    }
  });
  calendar.render();
}

// ===== Theme Handling =====
const root = document.documentElement;
const themeSelect = document.getElementById("themeSelect"); // in your settings section

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

// ===== Init =====
window.addEventListener("DOMContentLoaded", () => {
  loadTable();
  loadTheme();

  document.getElementById("addRowButton").addEventListener("click", addRow);
  document.getElementById("addColumnButton").addEventListener("click", addColumn);
  document.getElementById("removeRowButton").addEventListener("click", startRemoveRow);
  document.getElementById("removeColumnButton").addEventListener("click", startRemoveColumn);

  showPlanner();
  initCalendar();
});
