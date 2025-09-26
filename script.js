const table = document.getElementById("tableInput");
const aboutButton = document.getElementById("aboutButton");
const aboutDropdown = document.getElementById("aboutDropdown");

const plannerTab = document.getElementById("plannerTab");
const calendarTab = document.getElementById("calendarTab");
const plannerSection = document.getElementById("plannerSection");
const calendarSection = document.getElementById("calendarSection");

let rowDeleteMode = false;
let columnDeleteMode = false;
let calendar;

// Load saved table data on page load
window.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();

  // Attach button event listeners here instead of inline onclick
  document.getElementById('addRowButton').addEventListener('click', addRow);
  document.getElementById('addColumnButton').addEventListener('click', addColumn);
  document.getElementById('removeRowButton').addEventListener('click', startRemoveRow);
  document.getElementById('removeColumnButton').addEventListener('click', startRemoveColumn);

  // About dropdown toggle
  aboutButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling to document
    aboutDropdown.classList.toggle('show');
  });

  // Close dropdown if clicking outside
  document.addEventListener('click', () => {
    aboutDropdown.classList.remove('show');
  });

  // Tab switching
  plannerTab.addEventListener('click', showPlanner);
  calendarTab.addEventListener('click', showCalendar);

  // Initialize calendar
  initCalendar();
});

// Helper function to show popup messages inside the page
function showPopup(message, duration = 3000) {
  const popup = document.getElementById('popupMessage');
  if (!popup) return; // safety check

  popup.textContent = message;
  popup.style.display = 'block';

  setTimeout(() => {
    popup.style.display = 'none';
  }, duration);
}

// Show planner section
function showPlanner() {
  plannerSection.style.display = 'block';
  calendarSection.style.display = 'none';
}

// Show calendar section and render
function showCalendar() {
  plannerSection.style.display = 'none';
  calendarSection.style.display = 'block';
  calendar.refetchEvents();
}

// Row/column deletion
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

// Add a new row
function addRow() {
  const firstRow = table.rows[0];
  const numColumns = firstRow ? firstRow.cells.length : 1;

  const newRow = table.insertRow();

  for (let i = 0; i < numColumns; i++) {
    const newCell = newRow.insertCell();
    newCell.textContent = '';
  }

  saveToLocalStorage();
}

// Add a new column
function addColumn() {
  const rowCount = table.rows.length;

  for (let i = 0; i < rowCount; i++) {
    const newCell = table.rows[i].insertCell();
    newCell.textContent = '';
  }

  saveToLocalStorage();
}

// Save table data to localStorage
function saveToLocalStorage() {
  const data = [];

  for (let row of table.rows) {
    const rowData = [];
    for (let cell of row.cells) {
      rowData.push(cell.textContent);
    }
    data.push(rowData);
  }

  localStorage.setItem("tableData", JSON.stringify(data));
}

// Load table data from localStorage
function loadFromLocalStorage() {
  const saved = localStorage.getItem("tableData");
  if (!saved) return;

  const data = JSON.parse(saved);

  // Clear existing table
  while (table.rows.length > 0) {
    table.deleteRow(0);
  }

  for (let rowData of data) {
    const row = table.insertRow();
    for (let cellData of rowData) {
      const cell = row.insertCell();
      cell.textContent = cellData;
    }
  }
}

// Edit cell on click (except when in delete mode)
function editCell(cell) {
  if (cell.querySelector('input')) return; // Prevent multiple inputs

  const originalValue = cell.textContent;
  cell.innerHTML = `<input type="text" value="${originalValue}">`;
  const input = cell.querySelector('input');
  input.focus();

  input.addEventListener('blur', () => {
    cell.textContent = input.value;
    saveToLocalStorage();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur(); // Save on Enter
    }
  });
}

// Table click event handling for delete modes and editing
table.addEventListener('click', function(event) {
  // Row deletion mode
  if (rowDeleteMode) {
    const clickedRow = event.target.closest('tr');
    if (clickedRow) {
      const rowIndex = Array.from(table.rows).indexOf(clickedRow);
      if (rowIndex > -1) {
        table.deleteRow(rowIndex);
        saveToLocalStorage();
      }
    }
    rowDeleteMode = false;
    table.classList.remove('row-delete-mode');
    showPopup("Row deleted. Deletion mode off.");
    return;
  }

  // Column deletion mode
  if (columnDeleteMode) {
    const clickedCell = event.target.closest('td, th');
    if (clickedCell) {
      const row = clickedCell.parentElement;
      const cellIndex = Array.from(row.cells).indexOf(clickedCell);
      if (cellIndex > -1) {
        for (let i = 0; i < table.rows.length; i++) {
          if (table.rows[i].cells.length > cellIndex) {
            table.rows[i].deleteCell(cellIndex);
          }
        }
        saveToLocalStorage();
      }
    }
    columnDeleteMode = false;
    table.classList.remove('column-delete-mode');
    showPopup("Column deleted. Deletion mode off.");
    return;
  }

  // Normal cell editing (only if clicking on TD)
  if (event.target.tagName === 'TD') {
    editCell(event.target);
  }
});

// Column highlight on hover (keep separate from your click handler)
table.addEventListener('mouseover', (e) => {
  if (!columnDeleteMode) return;

  const cell = e.target.closest('td, th');
  if (!cell) return;

  const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);

  // Highlight all cells in this column
  for (let row of table.rows) {
    if (row.cells[cellIndex]) {
      row.cells[cellIndex].classList.add('column-hover');
    }
  }
});

table.addEventListener('mouseout', (e) => {
  if (!columnDeleteMode) return;

  // Remove highlight from all cells
  for (let row of table.rows) {
    for (let cell of row.cells) {
      cell.classList.remove('column-hover');
    }
  }
});


// Initialize FullCalendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: function(fetchInfo, successCallback, failureCallback) {
  const tasks = loadTasks();

  const events = tasks.map(task => ({
    title: task.title,
    start: task.date
  }));

  successCallback(events);
}
  });
  calendar.render();
}

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

// Save tasks to localStorage
function saveTasks(tasks) {
  localStorage.setItem("calendarTasks", JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadTasks() {
  const saved = localStorage.getItem("calendarTasks");
  return saved ? JSON.parse(saved) : [];
}

// Add task button event
document.getElementById("addTaskButton").addEventListener("click", () => {
  const title = document.getElementById("taskTitle").value.trim();
  const date = document.getElementById("taskDate").value;

  if (!title || !date) {
    showPopup("Please enter both title and date");
    return;
  }

  // Add task
  const tasks = loadTasks();
  tasks.push({ title, date });
  saveTasks(tasks);

  // Refresh calendar events
  calendar.refetchEvents();

  // Clear inputs
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDate").value = "";

  showPopup("Task added to calendar");
});
  s
