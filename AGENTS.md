<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## PROTOCOLO OBLIGATORIO DE AUDITORÍA Y ARQUITECTURA (PET-SOCIAL)

1. **Cero Parches Superficiales (Prohibido simular en localStorage para flujos reales)**:
   - Toda corrección sobre flujos transaccionales (Login, Registro, Videoconsultas, Urgencias) DEBE auditar y corregir la persistencia en la base de datos MySQL (Prisma) y las rutas de API (`/api/dispatch`, `/api/auth`).
   - Nunca utilizar parches en memoria o `localStorage` como sustituto de la sincronización en el backend.

2. **Auditoría Multi-Sesión (Tutor vs. Veterinario)**:
   - Al investigar un fallo entre dos roles/navegadores, es OBLIGATORIO trazar las 4 capas de extremo a extremo antes de modificar código:
     1. *Estado en BD*: ¿Con qué `status` inicial se crea el registro (ej. `active` vs `pending`)?
     2. *Motor de Emparejamiento (`dispatch-engine.ts`)*: Verificar qué ocurre si una búsqueda en radio da 0 resultados. PROHIBIDO cambiar a estado `cancelled` automáticamente si no hay coincidencia inmediata; mantener en cola `pending`.
     3. *API Get/Post*: Revisar las cláusulas `where` en Prisma para asegurar que ningún filtro excluye peticiones válidas en cola.
     4. *Polling en UI*: Asegurar que el frontend consulte el estado oficial del backend (`GET /api/dispatch?status=accepted`) como respaldo si el ID local difiere.

3. **Verificación de Empaquetado y Despliegue**:
   - Cada entrega que requiera subir cambios al servidor DEBE verificar explícitamente que `package.json` tenga la versión actualizada y que `AVO-vX.Y.Z-deploy.zip` y `deploy.zip` se hayan generado correctamente.

4. **Línea Base Arquitectónica del Proyecto (v0.33.0 en adelante)**:
   - **Esquema y Flujo de Videoconsultas (Tutor vs. Veterinario)**:
     - Todo veterinario que inicia sesión o se registra obtiene `status = 'active'` e `isOnline = true` en base de datos.
     - El motor de despacho (`dispatch-engine.ts`) mantiene urgencias en estado `pending` en MySQL si la asignación por radio no encuentra coincidencias inmediatas, prohibiendo cancelar consultas prematuramente.
     - Sincronización multi-sesión robusta: `/api/dispatch/[id]/accept` y el polling en `/espera` garantizan la transición del tutor en su propio navegador al momento en que el profesional acepta la urgencia.
   - **Autenticación de Tutores (`/tutor/login` y `/registro-tutor`)**:
     - Acceso limpio a `/tutor/perfil` sin bucles ni redirecciones al registro, soportado en `middleware.ts`.
   - **Regla de Evolución**: Toda nueva funcionalidad o modificación futura DEBE construir sobre esta arquitectura consolidada en `v0.33.0`, protegiendo su persistencia transaccional y sin causar regresiones.

5. **Política de Eficiencia de Tokens y Lectura Quirúrgica**:
   - **Prohibido volcar archivos enteros innecesariamente**: Evitar usar `view_file` para leer archivos completos mayores a 100 líneas si solo se necesita inspeccionar un fragmento o función; usar siempre rangos (`StartLine`/`EndLine`) o búsquedas `grep_search`.
   - **Salidas concisas (REGLA ESTRICTA DE RESPUESTA)**: No expliques tu proceso de razonamiento. No detalles los pasos que seguiste ni las herramientas que utilizaste. Tu única respuesta debe ser el resultado final exacto y directo de la tarea solicitada, sin introducciones, sin despedidas y sin contexto adicional. No volver a pegar en el chat el código extenso de bloques ya modificados.
   - **Optimización en terminal**: Limitar y filtrar salidas de comandos largos (`git log -n 5`, `git diff --stat`, paginado con `head`/`tail`).
   - **No re-resumir artefactos**: Al crear/modificar un `.md`, proporcionar solo el enlace al archivo y mencionar preguntas/decisiones pendientes.

6. **Guardado Automático y Recuperación de Contexto entre Modelos/Sesiones**:
   - **Transición fluida en la misma sesión**: Al cambiar de modelo en una conversación activa, reanudar el trabajo sin re-litigar decisiones previas.
   - **Checkpointing (`/context-save` y `/context-restore`)**: Antes de operaciones críticas, pausas o al completar hitos, invocar `/context-save` (o usar modo continuo) para salvaguardar estado y pendientes. Al iniciar una sesión, ejecutar `/context-restore`.
   - **Archivo de estado persistente**: Mantener un archivo `.agents/CONTEXT_CHECKPOINT.md` con checklist del progreso (`[x]` / `[ ]`) y decisiones arquitectónicas activas.

7. **Diseño Mobile-First de Barras de Navegación**:
   - **Fondo sólido obligatorio**: Toda barra de navegación (header, bottom bar, tab bar) en mobile DEBE usar un fondo completamente opaco (ej. `bg-slate-950`). PROHIBIDO usar `backdrop-blur`, opacidades parciales (`bg-x/60`, `bg-x/95`) o glassmorphism en barras de navegación mobile, ya que los íconos resultan ilegibles sobre contenido de scroll.
   - **Sin superposición de contenido (patrón homebanking)**: Las barras fijas (`fixed`, `sticky`) NUNCA deben cubrir contenido interactivo. Toda página que incluya una bottom bar fija DEBE reservar espacio inferior con `pb-24` (o un spacer `<div>` invisible). El contenido principal debe hacer scroll sin quedar oculto debajo de las barras.
   - **Safe areas móviles**: El `<meta viewport>` debe incluir `viewport-fit=cover` y los paddings de barras deben considerar `env(safe-area-inset-bottom)` para dispositivos con notch o barra gestual.
