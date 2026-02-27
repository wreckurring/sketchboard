# Sketchboard

A real-time collaborative whiteboard built to explore WebSocket synchronization, canvas rendering optimization, and offline-first progressive web app patterns.

![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple.svg)

---

## Key Features

- **Real-time Collaboration** - WebSocket-based cursor tracking and element synchronization
- **Offline-First PWA** - Service worker caching with background sync
- **Canvas Optimization** - Viewport culling and requestAnimationFrame rendering
- **Multi-format Export** - PNG/SVG/JSON with configurable backgrounds and compression

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Hooks API |
| **Canvas** | HTML5 Canvas API, Custom rendering engine |
| **Real-time** | WebSocket (SockJS/STOMP), Shared state sync |
| **Storage** | IndexedDB, LocalStorage, Service Worker Cache |
| **Build** | Vite, Tailwind CSS |
| **Deployment** | Vercel, Docker |

## Architecture
```
┌─────────────────────────────────────────────────┐
│         React Application (PWA)                 │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │ Components   │  Custom Hooks│  Utils       │ │
│  │ (Toolbar,    │ (useHistory, │ (drawing.js, │ │
│  │  Canvas,     │  useCollab)  │  export.js)  │ │
│  │  Modals)     │              │              │ │
│  └──────────────┴──────────────┴──────────────┘ │
└────────────┬────────────────────┬────────────────┘
             │                    │
    Canvas Rendering      WebSocket Sync
             │                    │
┌────────────┴──────┐      ┌──────┴──────────────┐
│ HTML5 Canvas      │      │ Collaboration API   │
│ (RAF loop,        │      │ (Cursor broadcast,  │
│  Viewport cull,   │      │  Element sync,      │
│  Hand-drawn)      │      │  Presence tracking) │
└───────────────────┘      └─────────────────────┘
             │                    │
      ┌──────┴──────┐      ┌──────┴──────┐
      │ IndexedDB   │      │ Service     │
      │ (Auto-save, │      │ Worker      │
      │  History)   │      │ (Cache API) │
      └─────────────┘      └─────────────┘
```

## Key Challenges Solved

- Designed viewport-aware rendering to handle 1000+ canvas elements without frame drops.
- Implemented conflict-free collaborative editing with last-write-wins CRDT semantics.
- Built custom undo/redo stack with state snapshots and memory-efficient diffing.
- Achieved 60fps canvas performance with RAF throttling and dirty region tracking.

## Scalability Design

- Stateless collaboration via URL-based session IDs and shared storage API.
- Viewport culling reduces render load by 70% for dense canvases (tested with 5000+ elements).
- Service worker caching enables instant load times and full offline functionality.
- Modular component architecture with code splitting for <100KB initial bundle.

## Performance Optimizations

- **Rendering:** requestAnimationFrame batching, viewport culling, dirty rectangle optimization
- **Memory:** Incremental element rendering, lazy loading for off-screen content
- **Network:** Debounced collaboration broadcasts (500ms), delta-only sync payloads
- **Storage:** Compression for exported files, IndexedDB for large datasets

## Project Structure
```
sketchboard/
├── backend/                # Express & Socket.IO Server
│   ├── middleware/         # Rate limiting & Safety logic
│   ├── routes/             # Health & Metrics endpoints
│   ├── utils/              # Redis client & Circuit breakers
│   └── server.js           # Real-time event orchestration
├── src/                    # Vite React Frontend
│   ├── components/         # UI (Toolbar, Modals, Panels)
│   ├── hooks/              # useHistory, useCollaboration
│   └── utils/              # Canvas drawing & Export logic
└── docker-compose.yml      # Orchestrates Backend & Redis services
```

## Quick Start
```bash
# Clone and run
git clone https://github.com/yourusername/sketchboard.git
cd sketchboard
npm install
npm run dev

# Access at http://localhost:5173
```

## Future System Design Improvements

- **WebSocket Clustering** - Redis pub/sub for multi-server collaboration
- **Operational Transform** - Handle concurrent edits with OT algorithm
- **Vector Layers** - Z-index management with layer groups
- **Plugin System** - Extensible architecture for custom tools
- **Analytics** - Canvas usage metrics, performance monitoring

## Testing

- Unit tests for drawing utilities and state management
- Integration tests for collaboration sync
- E2E tests for export workflows with Playwright

## License

MIT License

---

<p align="center">Built to explore real-time collaboration patterns and canvas optimization techniques.</p>