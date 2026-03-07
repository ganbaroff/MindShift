---
name: nano-banana-2
description: "AI image generation and editing using Google's Nano Banana 2 (Gemini 3.1 Flash Image Preview). Generate UI mockups, app screenshots, icons, social assets, and design references. Supports multi-resolution (512px–4K), aspect ratios (1:1, 9:16, 16:9, 21:9, 4:1, 1:4), reference images for style transfer, green-screen transparency, and cost tracking. Triggers on: generate image, create image, nano banana, UI mockup, app screenshot, design asset, icon, thumbnail, banner, hero image."
---

# Nano Banana 2 — AI Image Generation Skill

Generate and edit images using **Nano Banana 2** (Gemini 3.1 Flash Image Preview) — Google's fast, cost-effective image model.

## Setup (run once)

```bash
# Clone the tool
git clone https://github.com/kingbootoshi/nano-banana-2-skill.git ~/tools/nano-banana-2
cd ~/tools/nano-banana-2 && bun install && bun link

# Store your API key
mkdir -p ~/.nano-banana
echo "GEMINI_API_KEY=your_key_here" > ~/.nano-banana/.env
```

Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).

## Basic Usage

```bash
# Default 1K image → saved to current directory
nano-banana "dark-mode SaaS dashboard with sidebar and chart"

# Named output
nano-banana "minimal login screen" -o login-screen

# Resolutions: 512, 1K (default), 2K, 4K
nano-banana "app icon on transparent background" -s 512

# Aspect ratios
nano-banana "mobile onboarding screen" -a 9:16
nano-banana "hero banner" -a 16:9 -s 2K
nano-banana "ultra-wide cinema" -a 21:9 -s 4K

# Reference / style transfer
nano-banana "same UI but dark theme" --input-image ./current-ui.png

# Model selection
nano-banana "your prompt"               # Nano Banana 2 — fast & cheap (default)
nano-banana "your prompt" --model pro   # Nano Banana Pro — highest fidelity
```

## Models

| Alias | Underlying Model | Cost | Best For |
|-------|-----------------|------|----------|
| (default) | gemini-3.1-flash-image-preview | ~$0.06/img | Rapid iteration, UI mockups |
| pro | gemini-3-pro-image | ~$0.13/img | Print-ready, max fidelity |

## For Web & Mobile App Development

| Use Case | Example Prompt |
|----------|---------------|
| App mockup | `"iOS settings screen, SF Pro font, system blue accents"` |
| Dashboard | `"analytics dashboard dark mode, sidebar nav, KPI cards, line chart"` |
| Landing page | `"SaaS landing page hero section, glassmorphism card, gradient bg"` |
| App icon | `"minimal app icon, brain/flow motif, purple gradient, rounded corners"` |
| Onboarding | `"3-step onboarding screens for productivity app, clean minimalism"` |
| Social asset | `"Twitter/X card 16:9 for app launch announcement"` |

## Cost Reference

| Resolution | Nano Banana 2 | Nano Banana Pro |
|-----------|--------------|----------------|
| 512px | ~$0.01 | ~$0.02 |
| 1K | ~$0.06 | ~$0.13 |
| 2K | ~$0.10 | ~$0.22 |
| 4K | ~$0.18 | ~$0.40 |
