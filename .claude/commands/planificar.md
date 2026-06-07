---
description: Crea el plan técnico (plan.md) a partir de una spec aprobada, con Constitution Check
---

El usuario tiene una `spec.md` aprobada y quiere el plan técnico. Tu tarea es producir un
`plan.md` que explique CÓMO se construye, y que **pase el Constitution Check**.

Pasos:

1. Leé la `spec.md` de la feature (`$ARGUMENTS` indica cuál; si no, preguntá o usá la última).
   Leé también `CONSTITUCION.md`.

2. Escribí `specs/NNN-nombre/plan.md` con esta estructura:

```markdown
# Plan NNN — [Nombre de la feature]

## Enfoque técnico
[Cómo se va a resolver, en pasos conceptuales. Explicado para que un politólogo lo entienda.]

## Librerías y herramientas
[Qué se usa y por qué. No agregar nada que no esté justificado.]

## Diseño anti-leakage / validación
[CRÍTICO. Explicar exactamente cómo se evita la fuga de información y, si aplica, cómo se
hace la validación temporal. Si la feature no toca esto, decirlo explícitamente.]

## Pasos de implementación
1. [Paso 1]
2. [Paso 2]
...

## Reproducibilidad
[Semillas, dónde se guarda la salida, qué entrada lee]

## Riesgos y cómo se mitigan
[Lista de riesgos técnicos y la mitigación de cada uno]
```

3. **Constitution Check** — antes de mostrar el plan, verificá uno por uno los principios de
   `CONSTITUCION.md`. Para cada principio relevante, confirmá que el plan lo cumple. Si alguno
   se viola (ej: el plan usa split aleatorio, o una feature de historial calculada sobre todo
   el dataset), **NO entregues el plan**: explicá qué principio se viola y proponé la corrección.
   Recién con el plan corregido seguí.

4. Mostrale el `plan.md` al usuario con el resultado del Constitution Check visible. Esperá
   aprobación antes de `/tareas`.

5. Registrá la decisión técnica principal en `memoria/DECISIONES.md`.
