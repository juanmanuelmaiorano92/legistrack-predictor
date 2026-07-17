# Plan 011 — Features de autoría: `bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`

## Enfoque técnico

La idea general: para cada voto del dataset, averiguar la pertenencia política de quien
escribió el proyecto, comparando el nombre del autor contra tres fuentes en un orden fijo
(una "cascada"). Todo se implementa en un notebook nuevo, `STG_5.2_features_autor.ipynb`,
que lee `df_modelado.csv` y escribe un dataset nuevo con las 4 columnas.

### Las dos tablas manuales (se crean primero, viven en `data/` y se commitean)

1. **`tabla_periodos_presidenciales.csv`** — una fila por período de gobierno, desde Menem
   hasta Milei (las votaciones arrancan en 1993). Columnas:
   - `presidente`, `fecha_inicio`, `fecha_fin`
   - `coalicion`: el nombre que tomará `bloque_autor` en proyectos del Ejecutivo
   - `firmantes_ejecutivo`: nombres que firman como Ejecutivo en ese período (el
     presidente, sus jefes de gabinete, ministros que aparezcan como autores), separados
     por `;`
   - `bloques_integrantes`: los bloques de Diputados que integraban la coalición
     oficialista en ese período (tal como aparecen escritos en nuestros datos), separados
     por `;`. El notebook imprime la lista de bloques presentes en cada período para
     facilitar el completado.

2. **`tabla_autor_bloque_manual.csv`** — la tabla de completado manual. Columnas:
   `autor` (normalizado), `bloque_asignado`, `es_poder_ejecutivo` (0/1, para firmantes
   institucionales tipo "Jefatura de Gabinete"), `comentario`. Arranca pre-cargada por el
   notebook con los autores no resueltos (hoy 21) y el equipo la completa. También sirve
   de **corrección manual**: si una asignación automática quedó mal, se agrega el autor
   acá y esta tabla gana.

### La cascada de resolución (por cada título con autor, a la fecha de cada votación)

1. **¿Es un proyecto del Ejecutivo?** El autor figura en `firmantes_ejecutivo` de algún
   período **y la fecha de la votación cae dentro de ese período**. Si sí:
   `bloque_autor` = la `coalicion` del período, `es_poder_ejecutivo` = 1,
   `es_oficialista` = 1. La condición de fecha es clave: un proyecto de Macri votado en
   2026 (fuera de su mandato) NO pasa por acá — cae a los pasos siguientes y queda
   listado para revisión manual (caso real detectado, igual que un "FERNANDEZ, ALBERTO"
   votado en 2013 que probablemente sea un homónimo).
2. **¿Está en la tabla manual?** Se usa lo que diga `tabla_autor_bloque_manual.csv`.
3. **¿Fue diputado?** Se busca su bloque en el histórico completo de la Cámara
   (`hcdn_votaciones_historico.csv`, 2.057 diputados), tomando el bloque del registro más
   reciente con fecha **anterior o igual** a la votación (`merge_asof` hacia atrás). Si el
   autor solo aparece en el histórico DESPUÉS de la votación, **no se usa** (sería mirar
   el futuro) y cae al paso 4.
4. **Pendiente**: `bloque_autor` = `"PENDIENTE_MANUAL"` y el autor se agrega al archivo de
   pendientes para que el equipo lo complete. En la próxima corrida, el paso 2 lo absorbe.

Los títulos que directamente no tienen autor (710 de 1022) llevan `bloque_autor` =
`"SIN_DATO"`.

### Derivación de las otras tres features

- **`es_poder_ejecutivo`**: 1 solo por el paso 1 de la cascada (o si la tabla manual lo
  marca explícitamente, ej. un firmante "Jefatura de Gabinete"). Resto: 0. Sin dato: -1.
- **`es_oficialista`**: 1 si `es_poder_ejecutivo` = 1, o si `bloque_autor` está en los
  `bloques_integrantes` de la coalición gobernante **a la fecha de la votación**. 0 si
  hay autor y no cumple. -1 si no hay dato de autor.
- **`coincide_bloque_autor`**: compara el bloque del diputado votante (columna `bloque`
  de la fila, normalizada) contra `bloque_autor`:
  - autor legislador → coincide si son el **mismo bloque** (igualdad normalizada);
  - autor Ejecutivo (`bloque_autor` es una coalición) → coincide si el bloque del votante
    **integra esa coalición** según `bloques_integrantes`;
  - sin dato de autor → -1.

El valor **-1 para "sin dato"** (en vez de 0) evita confundir "no coincide" con "no
sabemos": son cosas distintas y el modelo (árboles) puede aprender la diferencia.

### Salidas

- **`data/df_modelado_autor.csv`**: `df_modelado.csv` + las 4 columnas nuevas (mismas
  filas, mismo orden). `df_modelado.csv` queda intacto.
- **`data/tabla_autor_bloque.csv`**: la tabla consolidada autor → bloque con la fuente de
  cada asignación (`ejecutivo` / `manual` / `historico` / `pendiente`) — el insumo que la
  app usará en una spec futura para el autor hipotético.
- **`data/autores_pendientes.csv`**: lo que falta completar a mano, con contexto (títulos,
  fechas, motivo por el que no se resolvió).
- Las dos tablas manuales quedan commiteadas y versionadas en el repo.

## Librerías y herramientas

- **pandas** (ya en uso): lectura, `merge_asof` para el lookup temporal, joins.
- **unicodedata** (librería estándar de Python): normalización de nombres, con el mismo
  criterio ya usado en el proyecto (mayúsculas, sin tildes, espacios colapsados), extendido
  con Ñ→N y limpieza de caracteres de encoding roto (aparece "PE�A" en los datos).
- **Nada nuevo que instalar.** No hay modelado, no hay azar, no hay embeddings.

## Diseño anti-leakage / validación

Esta feature no entrena ningún modelo, así que no hay validación temporal de métricas acá
(eso será la spec de reentrenamiento). Pero el anti-leakage sí es central al diseño:

1. **Lookup histórico solo hacia atrás**: el bloque de un autor-diputado se toma del
   registro más reciente **anterior o igual** a la fecha de la votación (`merge_asof`
   con dirección `backward`). Un `assert` automático verifica que ninguna asignación
   automática use un registro posterior a la votación.
2. **Autores "del futuro"**: si el autor solo aparece en el histórico después de la fecha
   de la votación, no se asigna automático — va a pendientes. El equipo, al completarlo a
   mano, usa la pertenencia pública conocida en la época del proyecto (se documenta en la
   columna `comentario`).
3. **Detección del Ejecutivo por fecha de mandato**: los períodos presidenciales son
   información pública conocida en el momento de cada votación — no hay fuga posible ahí.
4. **`es_oficialista` a la fecha de la votación**: se evalúa contra la coalición gobernante
   en esa fecha, no contra la actual.
5. **`coincide_bloque_autor`** usa el bloque del votante **de esa misma fila** (el que
   tenía en esa fecha, ya presente en `df_modelado`), no su bloque actual.

## Pasos de implementación

1. Crear `data/tabla_periodos_presidenciales.csv` con los períodos Menem → Milei
   (presidente, fechas, coalición, firmantes, bloques integrantes). Claude propone el
   contenido; **el equipo lo valida fila por fila antes de seguir** (es una definición
   politológica, no técnica).
2. Crear `notebooks/STG_5.2_features_autor.ipynb` con: función de normalización de nombres
   (compartiendo criterio con la ya usada en el proyecto), carga de insumos, y validación
   de formato de las dos tablas manuales.
3. Construir la tabla de lookup histórico: (diputado_norm, fecha, bloque) únicos del
   histórico crudo, ordenada por fecha, con una sola fila por diputado-fecha.
4. Implementar la cascada (ejecutivo → manual → histórico → pendiente) y generar
   `bloque_autor`.
5. Derivar `es_poder_ejecutivo`, `es_oficialista` y `coincide_bloque_autor`.
6. Chequeos automáticos (asserts): consistencia PE⇒oficialista, cero lookups al futuro,
   los 312 títulos con autor sin vacíos silenciosos, conteos por fuente.
7. Exportar las tres salidas + generar/actualizar `autores_pendientes.csv` y la plantilla
   de `tabla_autor_bloque_manual.csv` con los pendientes.
8. Corrida de reproducibilidad (re-ejecutar y verificar salida idéntica) y registro en
   `memoria/DECISIONES.md`.

## Reproducibilidad

- **Sin azar**: no hay ninguna fuente de aleatoriedad (no hace falta `random_state`; se
  deja constancia en el notebook). `merge_asof` y los joins son deterministas.
- **Entradas**: `df_modelado.csv`, `hcdn_votaciones_historico.csv`, `titulos_autor.xlsx`,
  `tabla_periodos_presidenciales.csv`, `tabla_autor_bloque_manual.csv`.
- **Salidas** (nuevas, nada se sobrescribe): `df_modelado_autor.csv`,
  `tabla_autor_bloque.csv`, `autores_pendientes.csv`.
- Re-ejecutar el notebook con los mismos insumos produce byte a byte el mismo resultado;
  cuando el equipo complete más autores (manual o `titulos_autor.xlsx`), re-ejecutar
  absorbe lo nuevo sin tocar código.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Nombres con encoding roto ("PE�A") o variantes ("LOSPENNATO, SILVIA G." vs "...GABRIELA") | Normalización extendida (Ñ→N, limpieza de caracteres inválidos). Lo que igual no matchee cae a pendientes — **nunca** a un match difuso silencioso. |
| Homónimos (el "FERNANDEZ, ALBERTO" de 2013) | La condición de fecha en la detección del Ejecutivo lo excluye; queda en pendientes con contexto para que el equipo lo investigue. |
| Proyectos de un presidente votados fuera de su mandato (Macri en 2026) | No pasan la regla del Ejecutivo; van a pendientes listados con fecha y motivo. El equipo decide caso por caso (¿proyecto reenviado? ¿autor como ex-presidente?). |
| Bloque "viejo" de un autor que dejó la Cámara hace años (CFK como senadora en 2017 matchearía su bloque de diputada de 2005) | Es una aproximación aceptada y explicable ("su último bloque conocido en Diputados"); si el equipo la considera mala para un caso, la tabla manual la pisa (paso 2 gana al paso 3). |
| Definir qué bloques integran cada coalición es una decisión politológica discutible | Queda explícita y versionada en `tabla_periodos_presidenciales.csv`, validada por el equipo (que es de Ciencia Política — es SU decisión, no de Claude), y registrada en `DECISIONES.md`. |
| Autores colectivos (comisiones) sin bloque real | El equipo define su categoría en la tabla manual (ej. `COMISION`); `es_oficialista` y `coincide` darán 0 para esa categoría. |
| El histórico tiene fechas hasta 2026-12 (posteriores a hoy — posible ruido del scraping) | No afecta: el lookup es hacia atrás desde cada votación. Se anota la anomalía en el notebook por transparencia. |

## Constitution Check

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| 1 — Sin spec no hay código | ✅ | Spec 011 aprobada el 2026-07-17. |
| 2 — Validación temporal | ✅ (N/A directo) | No se entrena ningún modelo acá. El lookup de bloques es temporal-hacia-atrás por diseño. |
| 3 — Cero leakage | ✅ | `merge_asof` backward + assert automático; autores "del futuro" van a pendientes; oficialismo evaluado a la fecha de cada votación. |
| 4 — Métrica honesta | ✅ (N/A) | No se reportan métricas en esta spec. |
| 5 — Reproducibilidad | ✅ | Sin azar; entradas y salidas con nombre propio; `df_modelado.csv` y el histórico crudo intactos; tablas manuales versionadas en el repo. |
| 6 — Trazabilidad | ✅ | Decisiones registradas en `DECISIONES.md`; cada asignación de bloque lleva su fuente (`ejecutivo`/`manual`/`historico`). |
| 7 — Simple antes que sofisticado | ✅ | Solo pandas + stdlib. Sin librerías nuevas, sin fuzzy matching nuevo, cascada de 4 pasos explicable en una pizarra. |
| 8 — El equipo entiende lo que entrega | ✅ | Las definiciones politológicas (coaliciones, bloques integrantes) las valida el equipo; la trazabilidad por fuente permite auditar cualquier valor. |
