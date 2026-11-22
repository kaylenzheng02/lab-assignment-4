// Fish patterns for the "Random pattern" button.
// Each pattern paints the whole board. draw.js then trims it to the fish shape.
//
// Every pattern gets:
//   pen     - the canvas to paint on
//   width, height - the size of the board
//   colors  - three colors: [background, accent, accent]
//   random  - a seeded random function, so every board paints the exact same pattern

const PALETTES = [
  ["#ff7a00", "#ffffff", "#1d1d1d"], // clownfish
  ["#118ab2", "#06d6a0", "#ffd166"],
  ["#073b4c", "#ef476f", "#ffd166"],
  ["#3a86ff", "#8338ec", "#ff006e"],
  ["#4cc9f0", "#f72585", "#7209b7"],
  ["#e9c46a", "#2a9d8f", "#e76f51"],
  ["#fb5607", "#ffbe0b", "#3a86ff"],
  ["#277da1", "#90be6d", "#f9c74f"],
  ["#ffd6e0", "#ff8fab", "#7b2cbf"],
  ["#caf0f8", "#0077b6", "#03045e"],
];

const RAINBOW = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];

const PATTERNS = {
  stripes(pen, width, height, colors, random) {
    const stripeWidth = 35 + random() * 50;
    let i = 0;
    for (let x = 0; x < width; x += stripeWidth) {
      pen.fillStyle = colors[i % 3];
      pen.fillRect(x, 0, stripeWidth, height);
      i++;
    }
  },

  dots(pen, width, height, colors, random) {
    fillBackground(pen, width, height, colors[0]);
    const gap = 45 + random() * 35;
    let row = 0;
    for (let y = 0; y < height + gap; y += gap) {
      const shift = row % 2 === 0 ? 0 : gap / 2; // every other row is shifted
      for (let x = 0; x < width + gap; x += gap) {
        circle(pen, x + shift, y, gap * 0.28, colors[1 + (row % 2)]);
      }
      row++;
    }
  },

  scales(pen, width, height, colors, random) {
    fillBackground(pen, width, height, colors[0]);
    const radius = 22 + random() * 18;
    pen.lineWidth = 3;
    pen.strokeStyle = colors[2];
    let row = 0;
    for (let y = 0; y < height + radius; y += radius * 0.8) {
      const shift = row % 2 === 0 ? 0 : radius;
      for (let x = 0; x < width + radius * 2; x += radius * 2) {
        circle(pen, x + shift, y, radius, row % 2 === 0 ? colors[0] : colors[1]);
        pen.stroke();
      }
      row++;
    }
  },

  gradient(pen, width, height, colors, random) {
    const tilt = random() * height; // how diagonal the blend is
    const blend = pen.createLinearGradient(0, tilt, width, height - tilt);
    blend.addColorStop(0, colors[0]);
    blend.addColorStop(0.5, colors[1]);
    blend.addColorStop(1, colors[2]);
    pen.fillStyle = blend;
    pen.fillRect(0, 0, width, height);
  },

  zigzag(pen, width, height, colors, random) {
    fillBackground(pen, width, height, colors[0]);
    const size = 25 + random() * 25;
    pen.lineWidth = size * 0.5;
    pen.lineJoin = "round";
    let row = 0;
    for (let y = -size; y < height + size; y += size * 1.5) {
      pen.strokeStyle = colors[1 + (row % 2)];
      pen.beginPath();
      let up = true;
      for (let x = 0; x <= width + size; x += size) {
        pen.lineTo(x, up ? y : y + size);
        up = !up;
      }
      pen.stroke();
      row++;
    }
  },

  spots(pen, width, height, colors, random) {
    fillBackground(pen, width, height, colors[0]);
    for (let i = 0; i < 40; i++) {
      const x = random() * width;
      const y = random() * height;
      const radius = 10 + random() * 40;
      const color = random() < 0.5 ? colors[1] : colors[2];
      circle(pen, x, y, radius, color);
    }
  },

  waves(pen, width, height, colors, random) {
    fillBackground(pen, width, height, colors[0]);
    const gap = 40 + random() * 30;
    const waveHeight = 10 + random() * 15;
    pen.lineWidth = gap * 0.4;
    pen.lineCap = "round";
    let row = 0;
    for (let y = 0; y < height + gap; y += gap) {
      pen.strokeStyle = colors[1 + (row % 2)];
      pen.beginPath();
      for (let x = 0; x <= width; x += 10) {
        pen.lineTo(x, y + Math.sin(x / 50) * waveHeight);
      }
      pen.stroke();
      row++;
    }
  },

  checkers(pen, width, height, colors, random) {
    const size = 35 + random() * 40;
    for (let row = 0; row * size < height; row++) {
      for (let col = 0; col * size < width; col++) {
        pen.fillStyle = (row + col) % 2 === 0 ? colors[0] : colors[1];
        pen.fillRect(col * size, row * size, size, size);
      }
    }
  },

  rainbow(pen, width, height) {
    const bandWidth = width / RAINBOW.length;
    RAINBOW.forEach((color, i) => {
      pen.fillStyle = color;
      pen.fillRect(i * bandWidth, 0, bandWidth + 1, height);
    });
  },
};


// ---------- Helpers ----------

function fillBackground(pen, width, height, color) {
  pen.fillStyle = color;
  pen.fillRect(0, 0, width, height);
}

function circle(pen, x, y, radius, color) {
  pen.fillStyle = color;
  pen.beginPath();
  pen.arc(x, y, radius, 0, Math.PI * 2);
  pen.fill();
}

// A random number generator that always gives the same numbers for the same seed.
// That way every board that receives the pattern paints it identically.
function makeRandom(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
