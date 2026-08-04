# Reglas de Proyecto AVO (pet-social)

## Control de Versiones y Compilación
1. **Incremento Obligatorio de Versión**: Cada compilación de entrega y empaquetado debe avanzar en 1 la versión en `package.json` (por ejemplo: si la última es `0.34.0`, la próxima debe ser `0.35.0`).
2. **Archivos de Despliegue**: Al empaquetar, se debe generar siempre `AVO-vX.Y.Z-deploy.zip` y una copia `deploy.zip` con la nueva versión.
3. **Terminología Prohibida (Tutor)**: Está absolutamente prohibido utilizar las palabras "Urgencia" o "Emergencia" en cualquier texto o interfaz visible para el tutor de mascota.
4. **Política de Eficiencia de Tokens y Lectura Quirúrgica**:
   - Evitar `view_file` de archivos enteros si solo se busca una parte; utilizar `grep_search` o rangos de líneas.
   - **REGLA ESTRICTA DE RESPUESTA**: No expliques tu proceso de razonamiento. No detalles los pasos que seguiste ni las herramientas que utilizaste. Tu única respuesta debe ser el resultado final exacto y directo de la tarea solicitada, sin introducciones, sin despedidas y sin contexto adicional.
   - Restringir salidas extensas de comandos en terminal (`git log -n 5`, `git diff --stat`, paginación con `head`/`tail`).
   - Tras crear/modificar artefactos, presentar solo el enlace sin duplicar el texto en chat.
5. **Guardado Automático y Recuperación de Contexto**:
   - Al cambiar de modelo dentro del mismo chat, reanudar inmediatamente respetando decisiones previas.
   - En cierres de hito o pausas, utilizar `/context-save` (o modo continuo) y mantener actualizado un archivo `.agents/CONTEXT_CHECKPOINT.md` para facilitar la reanudación con `/context-restore` en nuevas sesiones.
