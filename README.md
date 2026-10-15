# Book Spin

A book standing on one corner, turning on its axis, on a transparent background with a soft studio shadow (light from above, like a softbox). Upload the front, spine and back, set the page count and the page-edge finish, and embed it anywhere.

**Tool:** open `index.html` (or the GitHub Pages link) → upload the covers → **Download HTML** (one self-contained file, images inside) or **Copy embed**.

No three.js, no WebGL: a CSS 3D box in a 5 KB (gzipped) web component with no dependencies. The light on each face is computed once and baked into CSS keyframes, so nothing runs per frame. It pauses when off screen and holds still for visitors who ask for reduced motion.

## Embed

```html
<book-spin front="front.jpg" spine="spine.jpg" back="back.jpg" pages="240" edge="cream"
  style="display:block;width:480px;height:600px"></book-spin>
<script src="https://cdn.jsdelivr.net/gh/edsonpavoni/book-spin@1.0.0/book-spin.js"></script>
```

| Attribute | What it does | Default |
|---|---|---|
| `front`, `spine`, `back` | cover images (spine and back optional) | — |
| `pages` | page count; with `paper` it sets the thickness | `200` |
| `paper` | one leaf, mm (80 g/m² offset ≈ 0.1) | `0.1` |
| `trim` | `width x height` in mm, e.g. `152x229` | front image ratio, 229 mm tall |
| `edge` | `white`, `cream`, `gold`, `silver`, `black`, or any CSS colour (sprayed edges) | `white` |
| `gloss` | cover highlight, 0–1 | `0.25` |
| `tilt` | how far the book leans onto its corner, degrees | `35` |
| `camera` | how far the camera looks down, degrees | `10` |
| `speed` | seconds per turn | `6.6` |
| `vary` | speed variation, 0–1: slower while a cover faces you, faster through the edges (0 = steady) | `0` |
| `shadow` | strength of the soft floor shadow, 0–1 | `1` |

The book fills the element's height, so give the element a size. Images from another domain need CORS for the cover colour sampling; without it a neutral colour is used for the cover edges.

## License

MIT
