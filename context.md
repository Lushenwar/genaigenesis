🌍 ECO-PULSE: System Architecture & Agent Context Document
Lead Architect: Ryan Qi
Project Type: 48-Hour Hackathon Submission (Google Best Sustainability AI Track)
Core Constraint: STRICTLY GOOGLE NATIVE. DO NOT USE MAPBOX. DO NOT SUGGEST SUPABASE. DO NOT BUILD LIVE THERMAL PHYSICS ENGINES.

1. Project Overview
The Problem: Urban Heat Islands (UHIs) cause dangerous heatwaves. City planners have heat maps but lack fast, actionable, cost-calculated intervention strategies (e.g., planting trees, reflective roofs).

The Solution: A prescriptive Generative AI City Planner. Users view a 3D dark-mode map of Toronto's heat data. Clicking a "hot zone" triggers Google Vertex AI to generate an "Intervention Blueprint" (cost and temperature drop analysis) and a generative visual overlay showing the green-space transformation.

The Demo Flow: 1. User views dark-mode Toronto 3D map with glowing red GeoJSON heat overlay.
2. User clicks a specific hot concrete plaza.
3. App shows a loading state: "Vertex AI generating intervention..."
4. App displays a split-screen dashboard:

Left: Before/After image slider showing the concrete plaza transformed with trees/green roofs (via Imagen 3).

Right: JSON-structured Blueprint Dashboard (via Gemini 1.5 Pro) detailing cost ($4,500) and projected cooling (-4°C).

2. Technology Stack
Frontend: TypeScript, Next.js (App Router), Tailwind CSS, shadcn/ui.

Mapping: @vis.gl/react-google-maps (Google's official React wrapper).

Backend: Python, FastAPI.

Database: Firebase Firestore (NoSQL).

AI/ML: Google Cloud Vertex AI (Gemini 1.5 Pro, Imagen 3).

Deployment: Vercel (Frontend), Google Cloud Run (Backend via Docker).

Data Source: Static Toronto Public Health GeoJSON (Pre-processed to prevent UI lag).

3. System Architecture & Data Flow
A. The Frontend Application (Next.js)
Map Component: Uses @vis.gl/react-google-maps.

MUST enable WebGLOverlayView to render the static GeoJSON heat map data.

MUST enable Google Map Tiles API for Photorealistic 3D building footprints.

Map styling should be custom dark-mode to make the heat data "glow."

UI Components: Built with shadcn/ui (Cards, Sliders, Buttons).

State Management: When a user clicks a polygon on the map, the frontend captures the coordinates and sends a POST request to the FastAPI backend.

B. The Backend Service (FastAPI)
Endpoint 1: POST /api/v1/generate-blueprint

Input: {"latitude": float, "longitude": float, "location_context": string}

Action: Orchestrates two asynchronous calls to Vertex AI.

Output: Returns a combined JSON object with the text blueprint and image URLs.

Endpoint 2: POST /api/v1/save-blueprint

Action: Saves the generated blueprint JSON directly to Firebase Firestore for session persistence.

C. The Vertex AI Pipeline (The "Brain" & "Eyes")
Node 1: Gemini 1.5 Pro (The Reasoner)

Prompt Strategy: Receives the location and a system prompt acting as a master urban planner.

Output: Strictly formatted JSON containing:

intervention_strategy: String (What to do).

estimated_cost: Integer.

projected_temperature_drop_celsius: Float.

recommended_materials: Array of strings (e.g., "Oak Trees", "White Reflective Paint").

Node 2: Imagen 3 (The Visualizer)

Prompt Strategy: Image-to-Image / Inpainting. Takes a base Google Street View or Satellite crop of the target coordinate.

Output: Generates a modified image overlaying realistic trees and green roofs onto the existing concrete geometry.

4. Role-Specific Directives for the AI Coding Agent
When generating code for this project, the AI coding agent must adhere to these exact subsystem responsibilities:

🗺️ For Frontend Code Generation
Goal: Jaw-dropping, dark-mode 3D map.

Directives: Only use @vis.gl/react-google-maps. Do not import mapbox-gl. Ensure the Map component loads the google.maps.Map3DElement or relevant 3D tiles layer. The UI must look like an enterprise GovTech dashboard (sleek, high-contrast, professional).

🧠 For Vertex AI Code Generation
Goal: Stable, structured JSON outputs and high-quality inpainted images.

Directives: Use the official google-cloud-aiplatform Python SDK. When writing the Gemini 1.5 Pro prompt, enforce JSON output using response_mime_type="application/json". The prompt must instruct the AI to be highly specific and mathematical in its cost and temperature estimations, avoiding generic advice.

⚙️ For FastAPI / Cloud Backend Code Generation
Goal: Fast, stateless API orchestration that deploys easily to Google Cloud Run.

Directives: Keep the FastAPI structure simple (main.py, routes/, services/vertex_ai.py). Provide the Dockerfile required to containerize this FastAPI app for Cloud Run. Integrate firebase-admin using Application Default Credentials (ADC) for seamless Google Cloud authentication.

🎬 For Data Integration (The Hackathon "Cheat Code")
Goal: Zero latency and crash-proof demos.

Directives: DO NOT write code that attempts to calculate live thermal physics or stream massive raster files from Earth Engine on the fly. The application MUST load the heat map data from a localized, pre-simplified toronto_heat.geojson file in the Next.js public/ directory. 
5. Project Directory Structure
```text
genaigenesis/
├── backend/                # FastAPI Backend
│   ├── main.py             # Entry point & API routes
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Containerization for Cloud Run
│   ├── routes/             # API route modules
│   └── services/           # Vertex AI & Firebase logic
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # UI & Map components
│   │   └── lib/            # Utilities & API clients
│   ├── public/             # Static assets (GeoJSON, icons)
│   ├── tailwind.config.ts  # Styling configuration
│   └── package.json        # Frontend dependencies
├── context.md              # Project Architecture (This file)
└── .gitignore              # Git exclusion rules
```