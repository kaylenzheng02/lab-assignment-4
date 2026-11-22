// Drawing board
// Color inside the fish outline, or fill it with a random pattern.
// Every open board shows the same fish, and "Release" sends it to the aquarium.
// PATTERNS, PALETTES, makeRandom and pickRandom come from patterns.js.

const socket = io();
const ROOM = "board1";

const COLORS = [
  "#ff7a00", "#ffd166", "#ef476f", "#f72585", "#8338ec",
  "#3a86ff", "#06d6a0", "#2a9d8f", "#1d1d1d", "#ffffff",
];

// ---- Page elements ----
const board = document.getElementById("board");     // the coloring
const outline = document.getElementById("outline"); // the black fish outline, on top
const swatches = document.getElementById("swatches");
const customColor = document.getElementById("custom-color");
const sizeSlider = document.getElementById("size");
const sizeDot = document.getElementById("size-dot");
const brushButton = document.getElementById("brush");
const eraserButton = document.getElementById("eraser");
const randomButton = document.getElementById("randomize");
const clearButton = document.getElementById("clear");
const releaseButton = document.getElementById("release");
const toast = document.getElementById("toast");

const pen = board.getContext("2d");
const WIDTH = board.width;
const HEIGHT = board.height;

// White inside the fish, see-through outside it. Used to keep coloring inside the lines.
const fishShape = document.createElement("canvas");
fishShape.width = WIDTH;
fishShape.height = HEIGHT;

let currentColor = COLORS[0];
let isErasing = false;
let isDrawing = false;
let lastPoint = null;


// ---------- Fish outline ----------

// Load the fish picture, then work out which pixels are inside the fish
async function setUpFish() {
  const picture = await loadImage("/fish-outline.png");
  const pixels = getPixels(picture);
  const outside = findOutside(pixels);

  const shape = new ImageData(WIDTH, HEIGHT);
  const lines = new ImageData(WIDTH, HEIGHT);

  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    // Inside the fish: white
    if (!outside[i]) {
      shape.data.set([255, 255, 255, 255], i * 4);
    }
    // The outline: black, more see-through where the picture is lighter
    lines.data[i * 4 + 3] = 255 - brightness(pixels, i);
  }

  fishShape.getContext("2d").putImageData(shape, 0, 0);
  outline.getContext("2d").putImageData(lines, 0, 0);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = src;
  });
}

// Draw the image at board size and return its pixels (4 numbers per pixel: R, G, B, A)
function getPixels(image) {
  const temp = document.createElement("canvas");
  temp.width = WIDTH;
  temp.height = HEIGHT;
  const tempPen = temp.getContext("2d");
  tempPen.drawImage(image, 0, 0, WIDTH, HEIGHT);
  return tempPen.getImageData(0, 0, WIDTH, HEIGHT).data;
}

function brightness(pixels, i) {
  return (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3;
}

// Flood fill from the edges of the picture. Every pixel it can reach
// without crossing the black outline is outside the fish.
function findOutside(pixels) {
  const outside = new Uint8Array(WIDTH * HEIGHT);
  const toVisit = [];

  // Start from every pixel along the four edges
  for (let x = 0; x < WIDTH; x++) {
    toVisit.push(x, (HEIGHT - 1) * WIDTH + x);
  }
  for (let y = 0; y < HEIGHT; y++) {
    toVisit.push(y * WIDTH, y * WIDTH + WIDTH - 1);
  }

  while (toVisit.length > 0) {
    const i = toVisit.pop();
    const isOutline = brightness(pixels, i) < 160;
    if (outside[i] || isOutline) continue;

    outside[i] = 1;

    // Visit the neighbors: left, right, up, down
    const x = i % WIDTH;
    if (x > 0) toVisit.push(i - 1);
    if (x < WIDTH - 1) toVisit.push(i + 1);
    if (i >= WIDTH) toVisit.push(i - WIDTH);
    if (i < WIDTH * (HEIGHT - 1)) toVisit.push(i + WIDTH);
  }

  return outside;
}


// ---------- Painting the board ----------

// Everything drawn is an "item": either a line or a whole-fish pattern.
// The same items are sent to the other boards, so they all match.
function drawItem(item) {
  if (item.type === "pattern") {
    drawPattern(item);
  } else {
    drawLine(item);
  }
  keepInsideFish();
}

// Points are stored as fractions (0 to 1) of the board,
// so boards of different sizes all line up.
function drawLine(line) {
  pen.globalCompositeOperation = line.erase ? "destination-out" : "source-over";
  pen.strokeStyle = line.color;
  pen.lineWidth = line.size;
  pen.lineCap = "round";

  pen.beginPath();
  pen.moveTo(line.from.x * WIDTH, line.from.y * HEIGHT);
  pen.lineTo(line.to.x * WIDTH, line.to.y * HEIGHT);
  pen.stroke();
}

function drawPattern(pattern) {
  clearBoard();
  pen.globalCompositeOperation = "source-over";
  const paint = PATTERNS[pattern.name];
  paint(pen, WIDTH, HEIGHT, pattern.colors, makeRandom(pattern.seed));
}

// Cut away anything that went outside the fish
function keepInsideFish() {
  pen.globalCompositeOperation = "destination-in";
  pen.drawImage(fishShape, 0, 0);
  pen.globalCompositeOperation = "source-over";
}

function clearBoard() {
  pen.clearRect(0, 0, WIDTH, HEIGHT);
}

// Draw it here, then send it to everyone else on this board
function addItem(item) {
  drawItem(item);
  socket.emit("draw", { room: ROOM, item });
}


// ---------- Drawing with the mouse or a finger ----------

// Mouse/finger position as fractions (0 to 1) of the board
function getPoint(event) {
  const rect = board.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

board.addEventListener("pointerdown", (event) => {
  isDrawing = true;
  lastPoint = getPoint(event);
  board.setPointerCapture(event.pointerId);
});

board.addEventListener("pointermove", (event) => {
  if (!isDrawing) return;

  const point = getPoint(event);
  addItem({
    type: "line",
    from: lastPoint,
    to: point,
    color: currentColor,
    size: Number(sizeSlider.value),
    erase: isErasing,
  });
  lastPoint = point;
});

board.addEventListener("pointerup", () => (isDrawing = false));
board.addEventListener("pointercancel", () => (isDrawing = false));


// ---------- Colors, brush size and tools ----------

// One round button per color
COLORS.forEach((color) => {
  const button = document.createElement("button");
  button.className = "swatch";
  button.style.background = color;
  button.title = color;
  button.addEventListener("click", () => chooseColor(color, button));
  swatches.insertBefore(button, swatches.lastElementChild); // keep the rainbow picker last
});

customColor.addEventListener("input", () => {
  chooseColor(customColor.value, customColor.parentElement);
});

function chooseColor(color, swatch) {
  currentColor = color;
  document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("selected"));
  swatch.classList.add("selected");
  chooseTool("brush"); // picking a color means you want to draw
}

// Show a dot the size and color of the brush
function updateSizeDot() {
  const size = Number(sizeSlider.value) / 2 + 2;
  sizeDot.style.width = `${size}px`;
  sizeDot.style.height = `${size}px`;
  sizeDot.style.background = isErasing ? "white" : currentColor;
}

sizeSlider.addEventListener("input", updateSizeDot);

function chooseTool(tool) {
  isErasing = tool === "eraser";
  brushButton.classList.toggle("active", !isErasing);
  eraserButton.classList.toggle("active", isErasing);
  updateSizeDot();
}

brushButton.addEventListener("click", () => chooseTool("brush"));
eraserButton.addEventListener("click", () => chooseTool("eraser"));


// ---------- Buttons ----------

randomButton.addEventListener("click", () => {
  addItem({
    type: "pattern",
    name: pickRandom(Object.keys(PATTERNS)),
    colors: pickRandom(PALETTES),
    seed: Math.floor(Math.random() * 1000000),
  });
});

clearButton.addEventListener("click", () => {
  socket.emit("clear", ROOM);
});

releaseButton.addEventListener("click", () => {
  if (!hasColor()) {
    showToast("Color in the fish first!");
    return;
  }

  releaseButton.disabled = true;
  socket.emit("release", { image: makeFishImage() }, (arrived) => {
    releaseButton.disabled = false;
    if (arrived) {
      socket.emit("clear", ROOM); // a fresh fish for the next person
      showToast("Released! Your fish is swimming in the aquarium.");
    } else {
      showToast("Couldn't reach the aquarium. Is the aquarium server running?");
    }
  });
});

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// True if any pixel on the board has been colored
function hasColor() {
  const pixels = pen.getImageData(0, 0, WIDTH, HEIGHT).data;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return true;
  }
  return false;
}

// The finished fish: a white body with the coloring on top (no black outline)
function makeFishImage() {
  const fish = document.createElement("canvas");
  fish.width = 300;
  fish.height = Math.round(300 * HEIGHT / WIDTH);

  const fishPen = fish.getContext("2d");
  fishPen.drawImage(fishShape, 0, 0, fish.width, fish.height);
  fishPen.drawImage(board, 0, 0, fish.width, fish.height);

  return fish.toDataURL("image/png");
}


// ---------- Server messages ----------

socket.on("draw", drawItem);
socket.on("clear", clearBoard);
socket.on("history", (items) => {
  clearBoard();
  items.forEach(drawItem);
});

// Start: select the first color, then join the board once the outline is ready
// (and again after any reconnect)
chooseColor(COLORS[0], swatches.firstElementChild);

setUpFish().then(() => {
  socket.on("connect", () => socket.emit("join-board", ROOM));
  if (socket.connected) socket.emit("join-board", ROOM);
});
