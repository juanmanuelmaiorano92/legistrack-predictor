# Guía de uso — Framework LegisTrack en Claude Code

Esta guía explica cómo usar Claude Code para construir LegisTrack de forma ordenada, sin
necesidad de ser desarrollador. Está pensada para el equipo de Ciencia Política.

---

## 1. Qué es esto (en criollo)

Tomamos un framework profesional de desarrollo con IA (el Framework de Taligent) y lo
**simplificamos y adaptamos** a un proyecto de ciencia de datos. La idea de fondo:

> Claude Code no es un autocompletador. Es un miembro del equipo que sigue un proceso,
> documenta lo que hace y recuerda lo que aprendió.

El framework resuelve tres problemas típicos de trabajar con IA:

| Problema | Cómo lo resuelve este framework |
|---|---|
| La IA programa sin entender qué se necesita | **Especificar antes de codear**: sin spec, no hay código |
| Cada sesión arranca de cero, se pierde el contexto | **`memoria/DECISIONES.md`**: la memoria del proyecto en un archivo |
| La IA hace lo que quiere, sin reglas | **`CLAUDE.md` + `CONSTITUCION.md`**: el contrato que Claude respeta siempre |

**Importante**: esta versión **no requiere instalar nada**. No usa Engram ni spec-kit. Todo
son archivos `.md` dentro del repositorio. Si Claude Code ya te funciona, esto funciona.

---

## 2. Qué hay en la caja (los archivos)

```
legistrack/
├── CLAUDE.md                  → el contrato. Claude lo lee solo al abrir el proyecto.
├── CONSTITUCION.md            → las reglas no negociables (validación temporal, no leakage…)
├── GUIA_USO_CLAUDE_CODE.md    → esta guía
├── memoria/
│   └── DECISIONES.md          → la memoria: decisiones y bugs con su porqué
├── specs/                     → acá se van guardando las especificaciones de cada feature
└── .claude/
    └── commands/              → los comandos /especificar, /planificar, etc.
```

---

## 3. Instalación (5 minutos, una sola vez)

1. Copiá estos archivos y carpetas en la **raíz** de tu repositorio de LegisTrack (donde
   están tus notebooks). Si ya tenés un `CLAUDE.md`, fusionalos.
2. Abrí el proyecto con Claude Code (`claude` desde la terminal, parado en la carpeta del
   proyecto).
3. Verificá que los comandos estén disponibles: escribí `/` y deberían aparecer
   `especificar`, `planificar`, `tareas`, `implementar`, `revisar`, `recordar`.
4. Listo. Claude lee `CLAUDE.md` y `CONSTITUCION.md` automáticamente al arrancar.

> Los archivos `.md` dentro de `.claude/commands/` se convierten en comandos `/` de forma
> nativa en Claude Code. No hay que instalar nada más.

---

## 4. El ciclo de trabajo (el corazón del framework)

Toda feature sigue **cinco pasos**. La regla de oro: **sin spec aprobada, no se programa.**

```
1. /especificar   → QUÉ querés y por qué        (specs/NNN/spec.md)
2. /planificar    → CÓMO se hace + chequeo de reglas (specs/NNN/plan.md)
3. /tareas        → la lista de pasos chicos     (specs/NNN/tasks.md)
4. /implementar   → Claude programa paso a paso
5. /revisar       → chequeo de calidad final
```

Entre cada paso, Claude te muestra lo que generó y **espera tu OK**. Vos revisás y aprobás.
Así mantenés el control y entendés cada decisión (que es justo lo que se evalúa en el TP).

### Por qué este orden importa en ciencia de datos

El error más caro en ML no es un bug de código: es entrenar un modelo que parece buenísimo y
en realidad hace trampa (mira el futuro, o mide mal). Especificar y planificar antes te obliga
a pensar la validación temporal y la fuga de información **antes** de tener resultados lindos
pero falsos.

---

## 5. Los comandos, uno por uno

### `/especificar`
Arranca una feature nueva. Le contás qué querés en lenguaje normal y Claude te hace hasta 3
preguntas para sacar ambigüedades, después escribe `spec.md` (objetivo, qué construir, datos,
criterios de aceptación, fuera de alcance).

> Ejemplo: `/especificar quiero una feature que indique si el diputado pertenece al
> oficialismo en cada votación`

### `/planificar`
Con la spec aprobada, escribe el `plan.md`: cómo se hace, qué librerías, y —clave— cómo se
evita la fuga de información. Antes de entregarlo, corre el **Constitution Check**: verifica
que el plan no viole ninguna regla. Si la viola, te avisa y lo corrige.

### `/tareas`
Convierte el plan en una lista de pasos chicos y ordenados (`tasks.md`), cada uno verificable.

### `/implementar`
Claude ejecuta las tareas **una por una**, explicando qué hace, mostrando el código y
marcando cada tarea como hecha. Para y espera tu OK entre tareas.

### `/revisar`
No programa: revisa. Chequea que el código cumpla la spec y pasa un checklist de calidad de
ciencia de datos (¿validación temporal? ¿leakage? ¿F1-macro? ¿reproducible?). Te da el visto
bueno o la lista de correcciones.

### `/recordar`
Guarda algo en la memoria (`DECISIONES.md`): una decisión, un bug resuelto con su causa, o una
convención.

> Ejemplo: `/recordar decidimos usar LightGBM como modelo principal porque fue el de mejor
> F1-macro en la validación temporal`

---

## 6. La memoria: `memoria/DECISIONES.md`

Es el archivo más importante para no perder contexto entre sesiones.

- **Al empezar a trabajar**, pedile a Claude: *"leé la memoria del proyecto y decime dónde
  quedamos"*. Va a leer `DECISIONES.md` y te resume.
- **Cuando tomes una decisión importante**, usá `/recordar` o simplemente decí *"esto guardalo
  en la memoria"*.
- **Al terminar la sesión**, pedile: *"agregá un resumen de la sesión a la memoria"*.

Ya viene con las decisiones que tomaste hasta ahora cargadas (el filtrado de diputados, el fix
del agrupamiento por artículo, la regla de empate → abstención, etc.).

---

## 7. Ejemplo completo de punta a punta

Querés agregar la feature `historial_afinidad` (tasa de voto afirmativo histórico del
diputado). Así sería la conversación con Claude Code:

```
Vos:    /especificar quiero una feature que para cada voto calcule la tasa de votos
        afirmativos previos de ese diputado

Claude: [te hace 2-3 preguntas: ¿tasa global o por bloque? ¿qué hacer cuando el diputado
        no tiene historial previo?] → escribe specs/001-historial-afinidad/spec.md

Vos:    [revisás, corregís algo] está bien, aprobado

Vos:    /planificar

Claude: escribe plan.md. En la sección anti-leakage explica que la tasa se calcula de forma
        acumulativa hacia atrás (solo votos con fecha anterior a la del voto actual).
        Corre el Constitution Check → ✅ pasa el principio de cero leakage.

Vos:    aprobado

Vos:    /tareas

Claude: escribe tasks.md con 4-5 pasos chicos.

Vos:    aprobado, /implementar

Claude: hace la tarea 1 (ordenar por fecha), te muestra el código, lo marca. Espera tu OK.
        Hace la tarea 2 (cálculo acumulativo sin leakage)... y así.

Vos:    /revisar

Claude: chequea contra la spec y el checklist. Confirma que no hay leakage y que es
        reproducible. Da el visto bueno y guarda la decisión en DECISIONES.md.
```

Resultado: una feature bien hecha, documentada, que el equipo entiende y puede defender.

---

## 8. Reglas de oro para este proyecto (no negociables)

Estas viven en `CONSTITUCION.md` y Claude las respeta siempre. Te las dejo en criollo:

1. **El modelo se entrena con el pasado y se prueba con el futuro.** Nunca partir los datos al
   azar: tienen fecha.
2. **Ninguna feature puede mirar el futuro.** Las que resumen historial (tasas, conteos) se
   calculan solo con votos anteriores. Esto se llama evitar *data leakage* y es el error más
   peligroso.
3. **Medimos con F1-macro, no con accuracy.** Hay muchos más votos AFIRMATIVO que el resto;
   accuracy engaña.
4. **Todo reproducible.** Semilla fija, dependencias congeladas.
5. **Primero simple, después sofisticado.** Un modelo base que se entienda antes que uno
   complejo que nadie pueda explicar.
6. **Si el equipo no lo puede explicar, no está terminado.**

---

## 9. Qué hacer y qué no

**Hacé:**
- Empezá siempre por `/especificar`, aunque la feature parezca chica.
- Aprobá paso a paso; leé lo que Claude genera.
- Guardá decisiones en la memoria apenas las tomás.
- Pedile a Claude que te explique cualquier cosa que no entiendas.

**No hagas:**
- Pedirle "programá todo el modelo" de una. Dividí en features.
- Saltar el plan e ir directo a implementar.
- Aceptar código que no entendés sin pedir explicación.
- Confiar en una métrica de accuracy alta sin mirar la matriz de confusión.

---

## 10. Si algo no anda

| Síntoma | Solución |
|---|---|
| Los comandos `/especificar` etc. no aparecen | Verificá que la carpeta `.claude/commands/` esté en la raíz del proyecto y reiniciá Claude Code |
| Claude no recuerda lo de la sesión pasada | Pedile *"leé memoria/DECISIONES.md"*; asegurate de haber guardado un resumen al cerrar |
| Claude se saltea pasos del ciclo | Recordale: *"seguí el ciclo del CLAUDE.md, no avances sin mi OK"* |
| El plan parece hacer trampa con los datos | Pedile que corra el Constitution Check de nuevo y revise leakage y validación temporal |
| Claude usa términos que no entendés | Pedile: *"explicámelo como si no supiera programar"* |

---

## 11. Para la entrega del TP

Este framework te deja, casi sin esfuerzo extra, lo que un trabajo académico valora:

- **Trazabilidad**: cada parte del código sale de una spec → un plan → tareas. Se puede contar
  el camino completo.
- **Justificación metodológica**: la `CONSTITUCION.md` y `DECISIONES.md` documentan por qué
  hicieron cada cosa (validación temporal, métrica, manejo de leakage).
- **Reproducibilidad**: cualquiera puede correr el proyecto y obtener lo mismo.
- **Capacidad de defensa**: como aprobaron cada paso y Claude explicó todo, pueden defender
  cualquier decisión en la presentación.
