# Cleave

Private, client-side background removal. Images never leave the browser —
segmentation runs in-device via WASM (`@imgly/background-removal`).

## Stack
React 19 + Vite + Tailwind 4, vanilla Three.js (dissolve-reveal shader only).

## Scripts
```
npm install
npm run dev
npm run build
npm run lint
```

## Scope (this scaffold)
Single-image upload → local bg removal → dissolve-reveal → transparent/solid
export. Batch mode, full background-swap suite, edge refinement, and manual
dark-mode toggle are intentionally out of scope — see the project kickoff doc.
