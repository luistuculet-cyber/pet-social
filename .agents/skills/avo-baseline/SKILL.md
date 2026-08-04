---
name: avo-baseline
description: Arquitectura de referencia y reglas obligatorias de pet-social (AVO) consolidadas en v0.33.0 para flujos multi-sesión de videoconsultas, despacho e inicio de sesión de tutores y veterinarios.
---

# AVO Baseline Architecture (v0.33.0+)

Esta habilidad es de lectura y aplicación obligatoria al modificar o expandir la plataforma **AVO (pet-social)** a partir de la versión `0.33.0`.

## 1. Reglas de Persistencia y Base de Datos (MySQL / Prisma)
- **Estado Inicial de Veterinarios**: En `/api/auth/register` y `/api/auth/login`, todo veterinario debe registrarse e iniciar sesión con `status = 'active'` e `isOnline = true` en su modelo `User`.
- **Motor de Despacho (`dispatch-engine.ts`)**:
  - Está **estrictamente prohibido** marcar una solicitud como `status: 'cancelled'` de forma automática si `assignNextAvailableVet()` no encuentra un veterinario en el radio inicial.
  - Toda solicitud de videoconsulta o urgencia no asignada en el segundo 0 debe permanecer en la cola con `status: 'pending'` y ser accesible por cualquier veterinario activo.

## 2. Sincronización Multi-Sesión (Tutor vs. Veterinario)
- **Aceptación de Urgencias (`/api/dispatch/[id]/accept`)**:
  - Cuenta con respaldo para aceptar la última solicitud pendiente (`status: 'pending'` u `'offered'`) en base de datos en caso de que el ID en memoria de la sesión local del veterinario difiera del ID real de la base de datos.
- **Polling en Pantalla de Espera del Tutor (`/espera`)**:
  - Realiza sondeo sobre su ID individual y sobre `GET /api/dispatch?status=accepted` como seguro de sincronización. En cuanto un profesional acepta, el navegador del tutor navega inmediatamente a la sala o mapa.

## 3. Autenticación y Navegación de Tutores
- Las rutas `/tutor/login`, `/tutor/perfil` y `/registro-tutor` están configuradas en `middleware.ts` sin redirecciones cruzadas ni bucles al registro.
- No modificar estas rutas sin verificar en sesión dual que el acceso al perfil tras login/registro sigue siendo directo.

## 4. Política de Despliegue
- Cualquier entrega que se suba a producción en `https://avo.totalia.com.ar` debe incluir:
  1. Incremento de versión en `package.json`.
  2. Generación del archivo `AVO-vX.Y.Z-deploy.zip` y `deploy.zip`.
