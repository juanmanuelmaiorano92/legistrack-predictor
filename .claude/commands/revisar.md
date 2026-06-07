---
description: Revisa que lo implementado cumpla la spec y la Constitución (checklist de calidad ML)
---

El usuario terminó de implementar y quiere validar. NO escribas código nuevo en este paso:
revisás y reportás.

Pasos:

1. Leé `spec.md`, `plan.md`, `tasks.md` de la feature (`$ARGUMENTS` indica cuál; si no, la
   última) y el código implementado. Leé `CONSTITUCION.md`.

2. **Consistencia spec ↔ código**: ¿el código hace lo que dice la spec? ¿Se cumplen todos los
   criterios de aceptación? Marcá cada uno como cumplido o no.

3. **Checklist de calidad de ciencia de datos** — revisá uno por uno y reportá ✅ / ⚠️ / ❌:
   - [ ] ¿Hay validación temporal (no split aleatorio) donde corresponde?
   - [ ] ¿Cero fuga de información? (las features de historial usan solo el pasado)
   - [ ] ¿La métrica es F1-macro + matriz de confusión? (no solo accuracy)
   - [ ] ¿`random_state` fijo en todo lo que tiene azar?
   - [ ] ¿Los datos crudos quedaron intactos? ¿La salida tiene nombre propio?
   - [ ] ¿El código es entendible y está explicado para el equipo?
   - [ ] ¿Se registró lo relevante en memoria/DECISIONES.md?

4. **Casos borde**: listá situaciones que podrían fallar (datos vacíos, diputado sin
   historial, título nunca visto, empates) y si el código las maneja.

5. Entregá un reporte ordenado: qué está bien, qué falta, qué corregir. Si todo pasa, dale el
   "sign-off" (visto bueno). Si no, listá las correcciones concretas para volver a
   `/implementar`.
