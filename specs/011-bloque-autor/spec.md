# Spec 011 — Features de autoría: `bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`

## Objetivo

Agregar al dataset de modelado cuatro características nuevas sobre la autoría de cada
proyecto: **a qué bloque pertenece la autoría** (`bloque_autor`), **si el proyecto lo envió
directamente el Poder Ejecutivo** (`es_poder_ejecutivo`), **si la autoría es del oficialismo
del momento** (`es_oficialista`) y **si el diputado que vota es del mismo bloque que el
autor** (`coincide_bloque_autor`). La hipótesis política es directa: un diputado no vota
igual un proyecto de su propio espacio que uno del espacio rival, y un proyecto del
Ejecutivo moviliza la disciplina oficialismo/oposición más que cualquier otro.

## Problema que resuelve

Hoy el modelo conoce el texto del proyecto (embeddings, tema) y el historial del diputado
que vota, pero no sabe **de quién viene** el proyecto. La spec 006 ya recuperó el *nombre*
del autor para 312 de los 1022 títulos (match determinístico + fuzzy), pero un nombre suelto
no le sirve al modelo: hay que traducirlo a su pertenencia política. Además, la app final va
a pedir "¿quién sería el autor de esta ley hipotética?" — para eso hace falta una tabla
reutilizable que traduzca cualquier autor a su bloque.

## Qué construir (en lenguaje funcional)

**Entrada**: los 312 títulos que ya tienen `autor_final` en `df_modelado.csv` (fuente
determinístico o fuzzy). Los 710 títulos sin autor quedan afuera por ahora (se van a ir
completando a mano en `titulos_autor.xlsx`; el proceso debe poder re-ejecutarse cuando eso
avance y absorber los autores nuevos sin cambiar código).

**Salida**: cuatro columnas nuevas por cada fila diputado-proyecto, y tablas de consulta
reutilizables.

1. **`bloque_autor`**: el bloque político al que pertenecía la autoría del proyecto
   *en el momento de la votación*. Se obtiene así, en orden:
   - **Si el proyecto lo envió el Poder Ejecutivo** (ver punto 2): `bloque_autor` = el
     bloque/coalición **oficialista de ese momento** (ej.: un proyecto firmado por Macri
     en 2017 → PRO/Cambiemos; uno de Milei en 2024 → La Libertad Avanza). Esto sale de una
     tabla manual chica de períodos presidenciales → coalición gobernante.
   - **Si el autor fue diputado**: su bloque según el historial completo de votaciones de
     la Cámara (que cubre a los 2.057 diputados de la historia, no solo los 257 actuales),
     tomando el bloque vigente en la fecha más cercana **anterior o igual** a la votación.
   - **Si no se resuelve automático** (senadores, comisiones, funcionarios, variantes de
     nombre — hoy son 21 autores / 38 títulos): se completa en una **tabla manual
     autor → bloque** que esta feature deja creada con los pendientes listados.

2. **`es_poder_ejecutivo`**: 1 si el proyecto fue enviado **directamente por el Poder
   Ejecutivo** en ejercicio a la fecha de la votación — ya sea firmado por el presidente,
   por la Jefatura de Gabinete o por algún ministerio. 0 si el autor es un legislador o
   cualquier otro origen. Es una señal distinta y complementaria a `bloque_autor`: dos
   proyectos pueden ser "del oficialismo" pero uno venir de un diputado y otro del
   Ejecutivo, y eso pesa diferente.

3. **`es_oficialista`**: 1 si la autoría del proyecto pertenece al oficialismo del momento
   de la votación; 0 si no. Se cumple en dos casos: el proyecto lo envió el Ejecutivo
   (todo `es_poder_ejecutivo = 1` implica `es_oficialista = 1`), o el autor es un
   legislador cuyo bloque integraba la coalición gobernante en esa fecha (ej.: un proyecto
   de un diputado del PRO durante el gobierno de Macri → `es_oficialista = 1`,
   `es_poder_ejecutivo = 0`). Requiere que la tabla de períodos presidenciales liste
   también **qué bloques integraban cada coalición oficialista** en cada período.

4. **`coincide_bloque_autor`**: 1 si el bloque del diputado que está votando (columna
   `bloque` de esa fila, el bloque que tenía en esa fecha) coincide con `bloque_autor`;
   0 si no. Captura de forma directa la hipótesis "votás distinto un proyecto de tu propio
   bloque". Para las filas sin autor conocido, lleva el mismo tratamiento de "sin dato"
   que las demás.

5. **Tablas de consulta reutilizables** (pensadas para que la app, en una spec futura,
   pueda traducir el autor hipotético que elija el usuario):
   - autor → bloque (con la fuente de cada asignación: histórico / manual / ejecutivo)
   - período presidencial → coalición oficialista **y bloques que la integran** (para
     detectar si un autor elegido en la app es "el Ejecutivo del momento", pertenece al
     bloque oficialista, o es opositor)

Las filas cuyo título todavía no tiene autor conocido llevan un valor explícito de "sin
dato" en ambas columnas (no un vacío silencioso), para que el modelo pueda tratarlo como
categoría propia y para que sea medible cuánta cobertura falta.

## Datos involucrados

- `data/df_modelado.csv`: columnas `titulo_base`, `autor_final`, `fuente_autor`,
  `fecha_votacion` (la base sobre la que se agregan las columnas nuevas).
- `data/hcdn_votaciones_historico.csv`: columnas `DIPUTADO`, `BLOQUE`, `fecha_votacion`
  (fuente del bloque histórico de cualquier autor que haya sido diputado).
- `data/titulos_autor.xlsx`: fuente futura de autores completados a mano (el proceso debe
  poder absorberlos al re-ejecutarse).
- Tabla manual nueva: períodos presidenciales → coalición oficialista, con los firmantes
  del Ejecutivo (presidente, jefes de gabinete, ministerios) y los bloques que integraban
  cada coalición.
- Tabla manual nueva: autores no resueltos → bloque (la crea esta feature, la completa el
  equipo).

## Criterios de aceptación

- [x] Existe un dataset nuevo (no se sobrescribe `df_modelado.csv`) con las columnas
      `bloque_autor`, `es_poder_ejecutivo`, `es_oficialista` y `coincide_bloque_autor`
      para todas las filas.
      **Evidencia**: `data/df_modelado_autor.csv` — 28.738 filas × 19 columnas (las 12
      originales de `df_modelado` intactas + 7 nuevas: `bloque_autor`,
      `fuente_bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`,
      `coincide_bloque_autor`, y las del escenario B). `df_modelado.csv` solo se lee, no
      se toca (T10.1, assert de columnas originales preservadas).
- [x] Los 312 títulos con autor conocido tienen `bloque_autor` asignado (automático,
      ejecutivo o pendiente en la tabla manual); ninguno queda vacío silencioso.
      **Evidencia**: T9(d) — assert automático: los 312 títulos con `autor_final` tienen
      `bloque_autor` y `fuente_bloque_autor` no nulos, y la fuente es siempre una de
      `{manual, ejecutivo, historico, pendiente}` (nunca `sin_dato`). Estado actual tras
      el completado manual del equipo: 35 manual + 90 ejecutivo + 183 histórico + 4
      pendiente = 312.
- [x] Los proyectos enviados por el Ejecutivo **en ejercicio a la fecha de la votación**
      (presidente, Jefatura de Gabinete o un ministerio) tienen `es_poder_ejecutivo = 1`
      y `bloque_autor` = coalición oficialista de ese momento. Un ex-presidente firmando
      como legislador NO cuenta como Ejecutivo.
      **Evidencia**: T6, 4 tests de control — CFK: 48/48 títulos → Ejecutivo; Macri votado
      en 2026 bajo Milei (coalición distinta) → NO Ejecutivo; A. Fernández votado en 2013
      bajo CFK (misma coalición FPV que su período como JGM) → SÍ Ejecutivo; Massa votado
      en 2016 bajo Macri (coalición distinta a la de su período como JGM) → NO Ejecutivo.
- [x] Consistencia entre features: **toda fila con `es_poder_ejecutivo = 1` tiene
      `es_oficialista = 1`** (verificado con un chequeo automático), y existen filas con
      `es_oficialista = 1` y `es_poder_ejecutivo = 0` (legisladores oficialistas).
      **Evidencia**: T9(a)-(b) — assert automático: los 99 títulos con
      `es_poder_ejecutivo=1` tienen `es_oficialista=1` (en ambos escenarios A y B); 120
      títulos son de legisladores oficialistas (`es_oficialista=1`, `es_poder_ejecutivo=0`).
- [x] `coincide_bloque_autor` = 1 exactamente cuando el bloque del diputado votante
      coincide con `bloque_autor` según el criterio de comparación que defina el plan
      (verificable con ejemplos concretos de ambos casos).
      **Evidencia**: T9(e) — asserts sobre casos reales: título Ejecutivo de CFK (votante
      del bloque "Frente para la Victoria - PJ" → coincide=1; votante de la UCR →
      coincide=0); título legislador de Ajmechet, Sabrina (bloque Pro) (votante del Pro →
      coincide=1; votante de otro bloque → coincide=0).
- [x] El bloque asignado a un autor-diputado nunca usa información posterior a la fecha de
      la votación (sin fuga de información).
      **Evidencia**: T9(c) — se rehizo el `merge_asof` de T7 con la fecha del registro
      histórico en una columna separada (el merge original perdía esa fecha al compartir
      nombre de columna con la fecha de la votación) y se verificó con assert que las 183
      asignaciones por histórico tienen `fecha_registro_historico <= fecha_votacion`.
- [x] Queda generada la tabla de autores no resueltos para completado manual, y el proceso
      re-ejecutado la absorbe sin cambios de código.
      **Evidencia**: `data/autores_pendientes.csv` generado en T10.3; `tabla_autor_bloque_manual.csv`
      pre-cargada en T10.4 con los 30 autores pendientes de la primera corrida. El equipo
      completó 28 de esos 30 a mano (2 quedaron sin resolver: "Asuntos Constitucionales",
      colectivo sin bloque real, y "Peña, Marcos", homónimo del JGM de Macri en títulos de
      1995-1997). Al re-ejecutar el notebook **sin cambiar una línea de código**, esos 28
      pasaron de `pendiente` a `manual` (35 títulos resueltos, ya que algunos autores
      escribieron más de un título), demostrando el mecanismo end-to-end.
- [x] Las tablas autor → bloque y período presidencial → coalición quedan guardadas como
      archivos reutilizables por la app en una spec futura.
      **Evidencia**: `data/tabla_autor_bloque.csv` (162 autores únicos, con fuente de cada
      asignación) y `data/tabla_periodos_presidenciales.csv` (9 períodos, con
      `bloques_integrantes` validado por el equipo). **Nota de diseño registrada en
      `memoria/DECISIONES.md` (2026-07-18)**: `tabla_autor_bloque.csv` NO debe usarse tal
      cual para el selector de autor hipotético de la app — esa spec futura debe construir
      su propia lista a partir de la nómina de diputados actuales (bloque vigente) más una
      opción "Poder Ejecutivo Nacional" (hoy La Libertad Avanza).
- [x] Re-ejecutar el proceso con los mismos datos da exactamente el mismo resultado
      (reproducible, sin azar).
      **Evidencia**: T11 — las 3 salidas (`df_modelado_autor.csv`, `tabla_autor_bloque.csv`,
      `autores_pendientes.csv`) son **idénticas byte a byte** entre dos corridas
      consecutivas sobre los mismos insumos (`diff -q` sin diferencias).
- [x] Cumple la CONSTITUCION (sin leakage, datos crudos intactos, explicable por el equipo).
      **Evidencia**: Constitution Check del plan (8/8 principios) + verificación empírica
      de P3 en T9(c); `df_modelado.csv` y `hcdn_votaciones_historico.csv` solo se leen en
      todo el notebook; cada paso de la cascada está documentado en celdas markdown propias
      para que el equipo pueda explicarlo en la defensa del TP.

## Fuera de alcance

- **Reentrenar el modelo** con las features nuevas y medir si mejora el F1-macro de 0.453
  (será la spec siguiente). Incluye resolver empíricamente la duda "¿el PRO integra el
  oficialismo de Milei?": el dataset lleva las columnas del escenario B
  (`es_oficialista_b`, `coincide_bloque_autor_b`, con PRO dentro) para entrenar con ambos
  escenarios, comparar F1-macro y registrar el ganador como definición oficial.
- **Integrar el autor en la app y la API** (selector de autor hipotético, detección de
  oficialismo en tiempo de predicción) — spec futura; esta spec solo deja las tablas listas.
- Completar a mano los 710 títulos que aún no tienen autor (trabajo en curso del equipo,
  fuera de este ciclo).
- Mejorar la cobertura del match de autores de la spec 006 (determinístico/fuzzy).
- Resolver la discrepancia 259 vs 257 diputados (deuda conocida, independiente de esto).

## Riesgos conocidos

- **Cobertura baja por ahora**: solo 312/1022 títulos (~31%) tienen autor. La categoría
  "sin dato" va a ser mayoritaria hasta que avance el completado manual — al reentrenar
  (spec futura) habrá que evaluar si con esta cobertura la feature ya aporta señal.
- **Fuga de información sutil**: si un autor aparece en el histórico solo DESPUÉS de la
  fecha de la votación (ej.: fue diputado más tarde), usar ese bloque sería mirar el futuro.
  El plan debe definir explícitamente qué se hace en ese caso (y es esperable que pase con
  presidentes que fueron diputados antes o después de gobernar).
- **Cambios de bloque**: 98 diputados cambiaron de bloque en el tiempo; por eso el bloque
  se toma a la fecha de la votación y no "el último conocido" (mismo criterio que el bug
  corregido en `/diputados/{id}` el 2026-07-17, pero en la dirección temporal correcta).
- **Nombres con formato distinto entre fuentes** (ej.: "LOSPENNATO, SILVIA GABRIELA" vs
  el formato del histórico): el match debe normalizar como ya se hace en el proyecto
  (mayúsculas, sin tildes, espacios colapsados); lo que igual no matchee cae a la tabla
  manual, nunca a un match difuso silencioso.
- **Autores colectivos** (comisiones como "Parlamentaria Mixta Revisora de Cuentas"): no
  tienen bloque real; el equipo decidirá en la tabla manual si llevan una categoría propia.
- **Coalición vs. bloque — nombres a distinta escala**: `bloque_autor` puede ser un nombre
  de coalición (ej. "Cambiemos" para un proyecto del Ejecutivo de Macri) mientras que el
  diputado votante tiene un nombre de bloque (ej. "PRO"). Esto afecta a
  `coincide_bloque_autor` (¿un diputado del PRO "coincide" con un proyecto de Cambiemos?)
  y a `es_oficialista` (hay que saber qué bloques integran cada coalición). El plan debe
  fijar un criterio de comparación único y explicable; la tabla de períodos presidenciales
  con sus bloques integrantes es la pieza que lo resuelve.
- **Detección de proyectos del Ejecutivo**: en los datos actuales el "autor" de un proyecto
  del Ejecutivo suele venir como el nombre del presidente firmante; los que vengan como
  Jefatura de Gabinete o ministerios probablemente estén entre los autores no resueltos.
  La detección no puede ser solo "el autor es un presidente": debe cruzar el nombre con el
  período en ejercicio y contemplar los firmantes institucionales en la tabla manual.
