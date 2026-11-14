# Bonsái Zen

Juego web match-3 de cultivo de bonsáis. Combina piezas (hojas, flores de cerezo, gotas de agua, tijeras de poda, fertilizante, piedras y semillas) para hacer crecer tu bonsái a través de cuatro estaciones y 48 niveles.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · Framer Motion · Three.js con React Three Fiber y Drei · PostgreSQL (`pg`) · Stripe (modo test) · Vitest · Playwright.

---

## Funcionalidades

- **Match-3** con cascadas, multiplicadores por combo, objetivos por nivel (reunir piezas, puntuación, podas, cascadas) y tres boosters: tijera (corta una fila), lluvia (elimina piezas al azar) y fertilizante (duplica el siguiente combinado).
- **Dificultad:**
  - *Novato:* tiempo y movimientos ilimitados, pista con un botón, menos objetivos y el bonsái nunca se marchita.
  - *Pro:* límite de movimientos y de tiempo, el bonsái puede marchitarse (se cuida con gotas de agua para el riego y tijeras para la poda) y el clima cambia qué piezas aparecen cada 8 movimientos.
  - La elección se guarda en el progreso del usuario.
- **Gratis vs Premium:** vidas que se recargan (1 cada 30 min), anuncio simulado en los resultados, niveles 1–30 y Pro en los niveles 1–12. Premium desbloquea vidas ilimitadas, sin anuncios, los niveles 31–48, Pro completo y los fondos exclusivos.
- **Historia:** cuatro capítulos (uno por estación) con diálogos de la guardiana Ume. El final depende de si completas el último nivel de cada estación en Pro.
- **Bonsái 3D procedural:** ramas y follaje generados a partir de una semilla, corteza con textura procedural, cinco etapas (semilla → obra maestra), tres estilos (cascada, japonés, vertical) y paleta por estación (flores en primavera, hojas rojizas en otoño, nieve en invierno).
- **Animaciones:** caída y rebote de piezas, explosiones de partículas, cascadas anunciadas, balanceo del bonsái y brillo al lograr un logro. Respeta `prefers-reduced-motion` y tiene interruptores de animaciones y de movimiento reducido.
- **Acceso sin login:** al pulsar “Empezar” se crea una cuenta de invitado con su progreso en la base de datos y una sesión en cookie httpOnly. No hay pantalla de registro ni de inicio de sesión.
- **Puntuación:** ranking global y por dificultad, perfil con estadísticas y 18 logros.
- **Idiomas:** español e inglés.

---

## Requisitos

- Node.js 20.9 o superior (probado con Node 22).
- PostgreSQL 14 o superior (local, Vercel Postgres/Neon o Supabase).

## Instalación local

```bash
npm install
cp .env.example .env.local          # y rellena DATABASE_URL (y, si quieres pagos, las claves de Stripe)
export DATABASE_URL=postgres://usuario:clave@localhost:5432/bonsai_zen
npm run db:migrate                  # crea el esquema (es idempotente)
npm run dev                         # http://localhost:3000
```

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL. Si no está, `POSTGRES_URL` (nombre que usa Vercel Postgres) también sirve. |
| `DATABASE_SSL` | No | `true` para Neon/Supabase (SSL). `false` o sin definir para Postgres local. |
| `STRIPE_SECRET_KEY` | Pagos | Clave secreta de Stripe en modo test (`sk_test_...`). Sin ella, la tienda muestra que los pagos no están configurados. |
| `STRIPE_WEBHOOK_SECRET` | Pagos | Secreto de firma del webhook (`whsec_...`). |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Pagos | ID del precio del producto Premium (`price_...`) creado en Stripe en modo test. |
| `NEXT_PUBLIC_APP_URL` | No | URL pública de la app para las redirecciones de Checkout. Si falta, se usa el origen de la petición. |
| `SESSION_COOKIE_SECURE` | No | `true` en producción para marcar la cookie de sesión como `Secure`. |

Consulta `.env.example`. **Nunca subas `.env.local` al repositorio.**

## Pagos con Stripe (modo test)

1. En el dashboard de Stripe, en modo test, crea un producto "Bonsái Zen Premium" con un precio **único** (pago único). Copia su ID en `NEXT_PUBLIC_STRIPE_PRICE_ID`.
2. Copia la clave secreta de test en `STRIPE_SECRET_KEY`.
3. Para probar el webhook en local, usa la CLI de Stripe:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   La CLI muestra un secreto `whsec_...`: ponlo en `STRIPE_WEBHOOK_SECRET`.
4. En producción, crea un endpoint de webhook en Stripe apuntando a `https://TU-DOMINIO/api/stripe/webhook` con el evento `checkout.session.completed` y usa su secreto.

El webhook verifica la firma y es idempotente: cada evento se procesa una sola vez (tabla `stripe_events`), y el paso a Premium lo hace el servidor, nunca el cliente.

## Esquema de base de datos

El esquema está en [`db/schema.sql`](db/schema.sql) y se aplica con `npm run db:migrate`.

| Tabla | Contenido |
|---|---|
| `users` | Nombre, correo único, hash de contraseña (bcrypt), `is_premium`, ID de cliente de Stripe. Los invitados tienen un correo generado y una contraseña aleatoria que nadie conoce. |
| `sessions` | Sesiones. El id es el SHA-256 del token de la cookie; el token nunca se guarda en claro. |
| `player_progress` | Dificultad, nivel actual, estación, semilla del bonsái, monedas, boosters, vidas y su ancla temporal, estadísticas (JSON) y logros desbloqueados. |
| `level_results` | Historial de partidas: nivel, dificultad, victoria, estrellas y puntuación. Alimenta el ranking. |
| `purchases` | Compras de Stripe pagadas (una fila por sesión de Checkout). |
| `stripe_events` | Eventos de webhook ya procesados (idempotencia). |

### ¿Por qué PostgreSQL y no Supabase Auth ni otra base?

Elegí **PostgreSQL con el driver `pg`** porque:
- Es el mismo código en **Vercel Postgres** (basado en Neon), **Supabase** y un Postgres local: basta cambiar `DATABASE_URL`.
- Las transacciones (`select ... for update`) protegen las vidas y el progreso frente a peticiones simultáneas.
- Las consultas del ranking y del historial son simples SQL sin capas extra.
- Evité Supabase Auth y NextAuth: la autenticación es propia (bcrypt + sesiones en BD + cookie httpOnly), con menos dependencias y sin depender de un proveedor externo.

## Arquitectura

```
src/
  game/        Lógica pura (sin React): tablero, motor, dificultad, vidas, puntuación,
               progresión, bonsái procedural y RNG determinista.
  data/        Niveles (48), logros (18), guion de la historia, fondos y textos i18n.
  store/       Zustand: ajustes (persistidos), sesión y partida en curso.
  lib/         Servidor: db, auth, progreso (transacciones), premium, stripe, API.
               Cliente: api-client, sonido, hooks de i18n y sesión.
  components/  Tablero, escena 3D del bonsái, historia, anuncios, HUD.
  app/         Pantallas (App Router) y rutas de API (/api/...).
db/schema.sql  Esquema de PostgreSQL.
scripts/       migrate.mjs (aplica el esquema).
tests/unit/    Pruebas de la lógica (Vitest).
tests/e2e/     Pruebas de flujo completo (Playwright).
```

**Principios:**
- El motor del juego es puro e inmutable: cada jugada devuelve un nuevo estado y una lista de "pasos" que la interfaz anima. Por eso es testeable sin navegador.
- El servidor es la fuente de verdad para vidas, estrellas, monedas, logros, avance de nivel y Premium. El cliente solo envía el resultado de la partida.
- `isPremium()` y las reglas de acceso (`canPlayLevel`, `canUseDifficulty`) están centralizadas en [`src/lib/premium.ts`](src/lib/premium.ts).
- Three.js y el bonsái 3D se cargan con `next/dynamic` solo en el navegador, con un respaldo visual si WebGL no está disponible.

## Pruebas

```bash
npm test                 # Vitest: tablero, motor, dificultad, vidas, progresión, logros, bonsái, textos
npm run typecheck        # TypeScript sin emitir archivos
npm run build            # build de producción
DATABASE_URL=... npm run test:e2e   # Playwright (levanta `next start` en el puerto 3100)
```

Para las pruebas e2e hay que haber hecho antes `npm run build` y tener la base de datos migrada. Playwright reutiliza el Chromium del sistema si está en `/opt/pw-browsers/chromium`; en otro entorno ejecuta `npx playwright install chromium`.

El equilibrio de niveles se comprobó con un bot de simulación: en Novato se completan los 48 niveles; en Pro, un bot de un solo paso completa alrededor del 75 % de las partidas, lo que deja margen para que una persona planifique mejor.

## Desplegar en Vercel

1. **Base de datos:** crea una base en Vercel Postgres (o Neon/Supabase). Copia la cadena de conexión.
2. **Esquema:** aplícalo una vez desde tu máquina:
   ```bash
   DATABASE_URL="postgres://..." DATABASE_SSL=true npm run db:migrate
   ```
3. **Proyecto:** importa el repositorio en Vercel. Vercel detecta Next.js y usa `vercel.json` (`npm ci` y `npm run build`).
4. **Variables de entorno** en Vercel (Project → Settings → Environment Variables): `DATABASE_URL`, `DATABASE_SSL=true`, `NEXT_PUBLIC_APP_URL` (tu dominio), `SESSION_COOKIE_SECURE=true`, y las tres de Stripe si quieres pagos.
5. **Webhook de Stripe:** crea el endpoint `https://TU-DOMINIO/api/stripe/webhook` con el evento `checkout.session.completed` y pon su secreto en `STRIPE_WEBHOOK_SECRET`.
6. Despliega. Las migraciones no se ejecutan en el build: repítelo (paso 2) cada vez que cambie `db/schema.sql`.

## Estado y pendiente

**Funcionando:** tablero y motor con pruebas; Novato y Pro (vidas, tiempo, marchitado, clima); bonsái 3D con etapas, estilos y estaciones; historia y dos finales; registro, sesiones y progreso guardado en PostgreSQL; ranking, perfil y 18 logros; tienda de boosters con monedas; Stripe Checkout y webhook verificado con firmas reales; i18n en español e inglés; animaciones con opción de reducir movimiento; `npm run build`, `npm test` y las pruebas e2e pasan.

**Pendiente o a revisar:**
- El bonsái es un modelo procedural de estilo *low-poly* con corteza texturizada, no fotorrealista. Mejorarlo implica assets o técnicas más pesadas.
- Los anuncios son un espacio simulado (`AdSlot`). Hay que conectar una red de anuncios real.
- Los sonidos son tonos generados con WebAudio; no hay música.
- La tienda solo vende Premium con Stripe y los boosters con monedas. No hay paquetes de monedas de pago.
- Los fondos "exclusivos" son visuales. Las estaciones "exclusivas" de Premium son los niveles 31–48.
- Falta cubrir con pruebas las rutas de API con base de datos (se comprobaron a mano con `curl` y en el flujo e2e).
- Falta un panel de administración y una política de privacidad/términos antes de abrirlo al público.
