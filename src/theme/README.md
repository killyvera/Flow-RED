# Sistema de Theming

Este directorio contiene el sistema completo de theming para el editor visual de Node-RED. El sistema permite personalización de marca sin refactorizar componentes core, con soporte para múltiples temas, overrides configurables, y accesibilidad completa.

## Estructura

```
theme/
├── tokens.ts          # Tokens base (spacing, typography, etc.) y tokens de accesibilidad
├── themes.ts          # Definiciones de temas (light, dark, highContrast, corporate)
├── config.ts          # Sistema de configuración y overrides
├── utils.ts           # Utilidades para generar y aplicar CSS variables
├── accessibility.ts   # Utilidades de accesibilidad (contrast checking, WCAG)
└── README.md          # Esta documentación
```

## Conceptos Básicos

### Tokens Base
Los tokens base (`tokens.ts`) son valores que **no cambian entre temas**:
- Espaciado (spacing)
- Tipografía (fontFamily, fontSize, fontWeight, lineHeight)
- Border radius
- Sombras genéricas
- Z-index
- Tokens de accesibilidad (focus rings, contrast ratios)

### Temas
Los temas (`themes.ts`) definen **valores que cambian entre modos**:
- Colores (background, foreground, canvas, accent, status, group)
- Sombras específicas del tema

### Configuración
El archivo `theme.config.ts` en la raíz del proyecto permite **overrides** de temas sin modificar el código fuente.

## Agregar un Nuevo Tema

### 1. Definir el Tema

Edita `themes.ts` y agrega tu tema:

```typescript
export const myCustomTheme: Theme = {
  name: 'myCustom',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#e0e0e0',
    },
    foreground: {
      primary: '#000000',
      secondary: '#333333',
      tertiary: '#666666',
    },
    canvas: {
      background: '#f5f5f5',
      grid: '#cccccc',
      node: {
        default: '#ffffff',
        selected: '#e8f4f8',
        hover: '#f0f0f0',
        border: '#cccccc',
        'border-hover': '#0066cc',
        'border-selected': '#0066cc',
        header: '#f0f0f0',
        'header-accent': '#0066cc',
      },
      edge: {
        default: '#999999',
        selected: '#0066cc',
        hover: '#0088ff',
        active: '#00aa00',
      },
    },
    accent: {
      primary: '#0066cc',
      secondary: '#0088ff',
      tertiary: '#33aaff',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    group: {
      default: 'rgba(0, 102, 204, 0.1)',
      border: 'rgba(0, 102, 204, 0.3)',
      text: '#0066cc',
    },
  },
  shadows: {
    node: '0 1px 3px rgba(0, 0, 0, 0.1)',
    'node-hover': '0 2px 6px rgba(0, 0, 0, 0.12)',
    'node-selected': '0 0 0 2px rgba(0, 102, 204, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12)',
  },
}
```

### 2. Registrar el Tema

Agrega tu tema al registro en `themes.ts`:

```typescript
export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
  corporate: corporateTheme,
  myCustom: myCustomTheme, // ← Agregar aquí
}
```

### 3. Usar el Tema

El tema estará disponible automáticamente a través de `ThemeContext`:

```typescript
import { useTheme } from '@/context/ThemeContext'

function MyComponent() {
  const { setTheme, availableThemes } = useTheme()
  
  return (
    <select onChange={(e) => setTheme(e.target.value)}>
      {availableThemes.map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  )
}
```

## Usar Overrides en theme.config.ts

El archivo `theme.config.ts` en la raíz del proyecto permite personalizar un tema base sin modificar el código fuente.

### Ejemplo Básico

```typescript
// theme.config.ts
import type { ThemeConfig } from './src/theme/config'

const config: ThemeConfig = {
  baseTheme: 'light',
  overrides: {
    colors: {
      accent: {
        primary: '#0066cc', // Tu color de marca
        secondary: '#0088ff',
        tertiary: '#33aaff',
      },
    },
  },
}

export default config
```

### Override Parcial

Puedes sobrescribir solo las propiedades que necesites:

```typescript
const config: ThemeConfig = {
  baseTheme: 'dark',
  overrides: {
    colors: {
      canvas: {
        background: '#0a0a0a', // Fondo más oscuro
      },
      accent: {
        primary: '#ff6d5a', // Mantener el acento original
      },
    },
  },
}
```

### Validación

El sistema valida automáticamente:
- Que los colores sean strings válidos (hex, rgb, rgba, o nombres de color)
- Que el tema resultante tenga todas las propiedades requeridas
- Que los overrides sean compatibles con la estructura del tema base

Si hay errores, se usará el tema base sin overrides y se mostrará una advertencia en la consola.

## Accesibilidad

### Contrast Ratios

El sistema incluye utilidades para validar contrast ratios según WCAG:

```typescript
import { meetsWCAGAA, getContrastRatio } from '@/theme/accessibility'

// Verificar si cumple WCAG AA
const isValid = meetsWCAGAA('#000000', '#ffffff') // true

// Obtener el ratio exacto
const ratio = getContrastRatio('#000000', '#ffffff') // 21

// Validar tema completo
import { validateThemeAccessibility } from '@/theme/accessibility'
const validation = validateThemeAccessibility(myTheme)
if (!validation.valid) {
  console.warn('Problemas de accesibilidad:', validation.issues)
}
```

### Focus States

Todos los elementos interactivos deben usar focus states accesibles:

```typescript
// En componentes, usar clases Tailwind:
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"

// O usar las utilidades de accessibility.ts:
import { getFocusClasses } from '@/theme/accessibility'
```

### Tokens de Accesibilidad

Los tokens de accesibilidad están definidos en `tokens.ts`:

- `--focus-ring-width`: Ancho del anillo de focus (2px)
- `--focus-ring-color`: Color del anillo (toma el accent primary del tema)
- `--focus-ring-offset`: Offset del anillo (2px)

## Mejores Prácticas

### 1. No Usar Colores Hardcodeados

❌ **Mal:**
```typescript
<div style={{ backgroundColor: '#ff6d5a' }} />
```

✅ **Bien:**
```typescript
<div className="bg-accent-primary" />
// o
<div style={{ backgroundColor: 'var(--color-accent-primary)' }} />
```

### 2. Usar Variables CSS o Clases Tailwind

Siempre preferir variables CSS o clases Tailwind sobre valores hardcodeados:

```typescript
// ✅ Usar variables CSS
style={{ color: 'var(--color-text-primary)' }}

// ✅ Usar clases Tailwind
className="text-text-primary"

// ❌ Evitar valores hardcodeados
style={{ color: '#1a1a1a' }}
```

### 3. Validar Contrast Ratios

Al crear un nuevo tema, valida los contrast ratios:

```typescript
import { validateThemeAccessibility } from '@/theme/accessibility'

const myTheme = { /* ... */ }
const validation = validateThemeAccessibility(myTheme)
if (!validation.valid) {
  console.error('Tema no cumple con accesibilidad:', validation.issues)
}
```

### 4. Mantener Consistencia

- Usa los tokens base para espaciado, tipografía, etc.
- Sigue la estructura de colores existente
- Mantén nombres descriptivos y consistentes

## Ejemplos

### Ejemplo 1: Tema Corporativo

```typescript
// themes.ts
export const corporateTheme: Theme = {
  name: 'corporate',
  colors: {
    // ... usar colores de marca corporativa
    accent: {
      primary: '#0066cc', // Azul corporativo
      secondary: '#0088ff',
      tertiary: '#33aaff',
    },
    // ...
  },
  // ...
}
```

### Ejemplo 2: Override para Branding

```typescript
// theme.config.ts
export default {
  baseTheme: 'light',
  overrides: {
    colors: {
      accent: {
        primary: '#your-brand-color',
      },
      canvas: {
        background: '#your-canvas-color',
      },
    },
  },
}
```

### Ejemplo 3: Validar Accesibilidad

```typescript
import { validateThemeAccessibility } from '@/theme/accessibility'
import { corporateTheme } from '@/theme/themes'

const validation = validateThemeAccessibility(corporateTheme)
if (validation.valid) {
  console.log('✅ Tema cumple con WCAG AA')
} else {
  console.warn('⚠️ Problemas de accesibilidad:', validation.issues)
}
```

## Troubleshooting

### El tema no se aplica

1. Verifica que el tema esté registrado en `themes.ts`
2. Verifica que `ThemeContext` esté envolviendo tu aplicación
3. Revisa la consola para errores de carga

### Los overrides no funcionan

1. Verifica la sintaxis de `theme.config.ts`
2. Asegúrate de que `baseTheme` coincida con el tema que quieres modificar
3. Revisa que los tipos de los overrides sean correctos

### Problemas de contraste

1. Usa `validateThemeAccessibility()` para identificar problemas
2. Ajusta los colores para cumplir con WCAG AA (ratio mínimo 4.5:1)
3. Considera usar el tema `highContrast` como referencia

## Referencias

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Customization](https://tailwindcss.com/docs/theme)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

