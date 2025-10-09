# Image Generation & Cost Control Design

## Overview
This document defines the architecture and data flow for the AI Meal Prep Assistant's image generation subsystem.

### Goals
- Generate recipe images on demand.
- Cache and reuse existing images to minimize cost.
- Enforce a global monthly cost ceiling ($300 default).
- Track per-user quotas and image origins.

---

## Core Components

### Tables
1. **recipes**
2. **images**
3. **image_gen_log**
4. **system_limits**
5. **user_image_quota (optional)**

Each table stores metadata supporting caching, logging, and spend limits.

---

## Process Summary
1. User requests recipe.
2. System checks for existing image.
3. If missing, queue image generation job.
4. Job verifies monthly and user limits.
5. Image generated or placeholder assigned.
6. Logs cost, updates system_limits and user quotas.
7. Returns cached image URL.

---

See `flow_diagram.txt` for full logic.
