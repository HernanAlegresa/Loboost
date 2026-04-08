# Fase 1: Setup + Auth + Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inicializar el proyecto LoBoost con Next.js 15 + Supabase, implementar autenticación completa con roles (coach/cliente) y protección de rutas por rol, dejando la base lista para construir features encima.

**Architecture:** Next.js App Router con route groups `(auth)`, `(coach)`, `(client)`. Supabase Auth + tabla `profiles` con campo `role`. Middleware de Next.js protege rutas por rol antes de que llegue cualquier JS al browser. Server Actions para mutaciones de auth con validación Zod.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`), Zod, Jest + Testing Library.

---

## Archivos que se crean en esta fase

```
loboost/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (coach)/layout.tsx
│   │   ├── (coach)/dashboard/page.tsx
│   │   ├── (client)/layout.tsx
│   │   ├── (client)/dashboard/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── features/auth/
│   │   ├── components/login-form.tsx
│   │   ├── components/register-form.tsx
│   │   ├── actions/sign-in.ts
│   │   ├── actions/sign-up.ts
│   │   ├── actions/sign-out.ts
│   │   └── schemas.ts
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   ├── supabase/server.ts
│   │   ├── supabase/middleware.ts
│   │   ├── auth/roles.ts
│   │   ├── auth/session.ts
│   │   └── utils.ts
│   ├── types/database.ts
│   └── middleware.ts
├── supabase/migrations/20260408000000_init.sql
├── CLAUDE.md
└── jest.config.ts + jest.setup.ts
```

---

## Task 1: Inicializar el proyecto Next.js

**Files:**
- Create: directorio `C:\Users\herna\Loboost App\` (ya existe — inicializar ahí)

- [ ] **Step 1: Inicializar Next.js en el directorio existente**

Abrir terminal en `C:\Users\herna\Loboost App\` y ejecutar:

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --yes
```

Cuando pregunte si continuar en directorio no vacío → `y`

Expected output: `Success! Created loboost at C:\Users\herna\Loboost App`

- [ ] **Step 2: Verificar estructura creada**

```bash
ls src/app
```

Expected: `favicon.ico  globals.css  layout.tsx  page.tsx`

- [ ] **Step 3: Instalar dependencias de Supabase y Zod**

```bash
npm install @supabase/ssr @supabase/supabase-js zod
```

Expected: sin errores, `package.json` actualizado.

- [ ] **Step 4: Eliminar archivos de ejemplo de Next.js**

Eliminar el contenido por defecto que viene con create-next-app:

```bash
rm src/app/page.tsx
```

Reemplazar `src/app/globals.css` con solo el contenido base de Tailwind:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Commit inicial**

```bash
git init
git add .
git commit -m "chore: initialize Next.js 15 project with Supabase and Zod"
```

---

## Task 2: Configurar Jest + Testing Library

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Modify: `package.json` (scripts de test)

- [ ] **Step 1: Instalar dependencias de testing**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 2: Crear `jest.config.ts`**

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.tsx',
  ],
}

export default createJestConfig(config)
```

- [ ] **Step 3: Crear `jest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Agregar scripts de test en `package.json`**

En la sección `"scripts"` de `package.json`, agregar:

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

- [ ] **Step 5: Verificar que Jest funciona**

```bash
npx jest --version
```

Expected: versión de Jest impresa sin errores.

- [ ] **Step 6: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json package-lock.json
git commit -m "chore: configure Jest and Testing Library"
```

---

## Task 3: Crear CLAUDE.md y estructura de carpetas

**Files:**
- Create: `CLAUDE.md`
- Create: directorios vacíos con `.gitkeep` temporal

- [ ] **Step 1: Crear `CLAUDE.md` en la raíz**

```markdown
# LoBoost — CLAUDE.md

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Supabase (auth + base de datos)
- Zod para validación, Server Actions para mutaciones

## Estructura
- Todo el código en `src/`
- Feature-based: `src/features/[feature]/`
- Primitivos UI en `src/components/ui/`
- Helpers sin UI en `src/lib/`

## Convenciones críticas
- Archivos: kebab-case (`create-plan.ts`, `plan-editor.tsx`)
- Componentes: PascalCase (`PlanEditor`)
- Server Components por defecto. `'use client'` solo cuando sea necesario.
- `createBrowserClient` → solo en componentes con `'use client'`
- `createServerClient` → Server Components, server actions, middleware
- Schemas Zod en `features/[feature]/schemas.ts`, no dentro de actions.
- Tipos de dominio en `features/[feature]/types.ts`
- Tipos de DB en `src/types/database.ts` — generados, no editados a mano.

## Planes: distinción obligatoria
- `Plan` = template del coach (tabla `plans`)
- `ClientPlan` = copia asignada al cliente (tabla `client_plans`)
- `assignPlan()` siempre crea una copia, nunca una referencia.

## Supabase
- Regenerar tipos: `npx supabase gen types typescript --local > src/types/database.ts`
- Migraciones: `supabase/migrations/` — nunca cambiar schema solo desde el dashboard.

## Design system
- Tokens en `docs/design/DESIGN.md`
- Referencias de Stitch en `docs/design/stitch/` — solo como referencia visual
- Nunca copiar código de Stitch a `features/` directamente
- Prompts de Stitch los genera Claude Code, no el usuario manualmente

## Auth
- Coaches se registran en `/register`
- Clientes los crea el coach desde su dashboard (no se auto-registran)
```

- [ ] **Step 2: Crear carpetas base de la estructura**

```bash
mkdir -p src/features/auth/components
mkdir -p src/features/auth/actions
mkdir -p src/lib/supabase
mkdir -p src/lib/auth
mkdir -p src/components/ui
mkdir -p src/types
mkdir -p supabase/migrations
mkdir -p docs/design/stitch
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md src/ supabase/ docs/
git commit -m "chore: add CLAUDE.md and project folder structure"
```

---

## Task 4: Crear clientes de Supabase

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/lib/utils.ts`
- Create: `src/types/database.ts` (placeholder hasta generar tipos reales)

- [ ] **Step 1: Crear variables de entorno**

Crear `.env.local` en la raíz:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Reemplazar los valores con los de tu proyecto Supabase (Settings → API).

- [ ] **Step 2: Crear `src/types/database.ts` (placeholder)**

```ts
// Este archivo se regenera con: npx supabase gen types typescript --local > src/types/database.ts
// Por ahora usamos un placeholder hasta aplicar la migración

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'coach' | 'client'
          full_name: string | null
          avatar_url: string | null
          coach_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'coach' | 'client'
          full_name?: string | null
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string
        }
        Update: {
          role?: 'coach' | 'client'
          full_name?: string | null
          avatar_url?: string | null
          coach_id?: string | null
        }
      }
    }
  }
}
```

- [ ] **Step 3: Crear `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Crear `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede fallar en Server Components (read-only). Se ignora.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 5: Crear `src/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, supabaseResponse, user }
}
```

- [ ] **Step 6: Crear `src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Instalar dependencias:

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/ src/types/ .env.local
git commit -m "feat: add Supabase clients and utility helpers"
```

---

## Task 5: Crear migración inicial de Supabase

**Files:**
- Create: `supabase/migrations/20260408000000_init.sql`

- [ ] **Step 1: Crear el archivo de migración**

Crear `supabase/migrations/20260408000000_init.sql`:

```sql
-- =============================================
-- Tabla: profiles
-- Extiende auth.users con rol y datos del usuario
-- =============================================

create table public.profiles (
  id         uuid references auth.users on delete cascade not null primary key,
  role       text check (role in ('coach', 'client')) not null,
  full_name  text,
  avatar_url text,
  coach_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;

-- Cada usuario puede ver su propio perfil
create policy "profiles: select own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Cada usuario puede actualizar su propio perfil
create policy "profiles: update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Coach puede ver los perfiles de sus clientes
create policy "profiles: coach sees own clients"
  on public.profiles
  for select
  using (
    coach_id = auth.uid()
  );

-- =============================================
-- Trigger: crear perfil al registrarse
-- El rol se pasa en raw_user_meta_data.role
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'coach'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
```

- [ ] **Step 2: Aplicar la migración en Supabase**

En el dashboard de Supabase → SQL Editor, ejecutar el contenido completo del archivo.

O si tenés Supabase CLI configurado:

```bash
npx supabase db push
```

Expected: sin errores. La tabla `profiles` aparece en Table Editor.

- [ ] **Step 3: Verificar RLS**

En Supabase → Authentication → Policies, verificar que `profiles` tiene RLS habilitado y las 3 políticas creadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add profiles table with RLS and new user trigger"
```

---

## Task 6: Crear helpers de rol (con TDD)

**Files:**
- Create: `src/lib/auth/__tests__/roles.test.ts`
- Create: `src/lib/auth/roles.ts`
- Create: `src/lib/auth/session.ts`

- [ ] **Step 1: Escribir el test**

Crear `src/lib/auth/__tests__/roles.test.ts`:

```ts
import { getUserRole, isCoach, isClient } from '@/lib/auth/roles'

// Mock del cliente de Supabase server
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('getUserRole', () => {
  it('returns null when there is no authenticated user', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: jest.fn(),
    } as any)

    const role = await getUserRole()
    expect(role).toBeNull()
  })

  it('returns coach when user profile has role coach', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'coach' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const role = await getUserRole()
    expect(role).toBe('coach')
  })

  it('returns client when user profile has role client', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-456' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'client' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const role = await getUserRole()
    expect(role).toBe('client')
  })
})

describe('isCoach / isClient', () => {
  it('isCoach returns true for coach role', () => {
    expect(isCoach('coach')).toBe(true)
    expect(isCoach('client')).toBe(false)
    expect(isCoach(null)).toBe(false)
  })

  it('isClient returns true for client role', () => {
    expect(isClient('client')).toBe(true)
    expect(isClient('coach')).toBe(false)
    expect(isClient(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
npx jest src/lib/auth/__tests__/roles.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/auth/roles'`

- [ ] **Step 3: Implementar `src/lib/auth/roles.ts`**

```ts
import { createClient } from '@/lib/supabase/server'

export type Role = 'coach' | 'client'

export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile?.role as Role) ?? null
}

export function isCoach(role: Role | null): role is 'coach' {
  return role === 'coach'
}

export function isClient(role: Role | null): role is 'client' {
  return role === 'client'
}
```

- [ ] **Step 4: Implementar `src/lib/auth/session.ts`**

```ts
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) return null
  return session
}
```

- [ ] **Step 5: Ejecutar tests para verificar que pasan**

```bash
npx jest src/lib/auth/__tests__/roles.test.ts --no-coverage
```

Expected: PASS — 5 tests passed

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/
git commit -m "feat: add role helpers with tests (getUserRole, isCoach, isClient)"
```

---

## Task 7: Implementar middleware de protección de rutas

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Crear `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const PUBLIC_ROUTES = ['/login', '/register']
const COACH_PREFIX = '/coach'
const CLIENT_PREFIX = '/client'

async function getRoleFromRequest(
  request: NextRequest
): Promise<'coach' | 'client' | null> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile?.role as 'coach' | 'client') ?? null
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Rutas públicas: redirigir si ya está logueado
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  if (isPublicRoute) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // Sin sesión: redirigir a login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Protección por rol
  const isCoachRoute = pathname.startsWith(COACH_PREFIX)
  const isClientRoute = pathname.startsWith(CLIENT_PREFIX)

  if (isCoachRoute || isClientRoute) {
    const role = await getRoleFromRequest(request)

    if (isCoachRoute && role !== 'coach') {
      return NextResponse.redirect(new URL('/client/dashboard', request.url))
    }
    if (isClientRoute && role !== 'client') {
      return NextResponse.redirect(new URL('/coach/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add role-based route protection middleware"
```

---

## Task 8: Crear schemas de autenticación (con TDD)

**Files:**
- Create: `src/features/auth/__tests__/schemas.test.ts`
- Create: `src/features/auth/schemas.ts`

- [ ] **Step 1: Escribir el test**

Crear `src/features/auth/__tests__/schemas.test.ts`:

```ts
import { loginSchema, registerSchema } from '@/features/auth/schemas'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'coach@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })
})

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
      fullName: 'Juan Pérez',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fullName', () => {
    const result = registerSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('fullName')
  })

  it('rejects fullName shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
      fullName: 'A',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
npx jest src/features/auth/__tests__/schemas.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/features/auth/schemas'`

- [ ] **Step 3: Implementar `src/features/auth/schemas.ts`**

```ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
```

- [ ] **Step 4: Ejecutar tests para verificar que pasan**

```bash
npx jest src/features/auth/__tests__/schemas.test.ts --no-coverage
```

Expected: PASS — 6 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/
git commit -m "feat: add auth Zod schemas with tests (loginSchema, registerSchema)"
```

---

## Task 9: Crear Server Actions de autenticación

**Files:**
- Create: `src/features/auth/actions/sign-in.ts`
- Create: `src/features/auth/actions/sign-up.ts`
- Create: `src/features/auth/actions/sign-out.ts`

- [ ] **Step 1: Crear `src/features/auth/actions/sign-in.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/features/auth/schemas'
import { getUserRole } from '@/lib/auth/roles'

export async function signIn(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return { error: 'Email o contraseña incorrectos' }
  }

  const role = await getUserRole()

  if (role === 'coach') redirect('/coach/dashboard')
  if (role === 'client') redirect('/client/dashboard')

  redirect('/')
}
```

- [ ] **Step 2: Crear `src/features/auth/actions/sign-up.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { registerSchema } from '@/features/auth/schemas'

export async function signUp(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  }

  const result = registerSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        role: 'coach',           // Registro directo → siempre coach
        full_name: result.data.fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // El trigger de Supabase crea el perfil automáticamente
  redirect('/coach/dashboard')
}
```

- [ ] **Step 3: Crear `src/features/auth/actions/sign-out.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/actions/
git commit -m "feat: add auth server actions (signIn, signUp, signOut)"
```

---

## Task 10: Crear componentes de UI de autenticación

**Files:**
- Create: `src/features/auth/components/login-form.tsx`
- Create: `src/features/auth/components/register-form.tsx`

- [ ] **Step 1: Crear `src/features/auth/components/login-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { signIn } from '@/features/auth/actions/sign-in'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-gray-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="tu@email.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-gray-400">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-[#b5f23d] text-black font-semibold rounded-lg px-4 py-3 hover:bg-[#c8ff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Crear `src/features/auth/components/register-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { signUp } from '@/features/auth/actions/sign-up'

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1">
        <label htmlFor="fullName" className="text-sm text-gray-400">
          Nombre completo
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="Juan Pérez"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-gray-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="tu@email.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-gray-400">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-[#b5f23d] text-black font-semibold rounded-lg px-4 py-3 hover:bg-[#c8ff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/components/
git commit -m "feat: add LoginForm and RegisterForm components"
```

---

## Task 11: Crear páginas de autenticación

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Crear `src/app/(auth)/login/page.tsx`**

```tsx
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Lo<span className="text-[#b5f23d]">Boost</span>
          </h1>
          <p className="mt-2 text-gray-400 text-sm">Ingresá a tu cuenta</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tenés cuenta?{' '}
          <Link
            href="/register"
            className="text-[#b5f23d] hover:underline"
          >
            Registrate como coach
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Crear `src/app/(auth)/register/page.tsx`**

```tsx
import Link from 'next/link'
import { RegisterForm } from '@/features/auth/components/register-form'

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Lo<span className="text-[#b5f23d]">Boost</span>
          </h1>
          <p className="mt-2 text-gray-400 text-sm">Creá tu cuenta como coach</p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="text-[#b5f23d] hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat: add login and register pages"
```

---

## Task 12: Crear root layout, redirect y shells de dashboard

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/(coach)/layout.tsx`
- Create: `src/app/(coach)/dashboard/page.tsx`
- Create: `src/app/(client)/layout.tsx`
- Create: `src/app/(client)/dashboard/page.tsx`

- [ ] **Step 1: Actualizar `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LoBoost',
  description: 'Plataforma profesional para coaches de fitness',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Crear `src/app/page.tsx` (redirect por rol)**

```tsx
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/session'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getUserRole()

  if (role === 'coach') redirect('/coach/dashboard')
  if (role === 'client') redirect('/client/dashboard')

  redirect('/login')
}
```

- [ ] **Step 3: Crear `src/app/(coach)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserRole } from '@/lib/auth/roles'
import { signOut } from '@/features/auth/actions/sign-out'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'coach') redirect('/client/dashboard')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white">
          Lo<span className="text-[#b5f23d]">Boost</span>
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Salir
          </button>
        </form>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Crear `src/app/(coach)/dashboard/page.tsx`**

```tsx
import { getCurrentUser } from '@/lib/auth/session'

export default async function CoachDashboardPage() {
  const user = await getCurrentUser()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-gray-400 text-sm">
        Bienvenido, {user?.email}
      </p>
      <div className="mt-8 p-6 bg-[#141414] rounded-xl border border-[#1e1e1e]">
        <p className="text-gray-500 text-sm">
          Panel del coach — próximamente: gestión de clientes, planes y ejercicios.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Crear `src/app/(client)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserRole } from '@/lib/auth/roles'
import { signOut } from '@/features/auth/actions/sign-out'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'client') redirect('/coach/dashboard')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white">
          Lo<span className="text-[#b5f23d]">Boost</span>
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Salir
          </button>
        </form>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: Crear `src/app/(client)/dashboard/page.tsx`**

```tsx
import { getCurrentUser } from '@/lib/auth/session'

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Mi Dashboard</h1>
      <p className="text-gray-400 text-sm">
        Bienvenido, {user?.email}
      </p>
      <div className="mt-8 p-6 bg-[#141414] rounded-xl border border-[#1e1e1e]">
        <p className="text-gray-500 text-sm">
          Panel del cliente — próximamente: tu plan activo y registro de progreso.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Ejecutar todos los tests**

```bash
npx jest --no-coverage
```

Expected: PASS — todos los tests pasan (roles + schemas)

- [ ] **Step 8: Verificar que el build no tiene errores de TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin output (sin errores)

- [ ] **Step 9: Commit final**

```bash
git add src/app/
git commit -m "feat: add root redirect, coach and client dashboard shells"
```

---

## Task 13: Smoke test manual

- [ ] **Step 1: Levantar el servidor de desarrollo**

```bash
npm run dev
```

Expected: `ready - started server on http://localhost:3000`

- [ ] **Step 2: Verificar flujo completo**

Abrir `http://localhost:3000` en el browser:

1. `/` → redirige a `/login` ✓
2. Registrarse como coach en `/register` → redirige a `/coach/dashboard` ✓
3. Acceder a `/client/dashboard` mientras sos coach → redirige a `/coach/dashboard` ✓
4. Hacer logout → redirige a `/login` ✓
5. Intentar acceder a `/coach/dashboard` sin sesión → redirige a `/login` ✓

- [ ] **Step 3: Verificar en Supabase**

En Supabase → Table Editor → `profiles`:
- Debe haber una fila con tu email, `role = 'coach'`, y `created_at` reciente.

- [ ] **Step 4: Commit de cierre de fase**

```bash
git add -A
git commit -m "feat: complete Phase 1 — auth system with role-based routing"
```

---

## Resultado de esta fase

Al completar esta fase tenés:
- App Next.js 15 funcionando con estructura feature-based
- Autenticación completa: registro (coach), login, logout
- Middleware con protección de rutas por rol
- DB con tabla `profiles`, RLS configurado y trigger de creación de perfil
- Tests unitarios para schemas Zod y helpers de rol
- Shells de dashboard para coach y cliente listos para recibir features
- `CLAUDE.md` con todas las convenciones del proyecto

**Siguiente fase:** Diseño del sistema visual base (Stitch + DESIGN.md + primitivos en `components/ui/`) — requiere brainstorming propio.
