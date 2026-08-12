# Kanto Motion Studio

Build a multi-screen, ultra-modern, dark-monochrome web application UI for an AI Motion Engine platform called "Kanto Motion".

### Overall Visual Aesthetic & Styling

- Palette: Pure Black (#000000), Deep Zinc (#09090b), Subtle Borders (#27272a), Crisp White (#ffffff), and Soft Muted Gray (#a1a1aa). High contrast, minimalist, clean.

- Design Language: Apple-inspired minimalist tokens, smooth micro-borders, subtle glassmorphism backdrop blurs, crisp typography, and rounded corners (border-radius: 12px to 16px).

- Layout Architecture: Clean Bento Box structures.

- CRITICAL REQUIREMENT: The entire interface must be 100% STATIC. Do NOT include any CSS transitions, keyframes, or motion scripts. Add `data-animate="true"` and unique semantic `id` attributes to all key interactive and display elements.

---

### SCREEN 1: Authentication / Login

- Centered minimal auth card over a subtle black grid background.

- Clean header with application logo: "KANTO MOTION".

- Input fields for Email and Password with sharp white outline focus states.

- Minimal "Continue with Google" / "Sign In" buttons in solid white with black text.

- Simple, elegant footer text: "Deterministic Layout-to-Motion Studio".

---

### SCREEN 2: Dashboard / Project Hub

- Top Navbar: Brand logo, user profile avatar, dark/light visual badge indicator, and a "Documentation" link.

- Hero Action Section: Prominent Bento card with a large primary CTA button: "+ Create New Motion Project".

- Project Search & Filter bar (e.g., "All Projects", "Recent", "Exported Videos").

- Main Grid Area: Bento box grid showing recent user projects.

  - Each card shows a static preview thumbnail of the UI HTML component, title (e.g., "Daily Streak Widget", "Pricing Card"), last edited timestamp, and a "Open Editor" button.

---

### SCREEN 3: Motion Studio Editor (The Workspace)

A professional 3-panel IDE layout designed for motion workflow:

1. Left Sidebar: Code & DOM Tree

   - Tab switcher: [HTML / CSS Code Editor] | [DOM Elements Tree].

   - Code Editor Panel: Syntax-highlighted code editor block showing raw HTML/CSS input.

   - Element Inspector: List of targetable DOM elements with their auto-detected `id` tags.

2. Center Panel: Live Visual Canvas Viewport

   - Top Toolbar: Viewport aspect ratio switcher (16:9 Desktop, 9:16 Mobile, 1:1 Square), Canvas zoom level (100%), and resolution specs (e.g., 1920x1080).

   - Canvas Stage: A isolated preview container rendering the user's static HTML design centered perfectly.

   - Elements inside this canvas (e.g., `#streak-icon`, `#streak-card`) must clearly reflect their static positions.

3. Right Sidebar: AI Motion Director & Export Controls

   - Section A: AI Motion Prompt Box

     - Textarea input for natural language motion commands (e.g., "Make the streak icon float up slightly with a gentle bounce").

     - "Generate Motion Code" primary action button.

   - Section B: Spatial Coordinate Inspector (JSON Manifest)

     - Collapsible code box displaying real-time bounding box coordinates (`x`, `y`, `width`, `height`).

   - Section C: Timeline & Video Render Settings

     - Framerate selector (30 FPS / 60 FPS), Video Format toggle (MP4 / WebM / Lottie).

     - Timeline scrubber bar showing duration (0.0s to 5.0s).

     - Prominent "Render & Download Video" button with download icon.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kanto-motion-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a40c14bc-36e2-488c-b63e-bbf1120d8a80).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
