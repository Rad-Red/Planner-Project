// ===== Elements =====
const table = document.getElementById("tableInput");
const aboutButton = document.getElementById("aboutButton");
const aboutDropdown = document.getElementById("aboutDropdown");
const plannerTab = document.getElementById("plannerTab");
const calendarTab = document.getElementById("calendarTab");
const plannerSection = document.getElementById("plannerSection");
const calendarSection = document.getElementById("calendarSection");
const viewTaskPopup = document.getElementById('viewTaskPopup');
const closeViewTask = document.getElementById('closeViewTask');

let rowDeleteMode = false;
let columnDeleteMode = false;
let calendar;

// ===== Helper Functions =====
function showPopup(message, duration = 3000) {
  const popup = document.getElementById('popupMessage');
  if (!popup) return;
  popup.textContent = message;
  popup.style.display = 'block';
  setTimeout(() => popup.style.display = 'none', duration);
}

function saveToLocalStorage() {
  const data = Array.from(table.rows).map(row => Array.from(row.cells).map(cell => cell.textContent));
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

// ===== Table Functions =====
function addRow() {
  const numColumns = table.rows[0]?.cells.length || 1;
  const newRow = table.insertRow();
  for (let i = 0; i < numColumns; i++) newRow.insertCell().textContent = '';
  saveToLocalStorage();
}

function addColumn() {
  const rowCount = table.rows.length;
  for (let i = 0; i < rowCount; i++) table.rows[i].insertCell().textContent = '';
  saveToLocalStorage();
}

function editCell(cell) {
  if (cell.querySelector('input')) return;
  const original = cell.textContent;
  cell.innerHTML = `<input type="text" value="${original}">`;
  const input = cell.querySelector('input');
  input.focus();
  input.addEventListener('blur', () => { cell.textContent = input.value; saveToLocalStorage(); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
}

// ===== Delete Modes =====
function startRemoveRow() {
  rowDeleteMode = true;
  columnDeleteMode = false;
  table.classList.add('row-delete-mode');
  table.classList.remove('column-delete-mode');
  showPopup("Click on a row to delete it.");
}

function startRemoveColumn() {
  columnDeleteMode = true;
  rowDeleteMode = false;
  table.classList.add('column-delete-mode');
  table.classList.remove('row-delete-mode');
  showPopup("Click on a cell in the column to delete it.");
}

// ===== Table Event Listeners =====
table.addEventListener('click', event => {
  if (rowDeleteMode) {
    const row = event.target.closest('tr');
    if (row) table.deleteRow(Array.from(table.rows).indexOf(row));
    rowDeleteMode = false; table.classList.remove('row-delete-mode');
    showPopup("Row deleted. Deletion mode off.");
    saveToLocalStorage(); return;
  }

  if (columnDeleteMode) {
    const cell = event.target.closest('td, th');
    if (cell) {
      const index = Array.from(cell.parentElement.cells).indexOf(cell);
      for (let r of table.rows) if (r.cells[index]) r.deleteCell(index);
      saveToLocalStorage();
    }
    columnDeleteMode = false; table.classList.remove('column-delete-mode');
    showPopup("Column deleted. Deletion mode off."); return;
  }

  if (event.target.tagName === 'TD') editCell(event.target);
});

// Column hover highlight
table.addEventListener('mouseover', e => {
  if (!columnDeleteMode) return;
  const cell = e.target.closest('td, th');
  if (!cell) return;
  const index = Array.from(cell.parentElement.cells).indexOf(cell);
  for (let row of table.rows) if (row.cells[index]) row.cells[index].classList.add('column-hover');
});

table.addEventListener('mouseout', e => {
  if (!columnDeleteMode) return;
  for (let row of table.rows) for (let cell of row.cells) cell.classList.remove('column-hover');
});

// ===== Planner / Calendar Tabs =====
function showPlanner() {
  plannerSection.style.display = 'block';
  calendarSection.style.display = 'none';
  plannerTab.classList.add('active');
  calendarTab.classList.remove('active');
}

function showCalendar() {
  plannerSection.style.display = 'none';
  calendarSection.style.display = 'block';
  calendar.refetchEvents();
  calendarTab.classList.add('active');
  plannerTab.classList.remove('active');
}

// ===== Calendar Task Storage =====
function saveTasks(tasks) { localStorage.setItem("calendarTasks", JSON.stringify(tasks)); }
function loadTasks() { return JSON.parse(localStorage.getItem("calendarTasks") || "[]"); }

// ===== Task Popup =====
const taskPopup = document.createElement('div');
taskPopup.id = 'taskPopup';
taskPopup.innerHTML = `
  <h3>Add Task</h3>
  <div class="fields-container">
    <div class="field"><strong>Title:</strong><input type="text" id="popupTaskTitle" placeholder="Task title"></div>
    <div class="field"><strong>Date:</strong><input type="date" id="popupTaskDate"></div>
    <div class="field"><strong>Time:</strong><input type="time" id="popupTaskTime"></div>
    <div class="field"><strong>Description:</strong><textarea id="popupTaskDesc" placeholder="Task description"></textarea></div>
  </div>
  <div class="buttons-container">
    <button id="popupCancel">Cancel</button>
    <button id="popupAdd">Add</button>
  </div>
`;
document.body.appendChild(taskPopup);

// Popup Buttons
document.getElementById('popupCancel').addEventListener('click', () => taskPopup.style.display = 'none');

document.getElementById('popupAdd').addEventListener('click', () => {
  const title = document.getElementById('popupTaskTitle').value.trim();
  const date = document.getElementById('popupTaskDate').value;
  const time = document.getElementById('popupTaskTime').value;
  const desc = document.getElementById('popupTaskDesc').value.trim();
  if (!title || !date) { showPopup("Enter title and date"); return; }
  const datetime = time ? `${date}T${time}` : date;
  const tasks = loadTasks();
  tasks.push({ title, date: datetime, description: desc });
  saveTasks(tasks);
  calendar.refetchEvents();
  taskPopup.style.display = 'none';
  showPopup("Task added");
});

// ===== View Task Popup =====
closeViewTask.addEventListener('click', () => viewTaskPopup.style.display='none');

// ===== Initialize Calendar =====
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: { left:'prev,next today', center:'title', right:'addTaskButton dayGridMonth,timeGridWeek,timeGridDay' },
    customButtons: { addTaskButton: { text:'Add Task', click: () => taskPopup.style.display='block' } },
    events: (fetchInfo, success) => {
      const tasks = loadTasks();
      success(tasks.map(t => ({ title:t.title, start:t.date, extendedProps:{description:t.description||''} })));
    },
    eventClick: info => {
      const task = info.event;
      const dt = new Date(task.start);
      const date = dt.toLocaleDateString();
      const time = dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      document.getElementById('viewTaskTitle').textContent = task.title;
      document.getElementById('viewTaskDate').textContent = date;
      document.getElementById('viewTaskTime').textContent = time;
      document.getElementById('viewTaskDesc').textContent = task.extendedProps.description;
      viewTaskPopup.style.display = 'block';
    }
  });
  calendar.render();
}

// ===== DOMContentLoaded =====
window.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();

  document.getElementById('addRowButton').addEventListener('click', addRow);
  document.getElementById('addColumnButton').addEventListener('click', addColumn);
  document.getElementById('removeRowButton').addEventListener('click', startRemoveRow);
  document.getElementById('removeColumnButton').addEventListener('click', startRemoveColumn);

  aboutButton.addEventListener('click', e => { e.stopPropagation(); aboutDropdown.classList.toggle('show'); });
  document.addEventListener('click', () => aboutDropdown.classList.remove('show'));

  plannerTab.addEventListener('click', showPlanner);
  calendarTab.addEventListener('click', showCalendar);

  initCalendar();
});
