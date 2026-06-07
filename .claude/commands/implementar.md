---
description: Ejecuta las tareas del tasks.md una por una, con validación y registro
---

El usuario quiere implementar la feature. Ejecutás el `tasks.md` **tarea por tarea**, no
todo de una.

Pasos:

1. Leé `spec.md`, `plan.md` y `tasks.md` de la feature (`$ARGUMENTS` indica cuál; si no, la
   última). Leé `CONSTITUCION.md` y `memoria/DECISIONES.md`.

2. Tomá la **primera tarea sin marcar** (`- [ ]`). Para esa tarea:
   a. Explicá en 1-2 oraciones qué vas a hacer y por qué (lenguaje claro para el equipo).
   b. Escribí el código. Respetá las reglas de oro de ciencia de datos del CLAUDE.md:
      validación temporal, cero leakage, F1-macro, `random_state` fijo, datos crudos intocables.
   c. Si podés, corré/verificá el código.
   d. Mostrá el resultado y marcá la tarea como hecha (`- [x]`) en `tasks.md`.

3. **Pará y esperá** la confirmación del usuario antes de pasar a la siguiente tarea. No
   encadenes todas las tareas sin checkpoint.

4. Si aparece un bug, no parchees a ciegas: explicá la causa probable, proponé alternativas y
   recién ahí corregí. Cuando se resuelva, anotá la **causa raíz** en `memoria/DECISIONES.md`.

5. Cuando todas las tareas estén marcadas, recordale al usuario correr `/revisar`.

6. Mantené actualizado `memoria/DECISIONES.md` con cada decisión relevante tomada en el camino.
