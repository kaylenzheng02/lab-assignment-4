// Aquarium
// Every released fish swims back and forth over an ocean photo.
// Each fish gets its own size and speed. Tap the tank to nudge fish away.

const socket = io();

const tank = document.getElementById("tank");
const pen = tank.getContext("2d");

const MAX_FISH = 20; // past this, the oldest fish swim out of the tank
const fishInTank = [];
const bubbles = [];
const stressMarks = []; // the angry 💢 marks that pop up where you tap

const background = new Image();
background.src = "assets/ocean.jpg";

let tankWidth = 0;
let tankHeight = 0;

function resizeTank() {
  tankWidth = tank.width = window.innerWidth;
  tankHeight = tank.height = window.innerHeight;
}
window.addEventListener("resize", resizeTank);
resizeTank();

// A random number between min and max
function random(min, max) {
  return min + Math.random() * (max - min);
}


// ---------- Fish ----------

// Fish take turns being small, medium and large, so the tank always has a mix.
// Small fish dart quickly, big fish cruise slowly.
const FISH_TYPES = [
  { name: "small",  length: [70, 100],  speed: [0.9, 1.4] },
  { name: "medium", length: [130, 170], speed: [0.5, 0.9] },
  { name: "large",  length: [210, 280], speed: [0.2, 0.45] },
];
let nextType = 0;

function pickFishType() {
  const type = FISH_TYPES[nextType];
  nextType = (nextType + 1) % FISH_TYPES.length;
  return type;
}

// swimIn = true: a new fish swims in from the side.
// swimIn = false: it was already in the tank when the page opened.
function addFish(image, swimIn) {
  const picture = new Image();

  picture.onload = () => {
    const type = pickFishType();
    const width = random(...type.length);
    const height = width * picture.height / picture.width;
    const direction = Math.random() < 0.5 ? 1 : -1; // 1 = right, -1 = left

    let x = random(width, tankWidth - width);
    if (swimIn) {
      x = direction === 1 ? -width : tankWidth + width; // just off screen
    }

    fishInTank.push({
      picture,
      width,
      height,
      x,
      y: random(tankHeight * 0.12, tankHeight * 0.6), // open water, above the sand
      direction,
      facing: direction,            // follows direction gradually, so turns look smooth
      speed: random(...type.speed), // each fish has its own pace
      offset: random(0, 10),        // so the fish don't all bob in step
      pushX: 0,                     // extra speed after being tapped
      pushY: 0,
      leaving: false,               // true once it's heading out of the tank
    });

    makeRoom();
  };

  picture.src = image;
}

// Too many fish? The oldest ones head for the nearest edge and swim away.
function makeRoom() {
  const staying = fishInTank.filter((fish) => !fish.leaving);
  const extra = staying.length - MAX_FISH;

  for (let i = 0; i < extra; i++) {
    const fish = staying[i]; // oldest first
    fish.leaving = true;
    fish.direction = fish.x < tankWidth / 2 ? -1 : 1;
    fish.speed *= 1.5;
  }
}

// Remove fish that have swum all the way out of the tank
function removeFishThatLeft() {
  for (let i = fishInTank.length - 1; i >= 0; i--) {
    const fish = fishInTank[i];
    const offScreen = fish.x < -fish.width || fish.x > tankWidth + fish.width;
    if (fish.leaving && offScreen) fishInTank.splice(i, 1);
  }
}

// step = 1 for one frame at 60fps, so fish move the same speed on any screen
function moveFish(fish, step) {
  // Swim the way the body is facing. During a turn, facing passes through 0,
  // so the fish slows down, stops, and heads off the other way (no swimming backwards).
  fish.x += (fish.facing * fish.speed + fish.pushX) * step;
  fish.y += fish.pushY * step;

  // A tap's push slowly wears off
  fish.pushX *= 0.97;
  fish.pushY *= 0.97;

  // Stay in the open water, above the sand
  const top = fish.height / 2 + 10;
  const bottom = tankHeight * 0.72;
  fish.y = Math.min(Math.max(fish.y, top), bottom);

  // Turn around near the walls, and very rarely just because
  // (fish that are leaving keep going straight out)
  const atRightWall = fish.direction === 1 && fish.x > tankWidth - fish.width;
  const atLeftWall = fish.direction === -1 && fish.x < fish.width;
  const feelsLikeTurning = Math.random() < 0.0005;

  if (!fish.leaving && (atRightWall || atLeftWall || feelsLikeTurning)) {
    fish.direction *= -1;
  }

  // Turn the body toward the new direction (takes about half a second)
  fish.facing += (fish.direction - fish.facing) * 0.1 * step;
}

function drawFish(fish, time) {
  const bob = Math.sin(time * 0.6 + fish.offset) * 6;

  // While turning, lift the nose a little, like a fish doing a U-turn.
  // turning is 0 when swimming straight and 1 halfway through a turn.
  const turning = 1 - Math.abs(fish.facing);
  const turnTilt = -fish.facing * turning * 0.6;
  const tilt = Math.sin(time * 0.6 + fish.offset) * 0.02 + turnTilt;

  const tailSwish = 1 + Math.sin(time * (1.5 + fish.speed * 2) + fish.offset) * 0.015;

  pen.save();
  pen.translate(fish.x, fish.y + bob);
  pen.rotate(tilt);
  // The drawing faces left, so flip it when the fish swims right
  pen.scale(-fish.facing * tailSwish, 1);
  pen.drawImage(fish.picture, -fish.width / 2, -fish.height / 2, fish.width, fish.height);
  pen.restore();
}


// ---------- Background and bubbles ----------

// Stretch the photo to cover the whole tank, cropping the edges if needed
function drawBackground() {
  if (!background.complete) return;

  const scale = Math.max(tankWidth / background.width, tankHeight / background.height);
  const width = background.width * scale;
  const height = background.height * scale;
  pen.drawImage(background, (tankWidth - width) / 2, (tankHeight - height) / 2, width, height);
}

function makeBubble(anywhere) {
  return {
    x: random(0, tankWidth),
    y: anywhere ? random(0, tankHeight) : tankHeight + 10, // new bubbles start at the bottom
    radius: random(2, 5),
    speed: random(0.2, 0.5),
    offset: random(0, 10),
  };
}

for (let i = 0; i < 15; i++) {
  bubbles.push(makeBubble(true));
}

function drawBubbles(time, step) {
  pen.strokeStyle = "rgba(255, 255, 255, 0.3)";
  pen.lineWidth = 1.5;

  bubbles.forEach((bubble, i) => {
    bubble.y -= bubble.speed * step;
    if (bubble.y < -10) bubbles[i] = makeBubble(false);

    const sway = Math.sin(time + bubble.offset) * 3;
    pen.beginPath();
    pen.arc(bubble.x + sway, bubble.y, bubble.radius, 0, Math.PI * 2);
    pen.stroke();
  });
}


// ---------- Tapping the tank ----------

tank.addEventListener("pointerdown", (event) => {
  stressMarks.push({ x: event.clientX, y: event.clientY, age: 0 });
  playBark();
  startMusic(); // only does anything on the first tap

  for (const fish of fishInTank) {
    if (fish.leaving) continue; // don't turn a leaving fish back around

    const dx = fish.x - event.clientX;
    const dy = fish.y - event.clientY;
    const distance = Math.hypot(dx, dy) || 1;

    if (distance < 250) {
      fish.direction = dx > 0 ? 1 : -1; // swim away from the tap
      fish.pushX = (dx / distance) * 3;
      fish.pushY = (dy / distance) * 1.2;
    }
  }
});

// Each mark pops in quickly, holds for a moment, then fades out (about 1 second total)
function drawStressMarks(step) {
  for (let i = stressMarks.length - 1; i >= 0; i--) {
    const mark = stressMarks[i];
    mark.age += step / 60; // in seconds

    if (mark.age > 1) {
      stressMarks.splice(i, 1);
      continue;
    }

    const popIn = Math.min(mark.age / 0.12, 1);              // 0 → 1 in the first 0.12s
    const size = 30 * (0.4 + 0.6 * popIn);
    const opacity = mark.age < 0.6 ? 1 : (1 - mark.age) / 0.4; // fade over the last 0.4s

    pen.save();
    pen.globalAlpha = opacity;
    drawStressMark(mark.x, mark.y, size);
    pen.restore();
  }
}

// The 💢 shape: four curved pieces arranged in a diamond, each bending in toward the middle
function drawStressMark(x, y, size) {
  const gap = size * 0.3; // space between the pieces

  pen.save();
  pen.translate(x, y);
  pen.lineCap = "round";

  for (let i = 0; i < 4; i++) {
    pen.beginPath();
    pen.moveTo(gap, -size);                // tip of one arm
    pen.quadraticCurveTo(gap, -gap, size, -gap); // bend in toward the center, out to the other arm

    pen.strokeStyle = "white";             // white edge so it stands out on the water
    pen.lineWidth = size * 0.42;
    pen.stroke();
    pen.strokeStyle = "#e3262d";           // red middle
    pen.lineWidth = size * 0.24;
    pen.stroke();

    pen.rotate(Math.PI / 2);               // next quarter
  }

  pen.restore();
}


// ---------- Bark sound ----------

// "Bark Huayra" by redpanal.org, CC BY-SA 3.0, via Wikimedia Commons
// https://commons.wikimedia.org/wiki/File:Bark_Huayra.ogg
const bark = new Audio("assets/bark.mp3");

function playBark() {
  const sound = bark.cloneNode(); // a fresh copy, so quick taps can overlap
  sound.volume = 0.7;
  sound.play().catch(() => {});   // if the browser blocks sound, just stay quiet
}


// ---------- Background music ----------

// Plays assets/music.mp3 on a loop, quietly, with the high sounds muffled
// so it sounds like it's coming through water.
// Browsers only allow sound after someone interacts with the page,
// so the music starts on the first tap.
const MUSIC_FILE = "assets/music.mp3";
const MUSIC_VOLUME = 0.35;   // 0 = silent, 1 = full volume
const UNDERWATER = 500;      // lower = more muffled (normal music goes up to ~20000)

let musicStarted = false;

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;

  const music = new Audio(MUSIC_FILE);
  music.loop = true;

  const sound = new AudioContext();
  const source = sound.createMediaElementSource(music);

  // Muffle: only let the low sounds through, like hearing music underwater
  const muffle = sound.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = UNDERWATER;

  // Slowly sway the muffling up and down, like moving water
  const sway = sound.createOscillator();
  sway.frequency.value = 0.15; // one full sway about every 7 seconds
  const swayAmount = sound.createGain();
  swayAmount.gain.value = UNDERWATER * 0.3;
  sway.connect(swayAmount);
  swayAmount.connect(muffle.frequency);
  sway.start();

  const volume = sound.createGain();
  volume.gain.value = MUSIC_VOLUME;

  // music → muffle → volume → speakers
  source.connect(muffle);
  muffle.connect(volume);
  volume.connect(sound.destination);

  music.play().catch(() => console.log(`No background music found at ${MUSIC_FILE}`));
}


// ---------- Animation loop ----------

let lastTime = performance.now();

function animate(now) {
  // step = how many 60fps frames have passed (capped, in case the tab was hidden)
  const step = Math.min((now - lastTime) / (1000 / 60), 3);
  const time = now / 1000; // seconds, used for bobbing and swaying
  lastTime = now;

  drawBackground();

  for (const fish of fishInTank) {
    moveFish(fish, step);
    drawFish(fish, time);
  }
  removeFishThatLeft();

  drawBubbles(time, step);
  drawStressMarks(step);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);


// ---------- Server messages ----------

// Sent when the page connects (or reconnects): every fish already in the tank
socket.on("all-fish", (images) => {
  fishInTank.length = 0;
  images.forEach((image) => addFish(image, false));
});

socket.on("new-fish", (image) => addFish(image, true));
