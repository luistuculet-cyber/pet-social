# Checkpoint de Contexto y Estado Arquitectónico (PET-Social)

Este archivo centraliza el estado actual, hitos alcanzados y decisiones arquitectónicas para que cualquier modelo o nueva sesión en Antigravity IDE retome el trabajo sin pérdida de contexto.

## 1. Línea Base Arquitectónica Activa (v0.34.0+)
- **Base de datos & Backend**: MySQL con ORM Prisma. Flujos transaccionales reales (prohibidos parches `localStorage`).
- **Autenticación de Tutores**: Acceso directo a `/tutor/perfil` una vez autenticado/registrado, gestionado en `middleware.ts`.
- **Motor de Despacho (`dispatch-engine.ts`)**:
  - Todo veterinario entra con `status = 'active'` e `isOnline = true`.
  - Consultas sin coincidencia por radio permanecen en cola en estado `pending` (prohibido cancelar prematuramente).
  - Sincronización multi-sesión confirmada mediante `/api/dispatch/[id]/accept` y polling de UI.
- **Regla UI Tutor**: Está absolutamente prohibido utilizar las palabras "Urgencia" o "Emergencia" en cualquier texto o interfaz visible para el tutor.

## 2. Checklist de Eficiencia & Continuidad (Activo)
- [x] Reglas de Eficiencia de Tokens añadidas a `AGENTS.md` (lectura quirúrgica, salidas concisas, límites en logs/diffs).
- [x] Protocolo de Guardado de Contexto (`/context-save` / `/context-restore` y `.agents/CONTEXT_CHECKPOINT.md`) configurado a nivel global y de proyecto.
- [ ] Próximos hitos de desarrollo o resolución de incidencias en PET-Social.
