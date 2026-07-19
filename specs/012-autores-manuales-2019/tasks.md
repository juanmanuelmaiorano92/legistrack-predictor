# Tareas 012 — Integración de autores completados a mano (títulos 2019 en adelante)

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.
> Todas las tareas modifican `notebooks/STG_5.2_features_autor.ipynb` salvo que se indique
> otra cosa. Antes de tocar nada, T1 guarda una copia de referencia de las salidas actuales
> para el chequeo de no-regresión.

- [x] T1 — Guardar copia de referencia del `df_modelado_autor.csv` actual (solo las filas
      de los 312 títulos con autor de la spec 011) en el scratchpad, para el chequeo de
      no-regresión de T8. Verificar: la copia tiene los 312 títulos y sus conteos por
      fuente coinciden con lo registrado en la memoria (manual 35, ejecutivo 90,
      histórico 183, pendiente 4).
      **Hecho**: 312 títulos, 7.191 filas, conteos por fuente confirmados (manual 35,
      ejecutivo 90, histórico 183, pendiente 4). Copia guardada en el scratchpad.

- [x] T2 — Agregar la carga de `data/titulos_autor_manual.xlsx` a la celda de insumos
      (T4 del notebook) con validación de formato: columnas esperadas presentes, sin
      nulos en `id_votacion` / `autor_final` / `bloque_autor`, `id_votacion` entero.
      Verificar: la celda corre e imprime 220 filas leídas. (depende de: T1)
      **Hecho**: celda `t4-carga` extendida (6º insumo) + celda nueva `a2827c3c` de
      validación de formato. 220 filas cargadas, sin nulos, tipos correctos. Notebook
      re-ejecutado de punta a punta sin errores.

- [x] T3 — Deduplicar por `id_votacion` (2 filas repetidas con datos idénticos) y cruzar
      contra `df_modelado` para obtener `titulo_base` y `fecha_votacion` de cada registro.
      Asserts: los 218 ids matchean todos, cada id mapea a exactamente un `titulo_base`,
      y ningún `titulo_base` resultante tiene ya autor en `autores_titulo` (hoy son todos
      SIN_DATO; el assert protege corridas futuras). (depende de: T2)
      **Hecho**: celda `d4afc01d`. 220→218 filas tras dedupe; 218 ids matchean 1 a 1
      contra `titulo_base`; assert de no-pisado OK (todos eran SIN_DATO).

- [x] T4 — Normalización de bloques tipeados a mano: pasada automática con
      `normalizar_nombre` contra los bloques canónicos del dataset + diccionario de mapeo
      explícito en una celda visible para las variantes que no resuelven solas (ej. "Ucr",
      "Ucr - Union Civica Radical", "Socialista", "Identidad Bonaerense", "Republicanos
      Unidos"). Imprimir la tabla completa variante → canónico para auditoría del equipo.
      Chequeo de sanidad: para cada título de legislador, el bloque asignado (normalizado)
      existe entre los bloques de votantes de esa época en `df_modelado`; lo que no,
      se lista con su caso y se resuelve (mapeo corregido o excepción documentada).
      (depende de: T3)
      **Hecho**: celda `b0144e8e`. Resultado mejor al esperado — no hizo falta ningún
      diccionario de corrección. De los 17 bloques distintos (autores no-PEN): 13
      matchean verbatim contra votantes actuales de `df_modelado` (incluida la
      fragmentación preexistente Ucr/Ucr-UCR/Unión Cívica Radical, que ya existía en el
      pipeline de la spec 011 y no la introduce esta tabla); 4 son bloques reales
      verificados contra el histórico completo pero sin votantes actuales en el dataset
      (Identidad Bonaerense, Republicanos Unidos, Socialista, Frente De La Concordia
      Misionero) — `coincide_bloque_autor` dará 0 correctamente para esos 4 títulos.
      Assert permanente agregado para corridas futuras.

- [x] T5 — Sumar los 218 títulos a `autores_titulo` con `fuente_autor = 'manual_2019'`,
      y verificar que el conteo pasa de 312 a 530 títulos con autor conocido.
      (depende de: T4)
      **Hecho**: celda `5279939a`. Confirmado 312 → 530 (fuzzy 221, manual_2019 218,
      deterministico 91). **Bug encontrado, no corregido todavía**: al intentar
      re-ejecutar el notebook completo para verificar, falló el assert de T9(d) de la
      spec 011 (celda `91903947`), que tiene hardcodeado `len(con_autor) == 312` — ahora
      son 530. No es un bug de esta tarea; es un chequeo viejo que hay que actualizar
      cuando se llegue a T8 de esta lista (re-ejecución completa). Se verificó T5 de forma
      aislada (ejecutando solo hasta esa celda) para no depender de ese fix todavía.

- [x] T6 — Paso de cascada para los autores "PEN" (104 títulos): `es_poder_ejecutivo = 1`,
      `bloque_autor` = coalición oficialista vigente a la fecha de votación según
      `tabla_periodos_presidenciales.csv`, `fuente_bloque_autor = 'ejecutivo'`.
      Verificación cruzada: comparar contra el bloque cargado a mano en el Excel e
      imprimir toda discrepancia (manda la tabla de períodos). Verificar: los 104 quedan
      resueltos y ninguno cae al paso histórico. (depende de: T5)
      **Hecho**: celda `49e08ccf`. 103 títulos "PEN" (104 - 1 que era el duplicado de
      id 4081 removido en T3) marcados como Ejecutivo. Verificación cruzada: 100/103
      coinciden con el bloque cargado a mano; **3 discrepancias** — acuerdos
      internacionales votados en 2020 (FONPLATA, Qatar, acuerdo regional OD 93) cargados
      como "Pro" en el Excel pero votados bajo Frente De Todos. Consultado con el
      usuario: confirmó que valga la coalición vigente al voto (Frente De Todos), no el
      bloque cargado a mano — consistente con la regla ya acordada en la spec 011
      ("importa qué gobierno impulsa el proyecto al momento del voto, no quién lo
      inició"). El notebook ya aplica ese criterio por default.

- [x] T7 — Paso de cascada para los autores legisladores (115 títulos): `bloque_autor` =
      bloque cargado a mano específico del título, `fuente_bloque_autor = 'manual'`
      (se reutiliza la misma categoría del paso 1 existente — misma prioridad, no hace
      falta tocar T8/T9). Reporte de consistencia: si un autor de la tabla por-título
      también figura en `tabla_autor_bloque_manual.csv` con otro bloque, listarlo para
      revisión (cada título conserva su asignación específica). Verificar: los 218
      títulos nuevos quedan resueltos — ninguno llega a 'historico' ni a
      'PENDIENTE_MANUAL'. (depende de: T6)
      **Hecho**: celda `b9d62a66`, insertada justo después del paso 1 existente
      (`bf7716ee`) y antes del paso 2 (`bad7d51b`). 115 títulos de legisladores
      resueltos (sin conflicto con la tabla manual por-autor — 0 autores se solapan).
      Verificado tras correr también el paso 2 existente: los 218 quedan 115 `manual` +
      103 `ejecutivo`, cero nulos, ninguno cae a histórico ni a pendiente.

- [x] T8 — Re-ejecutar el notebook completo de punta a punta sin cambios en T8/T9
      existentes (derivación de features y chequeos de la spec 011). Verificar: los 5
      chequeos automáticos pasan, y el chequeo de no-regresión da OK — las filas de los
      312 títulos previos son idénticas a la copia de referencia de T1. (depende de: T7)
      **Hecho**: se corrigió el único assert que rompía (`91903947`, T9d — tenía
      `312` hardcodeado, ahora calcula el total dinámicamente). Notebook completo
      re-ejecutado sin errores. Los 5 chequeos automáticos (a-e) pasan. Conteos finales:
      `sin_dato` 710→492, `manual` 35→150, `ejecutivo` 90→193, `histórico` sin cambios
      en 183 (ningún título nuevo cayó ahí). No-regresión confirmada: las 7.191 filas de
      los 312 títulos originales quedaron idénticas byte a byte en todas las columnas.

- [x] T9 — Regenerar las tres salidas (`df_modelado_autor.csv`, `tabla_autor_bloque.csv`,
      `autores_pendientes.csv`) y verificar los conteos globales: títulos sin autor
      710 → 492; `bloque_autor` ≠ SIN_DATO en los 218 nuevos; distribución nueva de
      `es_poder_ejecutivo` y `es_oficialista` impresa y explicada en el notebook.
      (depende de: T8)
      **Hecho**: confirmado 492 sin_dato / 530 con autor. `es_poder_ejecutivo`:
      -1:496, 0:324, 1:202 (+218 exactos respecto de antes, repartidos 115/103 como se
      esperaba). `autores_pendientes.csv` sin cambios (4 títulos, 2 autores).
      `tabla_autor_bloque.csv`: 162→251 autores; "PEN" queda como una fila de autor
      (103 títulos, bloque = La Libertad Avanza, la coalición más reciente) — coherente
      con la advertencia ya registrada de no usar esta tabla para el selector de autor
      hipotético de la app. **Hallazgo relevante**: por primera vez, escenario A y B de
      `es_oficialista`/`coincide_bloque_autor` difieren en 3 títulos — los 3 son autores
      del bloque Pro (Finocchiaro, Lospennato, Juez et al.) votados bajo el gobierno de
      Milei, exactamente el caso que la spec 011 dejó pendiente de evidencia empírica
      para la comparación de escenarios en la spec 013.

- [x] T10 — Verificar reproducibilidad: re-correr el notebook una segunda vez y comparar
      las tres salidas byte a byte (mismo procedimiento que T11 de la spec 011).
      (depende de: T9)
      **Hecho**: segunda corrida completa desde cero. Las tres salidas
      (`df_modelado_autor.csv` 28.738×19, `tabla_autor_bloque.csv` 251×5,
      `autores_pendientes.csv` 4×5) resultaron idénticas byte a byte a la primera
      corrida.

- [x] T11 — Validar contra los 7 criterios de aceptación de `spec.md`, marcando cada uno
      con `[x]` y la evidencia de qué se verificó. (depende de: T10)
      **Hecho**: los 7 criterios de `spec.md` marcados `[x]` con su evidencia.

- [x] T12 — Registrar el cierre de la spec 012 en `memoria/DECISIONES.md`: conteos
      finales por fuente, la tabla de mapeo de bloques aplicada, discrepancias PEN
      encontradas (si hubo) y el próximo paso (spec 013 — reentrenamiento y comparación
      de escenarios A/B). (depende de: T11)
      **Hecho**: entrada de cierre agregada en `memoria/DECISIONES.md`
      (2026-07-18 — "Spec 012 COMPLETA"), más actualización de `project_legistrack.md`
      y `MEMORY.md` (memoria de proyecto, que estaba desactualizada desde antes de las
      specs 009-011).
