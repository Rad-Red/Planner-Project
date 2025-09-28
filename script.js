// Radical Planner - cleaned script.js
// Replace your existing script with this file

// ===== Elements =====
const table = document.getElementById("tableInput");
const aboutButton = document.getElementById("aboutButton");
const aboutDropdown = document.getElementById("aboutDropdown");
const plannerTab = document.getElementById("plannerTab");
const calendarTab = document.getElementById("calendarTab");
const plannerSection = document.getElementById("plannerSection");
const calendarSection = document.getElementById("calendarSection");
const viewTaskPopup = document.getElementById("viewTaskPopup");
const closeViewTask = document.getElementById("closeViewTask");
const editTaskBtn = document.getElementById("editTaskBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");

let calendar = null;
let currentTaskId = null;     // id of task shown in view popup
let editingTaskId = null;     // id of task being edited in add/save popup
let rowDeleteMode = false;
let columnDeleteMode = false;

// ===== Helpers =====
function showPopup(message, duration = 3000) {
  const popup = document.getElementById("popupMessage");
  if (!popup) return;
  popup.textContent = message;
  popup.style.display = "block";
  setTimeout(() => (popup.style.display = "none"), duration);
}

function saveToLocalStorage() {
  const data = Array.from(table.rows).map(row =>
    Array.from(row.cells).map(cell => cell.textContent)
  );
  localStorage.setItem("tableData", JSON.stringify(data));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem("tableData");
  if (!saved) return;
  const data = JSON.parse(saved);
  while (table.rows.length) table.deleteRow(0);
  for (let rowData of data) {
    const row = table.insertRow();
    for (let cellData of rowData) row.insertCell().textContent = cellData;
  }
}

function saveTasks(tasks) {
  localStorage.setItem("calendarTasks", JSON.stringify(tasks));
}

function loadTasks() {
  return JSON.parse(localStorage.getItem("calendarTasks") || "[]");
}

// ===== Planner / Calendar UI =====
function showPlanner() {
  plannerSection.style.display = "flex";
  calendarSection.style.display = "none";
  plannerTab.classList.add("active");
  calendarTab.classList.remove("active");
}

function showCalendar() {
  plannerSection.style.display = "none";
  calendarSection.style.display = "block";
  calendarTab.classList.add("active");
  plannerTab.classList.remove("active");
  if (calendar) {
    calendar.render();
    calendar.updateSize();
  }
}

// ===== Table functions =====
function addRow() {
  const numColumns = table.rows[0]?.cells.length || 1;
  const newRow = table.insertRow();
  for (let i = 0; i < numColumns; i++) newRow.insertCell().textContent = "";
  saveToLocalStorage();
}

function addColumn() {
  const rowCount = table.rows.length;
  for (let i = 0; i < rowCount; i++) table.rows[i].insertCell().textContent = "";
  saveToLocalStorage();
}

function editCell(cell) {
  if (cell.querySelector("input")) return;
  const original = cell.textContent;
  cell.innerHTML = `<input type="text" value="${original}">`;
  const input = cell.querySelector("input");
  input.focus();
  input.addEventListener("blur", () => {
    cell.textContent = input.value;
    saveToLocalStorage();
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
  });
}

// ===== Delete modes =====
function startRemoveRow() {
  rowDeleteMode = true;
  columnDeleteMode = false;
  table.classList.add("row-delete-mode");
  table.classList.remove("column-delete-mode");
  showPopup("Click a row to delete it");
}

function startRemoveColumn() {
  columnDeleteMode = true;
  rowDeleteMode = false;
  table.classList.add("column-delete-mode");
  table.classList.remove("row-delete-mode");
  showPopup("Click a cell in a column to delete that column");
}

// ===== Table event listeners =====
table.addEventListener("click", event => {
  if (rowDeleteMode) {
    const row = event.target.closest("tr");
    if (row) table.deleteRow(Array.from(table.rows).indexOf(row));
    rowDeleteMode = false;
    table.classList.remove("row-delete-mode");
    saveToLocalStorage();
    showPopup("Row deleted");
    return;
  }

  if (columnDeleteMode) {
    const cell = event.target.closest("td, th");
    if (cell) {
      const index = Array.from(cell.parentElement.cells).indexOf(cell);
      for (let r of Array.from(table.rows)) if (r.cells[index]) r.deleteCell(index);
      saveToLocalStorage();
    }
    columnDeleteMode = false;
    table.classList.remove("column-delete-mode");
    showPopup("Column deleted");
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

// ===== Dropdown menu =====
const tabMenuButton = document.getElementById("tabMenuButton");
const tabMenuDropdown = document.getElementById("tabMenuDropdown");

tabMenuButton.addEventListener("click", e => {
  e.stopPropagation();
  tabMenuDropdown.style.display = tabMenuDropdown.style.display === "flex" ? "none" : "flex";
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

// ===== Task Add/Edit Popup (created once) =====
const taskPopup = document.createElement("div");
taskPopup.id = "taskPopup";
taskPopup.innerHTML = `
  <h3>Add Task</h3>
  <div class="fields-container">
    <div class="field"><strong>Title:</strong><input type="text" id="popupTaskTitle" placeholder="Task title"></div>
    <div class="field"><strong>Date:</strong><input type="date" id="popupTaskDate"></div>
    <div class="field">
      <strong>Time:</strong>
      <input type="time" id="popupTaskTime">
      <label><input type="checkbox" id="popupAllDay"> All-day</label>
    </div>
    <div class="field"><strong>Description:</strong><textarea id="popupTaskDesc" placeholder="Task description"></textarea></div>
  </div>
  <div class="buttons-container" style="display:flex; gap:8px; justify-content:flex-end">
    <button id="popupCancel">Cancel</button>
    <button id="popupSave">Add</button>
  </div>
`;
document.body.appendChild(taskPopup);

// element refs for popup
const popupTitle = document.getElementById("popupTaskTitle");
const popupDate = document.getElementById("popupTaskDate");
const popupTime = document.getElementById("popupTaskTime");
const popupAllDay = document.getElementById("popupAllDay");
const popupDesc = document.getElementById("popupTaskDesc");
const popupCancel = document.getElementById("popupCancel");
const popupSave = document.getElementById("popupSave");

popupAllDay.addEventListener("change", () => {
  popupTime.disabled = popupAllDay.checked;
});

popupCancel.addEventListener("click", () => {
  taskPopup.style.display = "none";
  clearPopupFields();
  editingTaskId = null;
  popupSave.textContent = "Add";
});

function clearPopupFields() {
  popupTitle.value = "";
  popupDate.value = "";
  popupTime.value = "";
  popupAllDay.checked = false;
  popupTime.disabled = false;
  popupDesc.value = "";
}

// Save or add task
popupSave.addEventListener("click", () => {
  const title = popupTitle.value.trim();
  const dateVal = popupDate.value;
  const timeVal = popupTime.value;
  const allDay = popupAllDay.checked;
  const desc = popupDesc.value.trim();

  if (!title || !dateVal) {
    showPopup("Enter title and date");
    return;
  }

  const datetime = allDay ? dateVal : `${dateVal}T${timeVal || "00:00"}`;
  const tasks = loadTasks();

  if (editingTaskId) {
    // update existing
    const idx = tasks.findIndex(t => t.id === editingTaskId);
    if (idx !== -1) {
      tasks[idx] = {
        id: editingTaskId,
        title,
        date: datetime,
        description: desc,
        allDay
      };
      saveTasks(tasks);
      calendar.refetchEvents();
      showPopup("Task updated");
    } else {
      // fallback: push new
      tasks.push({
        id: editingTaskId,
        title,
        date: datetime,
        description: desc,
        allDay
      });
      saveTasks(tasks);
      calendar.refetchEvents();
      showPopup("Task saved");
    }
    editingTaskId = null;
    popupSave.textContent = "Add";
  } else {
    // add new
    const id = Date.now().toString();
    tasks.push({
      id,
      title,
      date: datetime,
      description: desc,
      allDay
    });
    saveTasks(tasks);
    calendar.refetchEvents();
    showPopup("Task added");
  }

  taskPopup.style.display = "none";
  clearPopupFields();
});

// ===== View popup controls =====
closeViewTask.addEventListener("click", () => {
  viewTaskPopup.style.display = "none";
  currentTaskId = null;
});

// Delete task
deleteTaskBtn.addEventListener("click", () => {
  if (!currentTaskId) return;
  const tasks = loadTasks().filter(t => t.id !== currentTaskId);
  saveTasks(tasks);
  calendar.refetchEvents();
  viewTaskPopup.style.display = "none";
  showPopup("Task deleted");
  currentTaskId = null;
});

// Edit from view popup
editTaskBtn.addEventListener("click", () => {
  if (!currentTaskId) return;
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === currentTaskId);
  if (!task) {
    showPopup("Task not found");
    return;
  }

  // fill popup fields
  popupTitle.value = task.title || "";
  if (task.date && task.date.includes("T")) {
    const parts = task.date.split("T");
    popupDate.value = parts[0] || "";
    popupTime.value = parts[1] || "";
  } else {
    popupDate.value = task.date || "";
    popupTime.value = "";
  }
  popupDesc.value = task.description || "";
  popupAllDay.checked = !!task.allDay;
  popupTime.disabled = popupAllDay.checked;

  editingTaskId = task.id;
  popupSave.textContent = "Save";
  viewTaskPopup.style.display = "none";
  taskPopup.style.display = "block";
});

// ===== Calendar init =====
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
      addTaskButton: {
        text: "Add Task",
        click: () => {
          clearPopupFields();
          editingTaskId = null;
          popupSave.textContent = "Add";
          taskPopup.style.display = "block";
        }
      }
    },
    events: (fetchInfo, success) => {
      const tasks = loadTasks();
      success(
        tasks.map(t => ({
          id: t.id,
          title: t.title,
          start: t.date,
          allDay: !!t.allDay,
          extendedProps: { description: t.description || "" }
        }))
      );
    },
    eventClick: info => {
      const evt = info.event;
      const tasks = loadTasks();
      const task = tasks.find(t => t.id === evt.id);
      currentTaskId = task ? task.id : null;

      if (!task) {
        showPopup("Task not found");
        return;
      }

      document.getElementById("viewTaskTitle").textContent = task.title || "";
      document.getElementById("viewTaskDate").textContent = evt.startStr || task.date || "";
      document.getElementById("viewTaskTime").textContent = evt.allDay ? "All-day" : evt.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      document.getElementById("viewTaskDesc").textContent = task.description || "";
      viewTaskPopup.style.display = "block";
    }
  });

  calendar.render();
}

// ===== DOM loaded =====
window.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();

  document.getElementById("addRowButton").addEventListener("click", addRow);
  document.getElementById("addColumnButton").addEventListener("click", addColumn);
  document.getElementById("removeRowButton").addEventListener("click", startRemoveRow);
  document.getElementById("removeColumnButton").addEventListener("click", startRemoveColumn);

  aboutButton.addEventListener("click", e => {
    e.stopPropagation();
    aboutDropdown.classList.toggle("show");
  });
  document.addEventListener("click", () => aboutDropdown.classList.remove("show"));

  showPlanner();
  initCalendar();
});
