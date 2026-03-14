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

Deployment: Localhost (Hackathon Development Mode).


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

4. Hackathon Team Roles & Remaining Tasks
As we transition from "Friday Night Setup" to "Saturday Execution," the remaining tasks are split between the following roles:

🗺️ **Role 1: The Geospatial Frontend Lead (Map & UI)**
- **Remaining Task 1**: Enable Photorealistic 3D Buildings via Google Map Tiles API (Map3DElement integration).
- **Remaining Task 2**: Polish UI aesthetics to "WOW" level—implement glassmorphism on the dashboard, refined CSS transitions, and high-contrast dark-mode highlights.
- **Remaining Task 3**: Finalize the Before/After slider UI with real high-resolution asset loading.

🧠 **Role 2: The Vertex AI Engineer (Prompting & Generation)**
- **Remaining Task 1**: Fine-tune Gemini 1.5 Pro system prompts to ensure technical, mathematical precision in cost and temperature drop estimations.
- **Remaining Task 2**: Implement real inpainting/image-to-image logic with Imagen 3 (Satellite view to Green-space visual).
- **Remaining Task 3**: Set up GCS buckets for serving AI-generated image assets with proper public/private accessibility.

⚙️ **Role 3: The Cloud Backend Architect (APIs & Infrastructure)**
- **Remaining Task 1**: Finalize environment variables configuration (API Keys, GCP Auth) for local testing.
- **Remaining Task 2**: Implement Firebase security rules and verify Firestore session persistence.
- **Remaining Task 3**: Optimize API orchestration latency to ensure the "loading" states are snappy for the demo video.


🎬 **Role 4: The Data & Product Manager (The Hackathon Closer)**
- **Remaining Task 1**: Acquire and clean official Toronto Public Health GeoJSON heat data to replace the current placeholder.
- **Remaining Task 2**: Script and produce the 2-minute demo video, highlighting all Google API touchpoints (Vertex, Firebase, Maps).
- **Remaining Task 3**: Finalize the Devpost submission narrative, focusing on the "Problem/Solution" impact.
 
5. Project Directory Structure
```text
genaigenesis/
├── backend/                # FastAPI Backend
│   ├── main.py             # Entry point & API routes
│   ├── requirements.txt    # Python dependencies
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