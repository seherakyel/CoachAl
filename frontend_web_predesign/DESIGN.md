---
name: CoachAI Identity
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  code-snippet:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

This design system is built on a foundation of **Minimalism** and **Corporate Modernism**, specifically tailored for the high-performance expectations of the developer community. The aesthetic mirrors the precision of Vercel and the refinement of Apple, prioritizing clarity, speed, and perceived intelligence.

The brand personality is that of a "Silent Partner"—highly capable, technical, yet unobtrusive. To evoke a sense of trust and AI-driven sophistication, the UI utilizes expansive whitespace, rigorous alignment, and a "High-Definition" finish characterized by subtle micro-interactions and sharp typography.

## Colors

The palette is anchored by **Indigo-600** (#4f46e5) for primary actions, conveying innovation and energy, balanced by **Navy/Slate-800** (#1e293b) for deep structural elements and high-contrast text. 

The background utilizes a cool **Slate-50** (#f8fafc) to reduce eye strain during long interview simulations. Semantic colors (Emerald, Amber, Rose) are reserved strictly for feedback loops—such as CV analysis scores and real-time interview performance indicators—ensuring they stand out against the neutral canvas.

## Typography

The design system utilizes **Inter** as its primary typeface across all functional layers. Inter's tall x-height and systematic design provide the legibility required for dense CV analysis and technical feedback. 

Headlines use tighter letter-spacing and heavier weights to create a sense of authority. For technical elements, such as code snippets in interview questions or API paths, **Space Grotesk** is introduced as a secondary mono-styled font to provide a geometric, tech-forward contrast without sacrificing the modern aesthetic.

## Layout & Spacing

This design system employs a **12-column fixed grid** for desktop, centering the content at a maximum width of 1280px to maintain focus. The spacing logic is strictly based on an **8px linear scale**, ensuring a mathematically consistent rhythm between elements.

Ample padding (64px+) is used to isolate primary workflows, such as the active interview simulation, from secondary navigation. This "Focus-First" layout philosophy minimizes distractions and emphasizes the AI's presence.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**. Instead of heavy borders, surfaces are defined by subtle shifts in background color (e.g., a White card on a Slate-50 background).

Depth is communicated via "Large-Radius Ambient Shadows"—extremely soft, low-opacity (4-8%) blurs with a slight Y-axis offset. This creates the "Vercel-like" effect where elements appear to float naturally. During AI interactions, a subtle "Indigo Glow" may be used on containers to indicate active processing or listening states.

## Shapes

The design system adopts a **Rounded** shape language to soften the technical nature of the product. The base radius is 0.5rem (8px), which scales to 1rem (16px) for cards and 1.5rem (24px) for large containers or modal windows.

Buttons and input fields should maintain the 0.5rem radius to feel "clickable" and accessible. Chips (used for developer skills or tags) are exceptions and should use a **Pill-shaped** radius for maximum distinction from interactive buttons.

## Components

### Buttons
Primary buttons use a solid Indigo-600 background with white text. Secondary buttons use a "Ghost" style: a transparent background with a Slate-200 border and Navy text. All buttons feature a 200ms ease-in-out transition on hover.

### Cards
Cards are the primary container for CV Analysis results. They should be styled with a white background, a 1px Slate-100 border, and a "Large" ambient shadow. Padding inside cards should be generous (min 24px).

### Input Fields
Inputs use a white background with a 1px Slate-200 border. On focus, the border transitions to Indigo-400 with a 2px Indigo ring at 20% opacity.

### AI Visualizers
The interview simulation requires a unique "Pulse" component. This is a series of vertical bars or a concentric circle animation using Indigo-400, signaling the AI is analyzing the user's speech or text input.

### Status Chips
For CV scoring (e.g., "Senior," "Mid-level"), use a low-opacity version of the semantic colors (Emerald-50) with high-contrast text (Emerald-700) to keep the UI clean but informative.