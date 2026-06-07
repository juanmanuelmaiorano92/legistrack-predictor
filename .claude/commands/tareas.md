---
description: Convierte el plan aprobado en una lista de tareas ordenada (tasks.md)
---

El usuario tiene un `plan.md` aprobado y quiere la lista de tareas. Tu tarea es producir un
`tasks.md` con pasos chicos, concretos y ordenados por dependencias.

Pasos:

1. Leé la `spec.md` y el `plan.md` de la feature (`$ARGUMENTS` indica cuál; si no, la última).

2. Escribí `specs/NNN-nombre/tasks.md` con esta estructura:

```markdown
# Tareas NNN — [Nombre de la feature]

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

- [ ] T1 — [Descripción concreta y acotada]
- [ ] T2 — [Descripción] (depende de: T1)
- [ ] T3 — [Descripción] (depende de: T2)
- [ ] T4 — Validar contra criterios de aceptación de la spec
- [ ] T5 — Registrar resultado y decisiones en memoria/DECISIONES.md
```

Reglas para las tareas:
- Cada tarea debe poder completarse y verificarse por separado.
- Ordenadas por dependencia: nada depende de algo que viene después.
- Incluí siempre una tarea final de validación contra los criterios de aceptación.
- Si una tarea es grande, partila en dos.
- Tareas en español, concretas (evitá "mejorar el modelo"; preferí "entrenar Random Forest
  con validación temporal y reportar F1-macro").

3. Mostrale el `tasks.md` al usuario. Esperá aprobación antes de `/implementar`.
