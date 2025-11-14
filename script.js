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
let selectedBodyPart = "";

let pitchWidth = 110;  // meters
let pitchHeight = 75;  // meters

// --- Video Upload ---
videoUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) video.src = URL.createObjectURL(file);
});

// --- Skip Forward ---

document.addEventListener("keydown", (e) => {
  const skipAmount = e.shiftKey ? 10 : 5; // hold SHIFT to skip 10s instead of 5s
  if (e.code === "ArrowRight") {
    video.currentTime = Math.min(video.duration, video.currentTime + skipAmount);
  } else if (e.code === "ArrowLeft") {
    video.currentTime = Math.max(0, video.currentTime - skipAmount);
  } else if (e.code === "Space") {
    e.preventDefault();
    if (video.paused) video.play();
    else video.pause();
  }
});

// --- Draw pitch ---
function drawPitch() {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");

  const scaleX = w / pitchWidth;
  const scaleY = h / pitchHeight;

  // Background
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#007a33";
  ctx.fillRect(0, 0, w, h);

  // Outer lines
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();

  // Center circle (radius scaled to pitch)
  const centerCircleRadius = 10 * scaleX; // use width scale
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, centerCircleRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Penalty & 6-yard boxes (scaled)
  const penaltyBoxWidth = 45 * scaleY;   // box vertical size (in canvas px)
  const penaltyBoxDepth = 18 * scaleX;  // box horizontal depth (in canvas px)
  const sixYardBoxWidth = 20 * scaleY;
  const sixYardBoxDepth = 6 * scaleX;

  // Left penalty box
  ctx.strokeRect(0, (h - penaltyBoxWidth) / 2, penaltyBoxDepth, penaltyBoxWidth);
  // Right penalty box
  ctx.strokeRect(w - penaltyBoxDepth, (h - penaltyBoxWidth) / 2, penaltyBoxDepth, penaltyBoxWidth);
  // Left 6-yard box
  ctx.strokeRect(0, (h - sixYardBoxWidth) / 2, sixYardBoxDepth, sixYardBoxWidth);
  // Right 6-yard box
  ctx.strokeRect(w - sixYardBoxDepth, (h - sixYardBoxWidth) / 2, sixYardBoxDepth, sixYardBoxWidth);

  // Penalty spots
  const penaltySpotLeft = 12 * scaleX;
  const penaltySpotRight = w - penaltySpotLeft;
  ctx.beginPath();
  ctx.arc(penaltySpotLeft, h / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(penaltySpotRight, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Arcs at top of penalty area — fixed so they open toward centre
  const arcRadius = 10 * scaleX; // same as center circle radius (9.15m)
  // LEFT arc: opens to the RIGHT (toward center) => angles from -PI/2 to +PI/2
  ctx.beginPath();
  ctx.arc(penaltySpotLeft, h / 2, arcRadius, -Math.PI / 2 + Math.PI/5, Math.PI / 2 - Math.PI/5, false);
  ctx.stroke();
  // RIGHT arc: opens to the LEFT => angles from PI/2 to 3*PI/2
  ctx.beginPath();
  ctx.arc(penaltySpotRight, h / 2, arcRadius, Math.PI / 2 + Math.PI/5, (3 * Math.PI) / 2 - Math.PI/5, false);
  ctx.stroke();

  // Third lines
  ctx.strokeStyle = "blue";
  ctx.beginPath();
  ctx.moveTo(w*0.6818, 0);
  ctx.lineTo(w*0.6818, h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w*0.31818, 0);
  ctx.lineTo(w*0.31818, h);
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
setupButtons("bodypart-btn", val => selectedBodyPart = val);

// --- Pitch click (store temp event) ---
canvas.addEventListener("click", (e) => {
  if (!selectedEvent) return alert("Select an event type first!");

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const scaledX = (x / canvas.width) * pitchWidth;
  const scaledY = (y / canvas.height) * pitchHeight;

  // For single-point events, just store one click
  if (selectedEvent === "Tackle" || selectedEvent === "Error") {
    tempEvent = {
      type: selectedEvent,
      startX: scaledX,
      startY: scaledY,
      canvasX: x,
      canvasY: y,
      endX: "",
      endY: "",
      time: video.currentTime.toFixed(2),
    };
    drawMarker(x, y, "blue");
    return;
  }

  // If first click, store start coordinates
  if (!tempEvent) {
    tempEvent = {
      startX: scaledX,
      startY: scaledY,
      canvasX: x,
      canvasY: y,
      time: video.currentTime.toFixed(2)  
    };
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
    if ((!tempEvent) || (tempEvent.endX == undefined && (selectedEvent !== "Tackle" && selectedEvent !== "Error"))) {
      return alert("Click on the pitch to mark the event first!");
    }
    const player = playerInput.value || "Unknown";
  
    const event = {
      eventType: selectedEvent,
      player,
      startX: tempEvent.startX,
      startY: tempEvent.startY,
      endX: tempEvent.endX,
      endY: tempEvent.endY,
      time: video.currentTime.toFixed(2),
      outcome: selectedOutcome || "",
      possession: selectedPossession || "",
      bodypart: selectedBodyPart || ""
    };
  
    events.push(event);
    addRowToTable(event, events.length - 1);
  
    // Clear temporary marker and redraw canvas
    tempEvent = null;
    clearTempMarkers();

    document.querySelectorAll(".active").forEach(b => b.classList.remove("active"));
    selectedBodyPart = "";
    selectedEvent = null;
    selectedOutcome = null;
    selectedPossession = "";
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
    <td contenteditable="true">${event.bodypart}</td>
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
        case 7: event.bodypart = cell.textContent; break;
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
  const header = ["eventType","player","startX","startY","endX","endY","time","outcome","possession", "bodypart"];
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

  const playerButtonsContainer = document.getElementById("playerButtons");

function renderPlayerButtons() {
  playerButtonsContainer.innerHTML = "";

  lineup.forEach(player => {
    const btn = document.createElement("button");
    btn.textContent = player;
    btn.className = "player-btn";
    btn.style.padding = "6px 10px";
    btn.style.borderRadius = "8px";
    btn.style.border = "1px solid #ccc";
    btn.style.cursor = "pointer";
    btn.style.backgroundColor = "#f0f0f0";

    btn.addEventListener("click", () => {
      playerInput.value = player;
      highlightActiveButton(player);
    });

    playerButtonsContainer.appendChild(btn);
  });
}

function highlightActiveButton(selected) {
  const buttons = document.querySelectorAll(".player-btn");
  buttons.forEach(btn => {
    if (btn.textContent === selected) {
      btn.style.backgroundColor = "#4CAF50";
      btn.style.color = "white";
    } else {
      btn.style.backgroundColor = "#f0f0f0";
      btn.style.color = "black";
    }
  });
}

  // Update datalist (still useful for typing)
  playerList.innerHTML = "";
  lineup.forEach(player => {
    const option = document.createElement("option");
    option.value = player;
    playerList.appendChild(option);
  });

  // Create clickable player buttons
  renderPlayerButtons();

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
  const x = ((e.clientX - rect.left) / rect.width) * pitchWidth; // scale to 120x80 pitch
  const y = ((e.clientY - rect.top) / rect.height) * pitchHeight;
  coordsDisplay.textContent = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}`;
});

canvas.addEventListener("mouseleave", () => {
  coordsDisplay.textContent = `X: –, Y: –`;
});