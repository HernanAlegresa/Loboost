I want you to act as a senior frontend engineer with strong experience in mobile-first web apps and iOS Safari behavior.

Context:
I'm building a mobile-first web app using Next.js (App Router), React, TypeScript, and Tailwind CSS.

Currently, I'm using Responsively App on my PC to preview my app at mobile sizes (iPhone viewport). However, I noticed that the layout does NOT match what I see on a real iPhone device.

Specifically:
On a real iPhone (e.g. iPhone 13 mini), there are top and bottom safe areas due to:
- Notch / status bar (top)
- Home indicator (bottom)

This causes my UI (header and bottom navigation) to be pushed inward, creating spacing that does NOT appear in my desktop/mobile emulator.

Problem:
In my local environment (localhost + Responsively), these safe areas are NOT being applied, so my layout looks different compared to a real iPhone.

Goal:
I want my local development environment to visually match (as closely as possible) how the app renders on a real iPhone.

What I want from you:
1. Explain the correct way to handle iOS safe areas in a modern web app (Next.js + Tailwind)
2. Implement a proper solution using CSS env(safe-area-inset-*) variables
3. Add fallback values so it also works in environments that don't support safe areas (like desktop browsers / Responsively)
4. Ensure the solution is clean, scalable, and applied at the correct layout level (not per-component hacks)
5. Make sure it works correctly with:
   - fixed headers
   - bottom navigation bars
   - full-height layouts (min-h-screen)

IMPORTANT:
- Add the required meta tag (viewport-fit=cover) if missing
- Avoid breaking existing layout structure
- Keep everything consistent with Tailwind conventions

Bonus (if possible):
- Add a temporary "debug mode" (optional class or flag) that visually shows safe area boundaries for development purposes

Goal summary:
I want to code → save → instantly see a layout in localhost that closely matches a real iPhone (including safe areas), without needing to constantly check on my physical device.

Take your time and implement this cleanly in the codebase.