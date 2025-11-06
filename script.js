const video = document.getElementById("gameVideo");
const videoUpload = document.getElementById("videoUpload");
const canvas = document.getElementById("pitchCanvas");
const ctx = canvas.getContext("2d");
const playerInput = document.getElementById("playerInput");
const exportBtn = document.getElementById("exportCSV");
const addEventBtn = document.getElementById("addEvent");
const playerList = document.getElementById("playerList");
const eventTableBody = document.querySelector("#eventTable tbody");

// Lineup Modal
const openModalBtn = document.getElementById("openLineupModal");
const modal = document.getElementById("lineupModal");
const closeModal = modal.querySelector(".close");
const lineupInputsDiv = document.getElementById("lineupInputs");
const saveLineupBtn = document.getElementById("saveLineup");

let events = [];
let tempEvent = null;
let lineup = [];

let selectedEvent = null;
let selectedOutcome = null;
let selectedPossession = "";

// --- Video Upload ---
videoUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) video.src = URL.createObjectURL(file);
});

// --- Draw pitch ---
function drawPitch() {
  ctx.fillStyle = "#007a33";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, 2 * Math.PI);
  ctx.stroke();
}
drawPitch();

// --- Button selection ---
function setupButtons(className, callback) {
  document.querySelectorAll(`.${className}`).forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(`.${className}`).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      callback(btn.dataset[`${className.split("-")[0]}`]);
    });
  });
}
setupButtons("event-btn", val => selectedEvent = val);
setupButtons("outcome-btn", val => selectedOutcome = val);
setupButtons("possession-btn", val => selectedPossession = val);

// --- Pitch click (store temp event) ---
canvas.addEventListener("click", (e) => {
  if (!selectedEvent) return alert("Select an event type first!");

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const scaledX = (x / canvas.width) * 120;
  const scaledY = (y / canvas.height) * 80;

  // If first click, store start coordinates
  if (!tempEvent) {
    tempEvent = { startX: scaledX, startY: scaledY, canvasX: x, canvasY: y };
    drawMarker(x, y, "yellow");
  } else {
    // Second click sets end coordinates
    tempEvent.endX = scaledX;
    tempEvent.endY = scaledY;
    tempEvent.endCanvasX = x;
    tempEvent.endCanvasY = y;

    // Determine color based on event type
    const color = selectedEvent === "Pass" ? "red" : "blue";
    drawMarker(x, y, color);
  }
});

// --- Draw marker ---
function drawMarker(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

// --- Add Event Button ---
addEventBtn.addEventListener("click", () => {
    if (!tempEvent) return alert("Click on the pitch to mark the event first!");
    const player = playerInput.value || "Unknown";
  
    const event = {
      eventType: selectedEvent,
      player,
      startX: tempEvent.startX || tempEvent.endX,
      startY: tempEvent.startY || tempEvent.endY,
      endX: tempEvent.endX || tempEvent.startX,
      endY: tempEvent.endY || tempEvent.startY,
      time: video.currentTime.toFixed(2),
      outcome: selectedOutcome || "",
      possession: selectedPossession || ""
    };
  
    events.push(event);
    addRowToTable(event, events.length - 1);
  
    // Clear temporary marker and redraw canvas
    //tempEvent = null;
    clearTempMarkers();
});

// --- Add row to table ---
function addRowToTable(event, index) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${index + 1}</td>
    <td contenteditable="true">${event.player}</td>
    <td contenteditable="true">${event.eventType}</td>
    <td contenteditable="true">${event.startX},${event.startY}</td>
    <td contenteditable="true">${event.endX},${event.endY}</td>
    <td contenteditable="true">${event.outcome}</td>
    <td contenteditable="true">${event.possession}</td>
    <td>${event.time}</td>
    <td><button class="deleteBtn">Delete</button></td>
  `;

  // Delete button
  tr.querySelector(".deleteBtn").addEventListener("click", () => {
    events.splice(index, 1);
    updateTable();
  });

  // Editable cells update events array
  tr.querySelectorAll("td[contenteditable]").forEach((cell, i) => {
    cell.addEventListener("input", () => {
      switch(i) {
        case 0: break; // # not editable
        case 1: event.player = cell.textContent; break;
        case 2: event.eventType = cell.textContent; break;
        case 3: 
          const [sx, sy] = cell.textContent.split(",");
          event.startX = sx.trim(); event.startY = sy.trim();
          break;
        case 4:
          const [ex, ey] = cell.textContent.split(",");
          event.endX = ex.trim(); event.endY = ey.trim();
          break;
        case 5: event.outcome = cell.textContent; break;
        case 6: event.possession = cell.textContent; break;
      }
    });
  });

  eventTableBody.appendChild(tr);

  // auto scroll
  const container = document.querySelector(".event-table-container");
  container.scrollTop = container.scrollHeight;
}

// --- Update entire table after delete ---
function updateTable() {
  eventTableBody.innerHTML = "";
  events.forEach((ev, idx) => addRowToTable(ev, idx));
}

// --- Export CSV ---
exportBtn.addEventListener("click", () => {
  if (events.length === 0) return alert("No events tagged yet!");
  const header = ["eventType","player","startX","startY","endX","endY","time","outcome","possession"];
  const rows = events.map(ev => header.map(h => (ev[h] !== undefined ? ev[h] : "")).join(","));
  const csv = [header.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "events.csv";
  link.click();
});

// --- Lineup Modal ---
for (let i = 0; i < 18; i++) {
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = `Player ${i+1}`;
  lineupInputsDiv.appendChild(input);
}

openModalBtn.addEventListener("click", () => {
  const inputs = lineupInputsDiv.querySelectorAll("input");
  for (let i = 0; i < 18; i++) {
    inputs[i].value = lineup[i] || "";
  }
  modal.style.display = "block";
});

closeModal.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", e => { if (e.target == modal) modal.style.display = "none"; });

saveLineupBtn.addEventListener("click", () => {
  const inputs = lineupInputsDiv.querySelectorAll("input");
  lineup = [];
  inputs.forEach(input => {
    if (input.value.trim() !== "") lineup.push(input.value.trim());
  });

  playerList.innerHTML = "";
  lineup.forEach(player => {
    const option = document.createElement("option");
    option.value = player;
    playerList.appendChild(option);
  });

  modal.style.display = "none";
});

// ---redraw pitch
function clearTempMarkers() {
    // Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Redraw pitch only
    drawPitch();
  }

  // --- Show X,Y coordinates when hovering on pitch ---
const coordsDisplay = document.getElementById("coordsDisplay");

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 120; // scale to 120x80 pitch
  const y = ((e.clientY - rect.top) / rect.height) * 80;
  coordsDisplay.textContent = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}`;
});

canvas.addEventListener("mouseleave", () => {
  coordsDisplay.textContent = `X: –, Y: –`;
});