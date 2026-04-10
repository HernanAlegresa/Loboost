# LoBoost — Design System

## Filosofía

UI minimalista, premium, mobile-first. La energía visual viene del acento lima sobre una base oscura carbón. Tipografía e iconos hacen el trabajo pesado — sin gradientes, sin sombras pesadas, sin ruido visual.

Referencias: Whoop (energía fitness, datos), Strava (progreso), Linear (espaciado y densidad), Vercel dashboard (estructura y jerarquía).

---

## Color Palette

| Token                | Valor                  | Uso principal                          |
|----------------------|------------------------|----------------------------------------|
| `bg-base`            | `#0A0A0A`              | Fondo de página                        |
| `bg-surface`         | `#111317`              | Cards, paneles                         |
| `bg-elevated`        | `#1A1D22`              | Dropdowns, modals, avatars             |
| `border-subtle`      | `#1F2227`              | Bordes de cards (default)              |
| `border-default`     | `#2A2D34`              | Bordes de inputs                       |
| `text-primary`       | `#F0F0F0`              | Títulos, cuerpo principal              |
| `text-secondary`     | `#6B7280`              | Labels, captions, metadata             |
| `text-disabled`      | `#3D3F45`              | Estados deshabilitados                 |
| `accent`             | `#B5F23D`              | CTAs, estados activos, progreso        |
| `accent-dim`         | `rgba(181,242,61,0.12)`| Fondos de badge acento                 |
| `warning`            | `#F2994A`              | Alertas, bajo cumplimiento             |
| `warning-dim`        | `rgba(242,153,74,0.12)`| Fondos de badge warning                |
| `error`              | `#F25252`              | Errores, alertas críticas              |
| `error-dim`          | `rgba(242,82,82,0.12)` | Fondos de badge error                  |

### Uso del acento
El `#B5F23D` debe sentirse como energía — no debe aparecer en más del 10% de la pantalla. Base oscura, acento selectivo.

---

## Tipografía

**Font:** Inter (instalado)

| Escala       | Tamaño | Weight | Uso                            |
|--------------|--------|--------|--------------------------------|
| `display`    | 24px   | 700    | Títulos de página              |
| `heading`    | 18px   | 600    | Títulos de sección             |
| `body-lg`    | 16px   | 400    | Cuerpo principal               |
| `body`       | 15px   | 400    | Contenido de cards             |
| `label`      | 13px   | 500    | Labels, nombres en cards       |
| `caption`    | 12px   | 400    | Metadata, fechas               |
| `overline`   | 11px   | 600    | Encabezados de sección (UPPERCASE, letter-spacing) |

---

## Spacing

Unidad base: 4px

Valores comunes: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64`

Padding de página: `px-5` en mobile, `px-6` en desktop
Gap entre cards: `gap-3` (12px)

---

## Border Radius

| Token  | Valor    | Uso                           |
|--------|----------|-------------------------------|
| `sm`   | 6px      | Badges, pills pequeños        |
| `md`   | 10px     | Botones, inputs               |
| `lg`   | 14px     | Cards principales             |
| `xl`   | 20px     | Modals, sheets                |
| `full` | 9999px   | Avatares, FAB, pills de tabs  |

---

## Componentes Base

### Card
```
bg: #111317
border: 1px solid #1F2227
border-radius: 14px
padding: 14px 16px
```

### Avatar (initials)
```
bg: #1A1D22
text: #B5F23D, semibold
sizes: sm=28px | md=40px | lg=52px
border-radius: full
```

### Compliance Badge
```
≥ 70%  → bg: accent-dim    | text: #B5F23D
40–69% → bg: warning-dim   | text: #F2994A
< 40%  → bg: error-dim     | text: #F25252
padding: 3px 8px | radius: full | font: 12px 600
```

### Alert Card (left-accent)
```
bg: #111317
border: 1px solid #1F2227
border-left: 3px solid #F2994A
border-radius: 14px
```

### Button Primary
```
bg: #B5F23D
text: #0A0A0A, 600
height: 44px
border-radius: 10px
hover: brightness(0.92)
```

### Button Ghost
```
bg: transparent
border: 1px solid #2A2D34
text: #F0F0F0
height: 44px
border-radius: 10px
```

### Stat Card (KPI)
```
bg: #111317
border: 1px solid #1F2227
border-radius: 14px
padding: 14px 16px
min-width: 90px
```

### Filter Tab (active)
```
bg: #B5F23D
text: #0A0A0A, 600
border-radius: full
padding: 6px 14px
```

### Filter Tab (inactive)
```
bg: transparent
text: #6B7280
border-radius: full
padding: 6px 14px
```

---

## Animaciones

| Patrón         | Configuración                                |
|----------------|----------------------------------------------|
| Fade in page   | opacity 0→1, 150ms ease                      |
| Card enter     | opacity 0→1 + translateY 6px→0, 200ms ease  |
| Stagger cards  | delay 40ms por card                          |
| Tab switch     | opacity transition 150ms                     |
| FAB hover      | scale(1.05), 150ms                           |

Librería: `framer-motion` (a instalar en Fase 3)

---

## Mobile First

Diseñar para 390px (iPhone 14). Breakpoints:
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px

La mayoría de los coaches y clientes usarán la app en el celular. Desktop es secondary.
