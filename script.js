const table = document.getElementById("tableInput");
const aboutButton = document.getElementById("aboutButton");
const aboutDropdown = document.getElementById("aboutDropdown");

let rowDeleteMode = false;
let columnDeleteMode = false;

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
