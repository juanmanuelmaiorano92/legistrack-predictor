# Tareas 014 — Modelo con autoría servido en la API y selector de autor en la app

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

## Parte A — Notebook `STG_8.2_serializar_artefactos_autor.ipynb`

- [x] T1 — Crear el notebook con la celda de setup (rutas, imports, `normalizar_nombre` extendida
      para **quitar caracteres de comillas** — caso Alí "Pipi") y construir la nómina canónica:
      leer `diputados_actuales.csv`, armar `APELLIDO, Nombre`, matchear contra los nombres del
      dataset con `assert` de **257/257**, definir como nombre canónico la grafía del voto más
      reciente, y exportar `data/nomina_diputados.csv` (canónico, clave normalizada, grafías
      históricas absorbidas, bloque actual, provincia).
      **Hecho**: notebook `notebooks/STG_8.2_serializar_artefactos_autor.ipynb` creado.
      Matcheo contra `df_consolidado.csv` (histórico completo, misma fuente que usa
      `api/database.py`) en vez de `df_modelado_autor.csv`, para no dejar afuera ninguna
      grafía que solo aparezca en votaciones filtradas. `assert` 257/257 pasa. Detectados los
      2 diputados con doble grafía: Osuna (bloque actual Unión Por La Patria) y Pichetto
      (Encuentro Federal). Exportado `data/nomina_diputados.csv` (257 filas: diputado
      canónico, clave normalizada, bloque/provincia actuales, grafías históricas separadas
      por `;`, n_grafias).
- [x] T2 — Recalcular `data/snapshot_diputado_autor.csv` desde `df_modelado_autor.csv` (sin
      AUSENTE, todos los años), canonizando los nombres ANTES de agrupar para combinar el
      historial de las grafías duplicadas. `assert`: 257 filas; para Osuna y Pichetto,
      `n_votos_hist` = suma de lo que estaba repartido entre sus dos grafías. (depende de: T1)
      **Hecho**: `data/snapshot_diputado_autor.csv` generado (257 filas). Verificado:
      Osuna = 382 votos (suma de sus 2 grafías), Pichetto = 139 votos — ni se perdió ni se
      duplicó historial al canonizar. Bloque/provincia = los del voto más reciente,
      codificados con `encoder_bloque_provincia_autor.joblib` (sin reajustar).
- [x] T3 — Asignar bloque/provincia del voto más reciente de cada canónico, verificar con
      `assert` que el bloque coincide (normalizado) con el `Bloque` oficial de
      `diputados_actuales.csv` para los 257 (si diverge, listar los casos), y codificar
      `bloque_enc`/`provincia_enc` con `encoder_bloque_provincia_autor.joblib`. (depende de: T2)
      **Hecho**: la asignación y codificación ya las hizo T2; esta celda es el chequeo
      cruzado. 0 divergencias entre bloque oficial y bloque del último voto para los 257.
- [x] T4 — Recalcular `data/snapshot_diputado_tema_autor.csv` y
      `data/snapshot_bloque_tema_autor.csv` (mismas agregaciones que STG_8 pero con nombres
      canonizados y sobre `df_modelado_autor.csv`, uniendo `tema_id` desde
      `df_features_titulo.csv`). (depende de: T2)
      **Hecho**: ambos snapshots generados sin NaN. 2.521 de 5.140 combinaciones
      diputado-tema posibles tienen historial; 571 de 1.100 combinaciones bloque-tema.
- [x] T5 — Reconstruir la lista de features del Escenario A con la MISMA expresión de STG_6.2
      (`FEATURES_COMUNES + ["es_oficialista", "coincide_bloque_autor"]` — las 2 del escenario
      al final) y exportar `data/orden_features_autor.json`. `assert`: son 398 y coinciden una
      a una con las columnas de `df_entrenamiento_autor.csv` usadas al entrenar.
      **Hecho**: `data/orden_features_autor.json` generado (398 features, las últimas 2
      `es_oficialista`/`coincide_bloque_autor`), verificado que el conjunto coincide
      exactamente con las columnas de entrenamiento del Escenario A.
- [x] T6 — Reentrenar el ganador con TODAS las filas de `df_entrenamiento_autor.csv`:
      `LGBMClassifier(class_weight='balanced', random_state=42, n_jobs=-1, verbosity=-1)`,
      features del Escenario A en el orden de T5, target con `le_voto_autor.joblib`. Guardar
      `data/modelo_lgbm_autor.joblib`. (depende de: T5)
      **Hecho**: modelo entrenado sobre 20.608 filas, `data/modelo_lgbm_autor.joblib`
      guardado (~1 MB). Clases: ABSTENCIÓN, AFIRMATIVO, NEGATIVO.
- [x] T7 — Chequeo de sanidad del modelo serializado: predecir sobre una muestra de filas
      conocidas y verificar coherencia, dejando documentado en el notebook que la métrica
      oficial sigue siendo **F1-macro 0.581** (holdout de STG_6.2) y que esta medición no vale
      como evaluación (el modelo ya vio esas filas). (depende de: T6)
      **Hecho**: reconstruido el mismo split 80/20 de STG_6.2 (corte 2025-12-18, 4.122 filas
      de holdout). F1-macro del refit sobre esas filas = 0.928 (≥ 0.581, como se esperaba
      al haberlas visto en el entrenamiento) — confirma que la serialización no rompió nada.
      Documentado explícitamente que la métrica oficial sigue siendo 0.581.
- [x] T8 — Verificar reproducibilidad: correr el notebook completo dos veces y comprobar que
      los 6 artefactos salen idénticos byte a byte. (depende de: T7)
      **Hecho**: corrida completa dos veces desde cero (`jupyter nbconvert --execute`); los
      5 artefactos nuevos (el 6to, `orden_features_autor.json`, incluido) dieron hash SHA-256
      idéntico en ambas corridas. Se agregó también la celda de resumen final (Constitution
      Check de la notebook). **Parte A (notebook STG_8.2) completa.**

## Parte B — API

- [x] T9 — `api/database.py`: cargar `nomina_diputados.csv` (cacheada); `GET /diputados`
      responde los 257 canónicos; el historial de un diputado filtra `df_consolidado` por
      TODAS sus grafías (vía clave normalizada) y muestra bloque/provincia actuales de la
      nómina. Verificar con `TestClient`: `/diputados` devuelve 257 y el historial de
      Pichetto sale completo en una sola entrada. (depende de: T1)
      **Hecho**: agregada `cargar_nomina()` (cacheada); `listar_diputados()` y
      `obtener_historial_diputado()` reescritas sobre la nómina canónica. Verificado con
      `TestClient`: `/diputados` devuelve 257 (Osuna y Pichetto una sola vez cada uno);
      `/diputados/PICHETTO, MIGUEL ANGEL` → 200, historial combinado (207 votos no-AUSENTE,
      suma de sus 2 grafías); caso Alí "Pipi" → 200 OK; nombre inexistente → 404.
      *(Nota agregada en T14: el response_model de `GET /diputados` pasó de `list[str]` a
      `list[{diputado, bloque}]` para poder mostrar el bloque en el selector de autor sin
      257 llamadas extra — sigue devolviendo 257 elementos, un objeto por diputado en vez
      de un string.)*
- [x] T10 — `api/schemas.py`: `PrediccionRequest` pasa a `{titulo, autor}` con ambos campos
      obligatorios y validador de no-vacío; la respuesta suma `autor` y `bloque_autor`
      asignado. (depende de: T9)
      **Hecho**: `autor` agregado a `PrediccionRequest` (obligatorio, no-vacío, mismo
      validador que `titulo`); `PrediccionResponse` suma `autor` y `bloque_autor`. Verificado
      que un request sin autor o con autor vacío falla la validación de Pydantic.
- [x] T11 — `api/modelo.py`: actualizar `construir_features(titulo, autor)` — cargar los
      artefactos `_autor`, resolver el autor (diputado de la nómina → bloque actual
      normalizado / "Poder Ejecutivo Nacional" → coalición vigente derivada de
      `tabla_periodos_presidenciales.csv` por la fecha del día, con fallback al período más
      reciente + advertencia en log), armar las 4 features de autoría (`es_oficialista` por
      `bloques_integrantes` del Escenario A; `coincide_bloque_autor` por votante comparando
      textos normalizados; `bloque_autor_enc` vía encoder con -1 documentado para bloques no
      vistos), mantener cascada de NaN y casteo `float64`, y tomar el orden de columnas de
      `orden_features_autor.json`. Autor inválido → excepción que el router traduce a 422 con
      mensaje claro. (depende de: T10)
      **Hecho**: `api/modelo.py` reescrito. Agregados en `api/database.py`:
      `cargar_snapshot_diputado_autor/_tema_autor`, `cargar_snapshot_bloque_tema_autor`
      (los 3 loaders viejos de snapshot de 259 diputados quedaron sin uso y se eliminaron —
      la API ya no sirve el modelo viejo). Probado directamente (sin pasar por el router,
      eso es T12): PEN → bloque La Libertad Avanza; autor de LLA → oficialista=1; autor del
      PRO → oficialista=0 (Escenario A); autor de Provincias Unidas (bloque no visto por el
      encoder) → `bloque_autor_enc=-1` sin romper la predicción; autor inválido →
      `AutorInvalidoError` con mensaje claro; `coincide_bloque_autor` exacto por bloque
      (95/95 votantes LLA con coincide=1, 0 fuera de LLA). La excepción `AutorInvalidoError`
      aún no está conectada a un 422 HTTP — eso queda para T12 (routers).
- [x] T12 — `api/routers/predecir.py` + `api/main.py`: propagar el campo autor, actualizar
      `precargar_artefactos()` a los artefactos nuevos (modelo, orden, nómina, snapshots
      `_autor`). Verificar con `TestClient`: `/predecir` devuelve exactamente 257
      predicciones; autor faltante o inválido → 422. (depende de: T11)
      **Hecho**: `predecir.py` actualizado — pasa `request.autor`, captura
      `AutorInvalidoError` → `HTTPException(422)`, y la respuesta suma `autor`/`bloque_autor`.
      `precargar_artefactos()` ya apuntaba a los artefactos nuevos desde T11. `main.py` sin
      cambios (solo llama a `modelo.precargar_artefactos()`). Verificado con `TestClient`:
      PEN → 200, 257 predicciones, `bloque_autor`=La Libertad Avanza; sin autor → 422; autor
      inválido → 422 con mensaje claro; `lifespan` precargó todo sin errores.
- [x] T13 — Probar con `TestClient` los casos de comportamiento del modelo nuevo:
      (a) autor = Poder Ejecutivo Nacional → `bloque_autor` = La Libertad Avanza,
      es_poder_ejecutivo=1, es_oficialista=1; (b) autor = diputado de LLA → oficialista sí;
      (c) autor = diputado del PRO → oficialista no (Escenario A); (d) autor de un bloque X →
      los votantes de X tienen coincide=1 y el resto 0 (verificar con un caso concreto);
      (e) autor de un bloque no visto por el encoder (ej. Provincias Unidas) → la predicción
      funciona (`bloque_autor_enc=-1` documentado); (f) mismo título+autor dos veces → misma
      predicción. (depende de: T12)
      **Hecho**: los 6 casos pasan. Nota: `PrediccionDiputado` no expone `es_oficialista`
      ni `coincide_bloque_autor` (no forman parte del contrato HTTP), así que (a)-(e) se
      verificaron combinando `TestClient` (status 200, forma de la respuesta, `bloque_autor`,
      257 predicciones) con `modelo._resolver_autor()`/`construir_features()` en los mismos
      parámetros, para inspeccionar las features internas. (d) con autor de LLA: 95/95
      votantes LLA con coincide=1, 0 fuera de LLA con coincide=1. (f) verificado comparando
      las listas de predicciones de dos llamadas HTTP idénticas.

## Parte C — App y cierre

- [x] T14 — `app/app.py`: dentro del `st.form` de predicción, agregar `st.selectbox` de autor
      con 258 opciones — "Poder Ejecutivo Nacional" primero y los 257 diputados como
      "APELLIDO, Nombre (Bloque actual)" ordenados alfabéticamente, obtenidos de
      `GET /diputados`. El resultado muestra el autor elegido y el bloque asignado.
      (depende de: T12)
      **Hecho**: agregado `DiputadoResumen` a `api/schemas.py` y `GET /diputados` ahora
      devuelve `{diputado, bloque}` (antes solo el nombre) — cambio necesario para que la
      app pueda mostrar el bloque en el selector sin 257 llamadas extra. `app/app.py`:
      selector de autor con 258 opciones, etiqueta "APELLIDO, Nombre (Bloque)" mapeada a un
      diccionario etiqueta→nombre canónico; el resultado muestra `Autor` y `Bloque asignado`.
      Verificado en el navegador con servidores reales (uvicorn + Streamlit): el desplegable
      muestra las 258 opciones (incluido el caso Alí "Pipi" bien codificado en UTF-8),
      seleccionar un diputado y predecir devuelve el autor y bloque correctos, autor=PEN
      devuelve bloque=La Libertad Avanza, y el warning de título vacío sigue funcionando.
- [x] T15 — Verificación de punta a punta con servidores reales (uvicorn + Streamlit):
      repetir en el navegador los casos clave de T13 más el historial unificado de Pichetto,
      y confirmar que la app no permite predecir sin autor. (depende de: T13, T14)
      **Hecho**: con `uvicorn` + Streamlit reales en el navegador — (1) selector "Diputado"
      con PICHETTO buscado muestra **una sola** entrada (no duplicada); (2) su historial
      muestra Bloque=Encuentro Federal, Provincia=Buenos Aires (datos actuales) y
      155+50+2=207 votos, igual al total combinado ya verificado por API; (3) autor=PEN →
      bloque=La Libertad Avanza; (4) autor=AJMECHET (LLA) → bloque correcto propagado;
      (5) autor=ARDOHAIN (PRO) → bloque=PRO propagado correctamente; (6) título vacío →
      warning "Ingresá un título antes de predecir.", no se envía la predicción; (7) el
      selector de autor siempre tiene un valor por defecto (Poder Ejecutivo Nacional), así
      que estructuralmente nunca se puede enviar el formulario sin autor. Servidores
      detenidos al terminar.
- [x] T16 — Validar contra los criterios de aceptación de la spec: marcar cada checkbox de
      `spec.md` con la evidencia (tarea/prueba que lo verificó). (depende de: T15)
      **Hecho**: los 11 criterios de `specs/014-modelo-autor-en-app/spec.md` marcados `[x]`
      con evidencia (tarea/prueba concreta) para cada uno.
- [x] T17 — Registrar resultado y decisiones en `memoria/DECISIONES.md` (incluida cualquier
      sorpresa o bug encontrado durante la implementación, con causa raíz). (depende de: T16)
      **Hecho**: entrada de cierre agregada a `memoria/DECISIONES.md` con el resultado
      completo, los hallazgos de diseño (orden de features, asimetría de coincide_bloque_autor
      para PEN, caso Alí "Pipi", cambio de schema de `/diputados`) y el bug recurrente de
      saltos de línea en `NotebookEdit`. **Spec 014 completa — las 17 tareas cerradas.**
