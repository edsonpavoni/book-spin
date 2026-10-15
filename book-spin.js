/*! book-spin · a book standing on one corner, turning on its axis · CSS 3D, no dependencies · MIT · github.com/edsonpavoni/book-spin
 *
 * <book-spin front="front.jpg" spine="spine.jpg" back="back.jpg" pages="240" edge="cream"></book-spin>
 *
 * front / spine / back  image URLs (spine and back optional: a colour from the cover is used instead)
 * pages     page count (sides), sets the thickness             default 200
 * paper     thickness of one leaf, mm                           default 0.1  (80 g/m² offset)
 * trim      width x height in mm, e.g. "152x229"                default: front image ratio, 229 mm high
 * edge      white | cream | gold | silver | black | any CSS colour   default white
 * gloss     0–1, highlight on the covers                        default 0.25
 * tilt      degrees the book leans onto its corner              default 35
 * camera    degrees the camera looks down                       default 10
 * speed     seconds per turn                                    default 6.6
 * shadow    0–1                                                 default 1
 * light     "direction,height" in degrees: direction 0 = from the viewer, -90 = left, 90 = right, 180 = behind;
 *           height 0 = horizon, 90 = straight above. The shadow falls the other way.   default "-40,50"
 * The background is transparent. The book fills the element's height; give the element a size.
 */
(() => {
  const EDGES = {
    white: ["#f5f3ee", "#e4e1d8"], cream: ["#efe5cc", "#ddd0b0"], black: ["#2a2a2a", "#111"],
    gold: ["#f1d68a", "#b8913c"], silver: ["#eef0f2", "#a9adb3"],
  };
  const N = 72;                                            // keyframe steps per turn for the light
  function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
  const num = (el, k, d) => { const v = parseFloat(el.getAttribute(k)); return Number.isFinite(v) ? v : d; };
  const css = String.raw;

  // average colour of an image strip (x0..x1 as fractions), for covers without a spine/back image and the cover's edge
  function sample(img, x0 = 0, x1 = 1) {
    try {
      const c = document.createElement("canvas"); c.width = 16; c.height = 16;
      const g = c.getContext("2d"); const w = img.naturalWidth;
      g.drawImage(img, w * x0, 0, Math.max(1, w * (x1 - x0)), img.naturalHeight, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data; let r = 0, gg = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4; return `rgb(${r / n | 0},${gg / n | 0},${b / n | 0})`;
    } catch { return "#222"; }                               // tainted canvas (cross-origin image): a neutral cover colour
  }
  const load = (src) => new Promise((ok) => {
    if (!src) return ok(null);
    const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src;
  });

  class BookSpin extends HTMLElement {
    static get observedAttributes() { return ["front", "spine", "back", "pages", "paper", "trim", "edge", "gloss", "tilt", "camera", "speed", "shadow", "light"]; }
    constructor() { super(); this.attachShadow({ mode: "open" }); }
    connectedCallback() {
      this.ro = new ResizeObserver(() => this.render()); this.ro.observe(this);
      this.io = new IntersectionObserver(([e]) => this.toggleAttribute("data-off", !e.isIntersecting)); this.io.observe(this);
    }
    disconnectedCallback() { this.ro?.disconnect(); this.io?.disconnect(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }

    async render() {
      const ticket = (this.ticket = (this.ticket || 0) + 1);
      const [front, spine, back] = await Promise.all(["front", "spine", "back"].map((k) => load(this.getAttribute(k))));
      if (ticket !== this.ticket) return;
      const box = this.getBoundingClientRect(); if (!box.height) return;

      // ---- real size (mm) ----
      const trim = (this.getAttribute("trim") || "").match(/([\d.]+)\s*[x×]\s*([\d.]+)/);
      let Hm = trim ? +trim[2] : 229, Wm = trim ? +trim[1] : front ? Hm * front.naturalWidth / front.naturalHeight : 152;
      const Tm = num(this, "pages", 200) / 2 * num(this, "paper", 0.1) + 0.6;          // leaves × caliper + two covers
      const tilt = num(this, "tilt", 35) * Math.PI / 180;

      // ---- pose: lean onto the lowest corner; that corner is the pivot on the floor ----
      const s = Math.sin(tilt), c = Math.cos(tilt);
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * Wm / 2, b * Hm / 2]);
      const rot = ([x, y]) => [x * c - y * s, x * s + y * c];
      const [px, py] = corners.reduce((m, p) => (rot(p)[1] > rot(m)[1] ? p : m));
      const xs = corners.map((p) => rot([p[0] - px, p[1] - py])), ys = xs.map((p) => p[1]), xx = xs.map((p) => p[0]);
      const tall = Math.max(...ys) - Math.min(...ys), wide = Math.max(...xx) - Math.min(...xx);
      const u = Math.min(box.height * 0.8 / tall, box.width * 0.8 / Math.max(wide, Hm, Wm));   // px per mm; fits every angle
      const W = Wm * u, H = Hm * u, T = Math.max(2, Tm * u), cover = Math.max(0.6, 0.3 * u);

      // ---- colours ----
      const edgeAttr = (this.getAttribute("edge") || "white").trim().toLowerCase();
      const [e1, e2] = EDGES[edgeAttr] || [edgeAttr, `color-mix(in srgb, ${edgeAttr} 70%, black)`];
      const metal = edgeAttr === "gold" || edgeAttr === "silver";
      const fc = front ? sample(front, 0.9, 1) : "#222", bc = back ? sample(back, 0, 0.1) : fc, sc = front ? sample(front, 0, 0.1) : fc;
      // light: toward the light, y is down
      const [laz, lel] = ((this.getAttribute("light") || "-40,50").split(",").map(Number).concat([NaN, NaN]))
        .slice(0, 2).map((v, i) => (Number.isFinite(v) ? v : [-40, 50][i]) * Math.PI / 180);
      const el = Math.min(Math.max(lel, 0.05), Math.PI / 2);
      const LIGHT = [Math.sin(laz) * Math.cos(el), -Math.sin(el), Math.cos(laz) * Math.cos(el)];
      const HALF = norm(LIGHT.map((v, i) => v + [0, 0, 1][i]));
      const reach = Math.min(1.4, Math.cos(el) / Math.sin(el)) * tall * u * 0.32;      // shadow shift, away from the light
      const ox = -Math.sin(laz) * reach, oz = -Math.cos(laz) * reach;
      const gloss = num(this, "gloss", 0.25), speed = num(this, "speed", 6.6), cam = num(this, "camera", 10), shadow = num(this, "shadow", 1);

      // ---- light per face, baked into keyframes (book normal → tilt → turn; Lambert + one highlight) ----
      const faces = { front: [0, 0, 1], back: [0, 0, -1], spine: [-1, 0, 0], fore: [1, 0, 0], top: [0, -1, 0], bottom: [0, 1, 0] };
      let keys = "";
      for (const [name, [nx, ny, nz]] of Object.entries(faces)) {
        let shade = "", hi = "";
        const rx = nx * c - ny * s, ry = nx * s + ny * c, rz = nz;
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
          const n = [rx * ca + rz * sa, ry, -rx * sa + rz * ca];
          const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
          const h = Math.max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2]);
          const p = (i / N * 100).toFixed(2);
          shade += `${p}%{opacity:${Math.min(0.7, Math.max(0, 0.5 - 0.5 * Math.max(0, d))).toFixed(3)}}`;
          hi += `${p}%{opacity:${((name === "front" || name === "back" ? gloss : name === "spine" ? gloss * 0.6 : metal ? 0.5 : 0.05) * h ** 24).toFixed(3)}}`;
        }
        keys += `@keyframes s-${name}{${shade}}@keyframes h-${name}{${hi}}`;
      }

      const pages = (dir) => css`background:
        linear-gradient(${dir}, ${fc} 0 ${cover}px, transparent ${cover}px calc(100% - ${cover}px), ${bc} calc(100% - ${cover}px)),
        repeating-linear-gradient(${dir}, rgb(0 0 0 / .07) 0 1px, transparent 1px 2.5px),
        linear-gradient(${dir}, ${e2}, ${e1} 30%, ${e1} 70%, ${e2});`;
      const img = (im, col) => im ? `background:${col} url("${im.src}") center/100% 100% no-repeat;` : `background:${col};`;
      const face = (name, w, h, tf, bg) => css`.${name}{width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${tf};${bg}}
        .${name}::before{animation-name:s-${name}}.${name}::after{animation-name:h-${name}}`;
      // footprint on the floor: the tilted book seen from above
      const fx = Math.min(...xx) * u, fw = wide * u;

      this.shadowRoot.innerHTML = css`<style>
        :host{display:block;position:relative;contain:layout paint;--spin:${speed}s}
        :host([data-off]) *,:host([data-off]) *::before,:host([data-off]) *::after{animation-play-state:paused!important}
        .stage{position:absolute;inset:0;perspective:${Math.max(box.width, box.height) * 2.6}px;perspective-origin:50% 40%}
        .world,.turn,.lean,.book{position:absolute;transform-style:preserve-3d}
        .world{left:50%;top:${50 + (tall * u) / box.height / 2 * 100}%;transform:rotateX(${-cam}deg)}
        .turn,.gturn{animation:turn var(--spin) linear infinite}
        .lean{transform:rotateZ(${tilt * 180 / Math.PI}deg)}
        .book{transform:translate(${-px * u}px,${-py * u}px)}
        .f{position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
        .f::before,.f::after{content:"";position:absolute;inset:0;animation:x var(--spin) linear infinite}
        .f::before{background:#000}.f::after{background:#fff;mix-blend-mode:screen}
        .ground{position:absolute;transform-style:preserve-3d;transform:translate3d(${ox}px,0,${oz}px)}.gturn{position:absolute;transform-style:preserve-3d}.contact{transform:none}
        .ground i{position:absolute;display:block;transform:rotateX(90deg)}
        .foot{left:${fx - 6 * u}px;width:${fw + 12 * u}px;top:${-T / 2 - 8 * u}px;height:${T + 16 * u}px;border-radius:50%;
          background:rgb(0 0 0 / ${0.16 * shadow});filter:blur(${Math.max(6, 9 * u)}px)}
        .touch{left:${-10 * u}px;width:${20 * u}px;top:${-T / 2 - 2}px;height:${T + 4}px;border-radius:50%;
          background:rgb(0 0 0 / ${0.35 * shadow});filter:blur(${Math.max(2, 2.5 * u)}px)}
        @keyframes turn{to{transform:rotateY(360deg)}}
        @media (prefers-reduced-motion:reduce){.turn,.gturn,.f::before,.f::after{animation-play-state:paused;animation-delay:calc(var(--spin) * -0.1)}}
        ${keys}
        ${face("front", W, H, `translateZ(${T / 2}px)`, img(front, fc))}
        ${face("back", W, H, `rotateY(180deg) translateZ(${T / 2}px)`, img(back, bc))}
        ${face("spine", T, H, `rotateY(-90deg) translateZ(${W / 2}px)`, img(spine, sc))}
        ${face("fore", T, H, `rotateY(90deg) translateZ(${W / 2}px)`, pages("to left"))}
        ${face("top", W, T, `rotateX(90deg) translateZ(${H / 2}px)`, pages("to top"))}
        ${face("bottom", W, T, `rotateX(-90deg) translateZ(${H / 2}px)`, pages("to bottom"))}
      </style>
      <div class="stage" part="stage"><div class="world">
        ${shadow > 0 ? `<div class="ground"><div class="gturn"><i class="foot"></i></div></div><div class="ground contact"><i class="touch"></i></div>` : ""}
        <div class="turn"><div class="lean"><div class="book">
          <div class="f front"></div><div class="f back"></div><div class="f spine"></div>
          <div class="f fore"></div><div class="f top"></div><div class="f bottom"></div>
        </div></div></div>
      </div></div>`;
    }
  }
  if (!customElements.get("book-spin")) customElements.define("book-spin", BookSpin);
})();
