# Tareas 010 — API FastAPI para servir datos y predicciones

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

## Parte A — Serializar artefactos (`STG_8`)

- [ ] T1 — Crear `notebooks/STG_8_serializar_artefactos.ipynb`: cargar `data/df_entrenamiento.csv` y reconstruir las 394 columnas de entrada del modelo (embeddings, `tema_id`, `bloque_enc`, `provincia_enc`, las 7 tasas históricas) tal como las arma `STG_6`.
- [ ] T2 — Reentrenar el LGBM ganador con los mismos hiperparámetros de `STG_6` (sin tuning) sobre train+holdout combinados. Guardar como `data/modelo_lgbm.joblib`. (depende de: T1)
- [ ] T3 — Sanity check: recalcular F1-macro sobre el mismo holdout de `STG_6` con el modelo final y comparar contra el 0.453 documentado en la spec 009. Si difiere significativamente, frenar e investigar antes de seguir. (depende de: T2)
- [ ] T4 — Reconstruir el KMeans de temas (`n_clusters=20, random_state=42, n_init=10`) sobre los embeddings de `STG_4`. Guardar `data/kmeans_temas.joblib` y `data/mapa_temas.json` (mapeo `tema_id → tema_label`, incluyendo `GRUPOS_SIN_TEMA = {11}` → `sin_clasificar`). (depende de: T1)
- [ ] T5 — Calcular y guardar `data/snapshot_diputado.csv`: por diputado, `tasa_afirmativo_hist`, `tasa_alineacion_bloque_hist`, `tasa_afirmativo_desde_2023`, `tasa_afirmativo_2026`, `n_votos_hist`, `bloque`, `provincia`, `bloque_enc`, `provincia_enc` (acumulado total, sin `.shift`). (depende de: T1)
- [ ] T6 — Calcular y guardar `data/snapshot_diputado_tema.csv`: por (diputado, `tema_id`), `tasa_afirmativo_tema_hist` (acumulado total). (depende de: T1)
- [ ] T7 — Calcular y guardar `data/snapshot_bloque_tema.csv`: por (bloque, `tema_id`), `tasa_afirmativo_bloque_tema` (acumulado total). (depende de: T1)
- [ ] T8 — Documentar en celdas de texto de `STG_8` por qué el refit final (T2) y los snapshots (T5-T7) no violan la Constitución (sin leakage, sin re-evaluación nueva). (depende de: T2, T3, T4, T5, T6, T7)

## Parte B — API FastAPI

- [ ] T9 — Crear la estructura de carpetas `api/` (`main.py`, `schemas.py`, `database.py`, `modelo.py`, `routers/`) con archivos vacíos o mínimos. (depende de: T3, T4, T5, T6, T7)
- [ ] T10 — Implementar `api/database.py`: funciones para leer `data/df_consolidado.csv` (historial de diputado) y las tres tablas de snapshot. (depende de: T9)
- [ ] T11 — Implementar `api/schemas.py`: esquemas Pydantic `DiputadoHistorial`, `PrediccionRequest` (valida que el título no esté vacío) y `PrediccionResponse`. (depende de: T9)
- [ ] T12 — Implementar `api/modelo.py`: carga de artefactos al importar el módulo (modelo LGBM, KMeans, encoders, tablas snapshot, modelo de `sentence-transformers`) y la función `construir_features(titulo: str)` que arma el vector de 394 features para los 257 diputados. (depende de: T10, T11)
- [ ] T13 — Implementar `api/routers/diputados.py` con `GET /diputados/{id}`, devolviendo bloque, provincia, conteo de votos y últimas 10 votaciones; 404 si el id no existe. (depende de: T10, T11)
- [ ] T14 — Implementar `api/routers/predecir.py` con `POST /predecir`, que usa `construir_features` y el modelo LGBM para devolver la predicción de los 257 diputados. (depende de: T12, T11)
- [ ] T15 — Implementar `api/main.py`: instanciar FastAPI, incluir ambos routers, cargar todos los artefactos una sola vez al iniciar el servidor. (depende de: T13, T14)
- [ ] T16 — Probar la API localmente (`uvicorn api.main:app --reload`): verificar `/docs`, probar `GET /diputados/{id}` con un id válido y uno inválido, y `POST /predecir` con un título de ejemplo. (depende de: T15)

## Parte C — Conectar Streamlit a la API

- [ ] T17 — Modificar `app/app.py`: reemplazar la lectura directa de `df_consolidado.csv` por un `requests.get` a `GET /diputados/{id}` para mostrar el historial. (depende de: T16)
- [ ] T18 — Agregar a `app/app.py` el formulario de predicción: input de título de ley, llamada a `POST /predecir`, tabla con la predicción de los 257 diputados. (depende de: T16)
- [ ] T19 — Actualizar `requirements.txt`: agregar `fastapi`, `uvicorn`, `requests`; confirmar que `lightgbm`, `scikit-learn`, `sentence-transformers`, `joblib` ya estén incluidos. (depende de: T9)

## Cierre

- [ ] T20 — Validar el resultado contra los criterios de aceptación de `spec.md` (endpoints funcionando, estructura modular, Pydantic validando, Streamlit sin leer CSV directamente, Constitución cumplida). (depende de: T17, T18, T19)
- [ ] T21 — Registrar en `memoria/DECISIONES.md` el resultado de la implementación (artefactos generados, F1-macro final del sanity check, cualquier bug resuelto durante el desarrollo). (depende de: T20)
