// Eyes for the fish, drawn with simple shapes.
// Each eye draws itself centered on (0, 0), about `size` pixels across.
// Uses the circle() helper from patterns.js.

const EYES = {
  "round eye"(pen, size) {
    const r = size / 2;
    circle(pen, 0, 0, r, "white");
    pen.lineWidth = r * 0.15;
    pen.strokeStyle = "#111";
    pen.stroke();
    circle(pen, -r * 0.1, 0, r * 0.5, "#111");          // pupil
    circle(pen, -r * 0.25, -r * 0.2, r * 0.15, "white"); // shine
  },

  "googly eye"(pen, size) {
    const r = size / 2;
    circle(pen, 0, 0, r, "white");
    pen.lineWidth = r * 0.12;
    pen.strokeStyle = "#111";
    pen.stroke();
    circle(pen, -r * 0.25, r * 0.25, r * 0.45, "#111"); // pupil looking down and forward
  },

  "cute eye"(pen, size) {
    const r = size / 2;
    circle(pen, 0, 0, r, "#111");
    circle(pen, -r * 0.3, -r * 0.3, r * 0.32, "white"); // big shine
    circle(pen, r * 0.3, r * 0.3, r * 0.14, "white");   // small shine
  },

  "sleepy eye"(pen, size) {
    const r = size / 2;
    pen.strokeStyle = "#111";
    pen.lineWidth = r * 0.18;
    pen.lineCap = "round";

    // A closed eye: the bottom part of a circle, like ‿
    const centerY = -r * 0.4;
    const radius = r * 0.8;
    pen.beginPath();
    pen.arc(0, centerY, radius, Math.PI * 0.15, Math.PI * 0.85);
    pen.stroke();

    // Three eyelashes pointing down from the lid
    for (const angle of [0.3, 0.5, 0.7]) {
      const a = Math.PI * angle;
      pen.beginPath();
      pen.moveTo(Math.cos(a) * radius, centerY + Math.sin(a) * radius);
      pen.lineTo(Math.cos(a) * radius * 1.35, centerY + Math.sin(a) * radius * 1.35);
      pen.stroke();
    }
  },
};
