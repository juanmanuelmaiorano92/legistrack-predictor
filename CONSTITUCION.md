# CONSTITUCIÓN — LegisTrack

Los principios no negociables del proyecto. Claude Code debe verificar que **todo plan
técnico los cumpla** antes de aprobarlo (*Constitution Check*). Si un plan viola un
principio, se frena y se corrige el plan, no se avanza.

> Esta constitución se escribe **una sola vez** al inicio y se actualiza solo con acuerdo
> explícito del equipo. Para cambiarla, dejá registro en `memoria/DECISIONES.md`.

---

## Principio 1 — Sin especificación, no hay código

Toda feature nace como un `spec.md` aprobado antes de escribir una línea de código.
Si el usuario pide "programá X" sin spec, primero se especifica.

**Por qué**: evita el "vibe coding" — que la IA invente o asuma cosas. En ciencia de datos,
una asunción equivocada (qué predecir, con qué datos) invalida todo el trabajo posterior.

---

## Principio 2 — Validación temporal obligatoria

Los datos tienen fecha de votación. El modelo se entrena con el pasado y se evalúa con el
futuro. **Prohibido** usar `train_test_split` aleatorio o validación cruzada que mezcle
fechas. Se usa partición temporal (ej: entrenar hasta el año N, evaluar desde N+1) o
`TimeSeriesSplit`.

**Por qué**: predecir el pasado con información del futuro infla las métricas y produce un
modelo que parece bueno pero falla en la realidad.

---

## Principio 3 — Cero fuga de información (data leakage)

Cada feature solo puede usar datos disponibles **antes** del momento de la votación que se
predice. Las features que resumen historial (tasas, promedios, conteos por diputado o
bloque) se calculan **solo con registros anteriores** a la fecha de cada voto.

**Por qué**: es el error más común y más difícil de ver. Un modelo con leakage tiene
métricas excelentes en la prueba y es inútil en producción.

**Caso concreto en este proyecto**: `historial_afinidad` (tasa de voto afirmativo del
diputado) debe calcularse de forma acumulativa hacia atrás, nunca sobre el dataset entero.

---

## Principio 4 — Métrica honesta ante desbalance

La métrica principal es **F1-macro**. Está prohibido reportar `accuracy` como métrica única.
Siempre acompañar con la matriz de confusión.

**Por qué**: las clases están desbalanceadas (AFIRMATIVO ≈ 59%, NEGATIVO ≈ 14%,
ABSTENCIÓN ≈ 3%). Un modelo que predice siempre la clase mayoritaria tendría accuracy alto y
cero valor. F1-macro pesa las tres clases por igual.

---

## Principio 5 — Reproducibilidad total

- Toda fuente de azar lleva `random_state` fijo.
- Las dependencias se congelan en `requirements.txt`.
- Cada etapa lee una entrada y escribe una salida con nombre propio; los datos crudos no se
  sobrescriben.

**Por qué**: el trabajo tiene que poder repetirse y defenderse. Si los resultados cambian
en cada corrida, no son confiables.

---

## Principio 6 — Trazabilidad y memoria

Cada decisión metodológica relevante queda registrada en `memoria/DECISIONES.md` con su
**porqué**. Cada bug corregido anota su **causa raíz**.

**Por qué**: el conocimiento no puede vivir solo en la cabeza de una persona ni perderse
entre sesiones. Un integrante nuevo (o la próxima sesión) tiene que poder reconstruir el camino.

---

## Principio 7 — Simple antes que sofisticado

Primero un modelo base simple que funcione y se entienda (ej: una regresión logística o un
Random Forest con pocas features), después se sofistica. No se agregan librerías, modelos ni
features sin una razón explícita anotada.

**Por qué**: un baseline simple da un punto de comparación honesto y evita complejidad que
nadie del equipo puede explicar en la defensa del TP.

---

## Principio 8 — El equipo entiende lo que entrega

Ninguna parte del proyecto puede quedar como "caja negra que anda". Si el equipo no puede
explicar qué hace una feature o por qué el modelo predice algo, no está terminada. Claude
explica en lenguaje claro antes de dar por cerrada una tarea.

**Por qué**: es un trabajo académico de Ciencia Política. La capacidad de explicar y
justificar vale tanto como que el código corra.
