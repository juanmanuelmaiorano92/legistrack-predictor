---
description: Crea la especificación (spec.md) de una feature antes de escribir código
---

El usuario quiere especificar una nueva feature de LegisTrack. Tu tarea es producir un
`spec.md` claro, en lenguaje funcional (sin tecnicismos), que responda QUÉ se quiere y POR QUÉ
— todavía NO el cómo.

Pasos:

1. Leé `CONSTITUCION.md` y `memoria/DECISIONES.md` si no lo hiciste en esta sesión.

2. A partir de lo que pidió el usuario (`$ARGUMENTS`), si hay ambigüedad hacé **hasta 3
   preguntas** concretas antes de escribir nada. No asumas. Ejemplos de ambigüedad típica en
   este proyecto: qué exactamente predecir, con qué datos, para qué subconjunto de diputados.

3. Determiná el número de carpeta: mirá `specs/` y usá el siguiente correlativo
   (`001-`, `002-`, ...). Slug corto en minúsculas con guiones.

4. Escribí `specs/NNN-nombre/spec.md` con esta estructura:

```markdown
# Spec NNN — [Nombre de la feature]

## Objetivo
[1-2 oraciones: qué se quiere lograr y por qué importa para LegisTrack]

## Problema que resuelve
[Qué falta hoy o qué se mejora]

## Qué construir (en lenguaje funcional)
[Descripción sin tecnicismos: qué entra, qué sale, qué hace. Si es una feature de ML,
describir qué información captura y por qué debería ayudar a predecir el voto.]

## Datos involucrados
[Qué columnas de df_consolidado u otras fuentes se usan]

## Criterios de aceptación
- [ ] [Condición verificable 1]
- [ ] [Condición verificable 2]
- [ ] Cumple la CONSTITUCION (sin leakage, validación temporal si aplica, reproducible)

## Fuera de alcance
[Qué NO se hace en esta feature, para no dispersarse]

## Riesgos conocidos
[Especialmente: posibles fugas de información, dependencias de datos faltantes]
```

5. Mostrale el `spec.md` al usuario y pedile que lo apruebe o corrija. **No avances** a
   `/planificar` hasta que apruebe.

6. Cuando apruebe, registrá en `memoria/DECISIONES.md` que se creó esta spec.
