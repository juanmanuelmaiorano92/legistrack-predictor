# Tareas 009 — Features de modelado y entrenamiento del predictor de votos

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.
> Bloques: A) STG_5 features · B) STG_6 modelado · C) STG_7 tuning · D) informe .docx · E) cierre.

## Bloque A — STG_5: ingeniería de features (`notebooks/STG_5_features_diputado.ipynb`)

- [x] T1 — Crear la notebook y celda de carga: leer `data/df_modelado.csv` (parse de `fecha_votacion`) y `data/df_features_titulo.csv`. Verificar 28.738 filas y 1.022 títulos.
- [x] T2 — Merge por `titulo_base` para traer `emb_0..emb_383`. Verificar que sigue habiendo 28.738 filas y 0 NaN en los embeddings. (depende de: T1)
- [x] T3 — Crear columna `es_afirmativo` (1 si voto == AFIRMATIVO) y `alineado_bloque` (voto == moda del bloque en esa votación, agrupando por `[titulo_base, fecha_votacion, bloque]`). (depende de: T2)
- [x] T4 — Implementar la función `media_acumulada_pasado` (cumsum con `shift(1)`) y calcular, ordenando por `[diputado, fecha_votacion]`: `tasa_afirmativo_hist`, `tasa_afirmativo_tema_hist` (grupo diputado+tema_id), `tasa_alineacion_bloque_hist`. (depende de: T3)
- [x] T5 — Calcular las dos ventanas con fecha de corte sin leakage: `tasa_afirmativo_desde_2023` (votos ≥ 2023-12-10 y < fecha actual) y `tasa_afirmativo_2026` (votos ≥ 2026-01-01 y < fecha actual). (depende de: T4)
- [x] T6 — Calcular `n_votos_hist` con `groupby('diputado').cumcount()`. (depende de: T4)
- [x] T7 — Calcular `tasa_afirmativo_bloque_tema`: agregar primero por `[bloque, tema_id, fecha_votacion]`, hacer el acumulado/`shift` a nivel día, y pegar de vuelta al dataset. (depende de: T3)
- [x] T8 — Chequeo automático de no-leakage (assert): el primer voto cronológico de cada diputado debe tener las `tasa_*_hist` en NaN ANTES del relleno. Si falla, la notebook frena. (depende de: T5, T6, T7)
- [x] T9 — Aplicar la cascada de relleno de NaN: tema→hist, ventanas→hist, y NaN residual→0.5 neutro. Verificar 0 NaN residual en las features. (depende de: T8)
- [x] T10 — Codificar `bloque` y `provincia` con `OrdinalEncoder`; guardar el encoder en `data/` con joblib. (depende de: T9)
- [x] T11 — Guardar `data/df_entrenamiento.csv` con `random_state` donde aplique. Imprimir verificación final: 28.738 filas, lista de columnas de features, 0 NaN. (depende de: T10)

## Bloque B — STG_6: comparación de modelos (`notebooks/STG_6_modelado.ipynb`)

- [x] T12 — Crear la notebook: cargar `data/df_entrenamiento.csv`, ordenar por `fecha_votacion`, definir lista de features y target, codificar `voto` con `LabelEncoder`. (depende de: T11)
- [x] T13 — Separar el holdout temporal final (~20% más reciente) y definir `TimeSeriesSplit(n_splits=5)` sobre el 80% restante. Verificar que ninguna fecha del train supera la mínima del holdout. (depende de: T12)
- [x] T14 — Entrenar y evaluar con CV temporal el baseline: `DummyClassifier(strategy='most_frequent')` y `LogisticRegression`. Reportar F1-macro (media ± desvío). (depende de: T13)
- [x] T15 — Entrenar y evaluar con la misma CV: `RandomForestClassifier` y `BaggingClassifier` (`random_state=42`). Reportar F1-macro. (depende de: T13)
- [x] T16 — Entrenar y evaluar con la misma CV: `XGBClassifier` y `LGBMClassifier` (`random_state=42`). Reportar F1-macro. Verificar que ambas librerías instalan y corren. (depende de: T13)
- [x] T17 — Armar tabla comparativa de F1-macro (CV + holdout) de los 5 enfoques y elegir el ganador por F1-macro. Guardar tabla en CSV. (depende de: T14, T15, T16)
- [x] T18 — Graficar comparación de modelos (barras de F1-macro) y la matriz de confusión del ganador sobre el holdout. Guardar PNG en la carpeta de la spec. (depende de: T17)
- [x] T19 — Calcular y graficar la importancia de features del ganador (`feature_importances_` o coeficientes). Guardar PNG + CSV. (depende de: T17)

## Bloque C — STG_7: tuning del ganador (`notebooks/STG_7_tuning.ipynb`)

- [x] T20 — Crear la notebook: cargar `data/df_entrenamiento.csv`, reconstruir el mismo split temporal y `TimeSeriesSplit` de STG_6. (depende de: T17)
- [x] T21 — Definir la grilla de hiperparámetros del modelo ganador y correr `RandomizedSearchCV(cv=tscv, scoring='f1_macro', random_state=42)`. (depende de: T20)
- [x] T22 — Comparar F1-macro del ganador por defecto vs. afinado (en CV y en holdout). Guardar resultados en CSV y PNG comparativo. (depende de: T21)

## Bloque D — Informe .docx (`specs/009-modelado-prediccion-votos/generar_informe.py`)

- [x] T23 — Escribir el script que lee las tablas/PNG de STG_6 y STG_7 y arma el `.docx` con `python-docx`: features y qué captura cada una, tabla/gráfico de modelos, matriz de confusión del ganador, importancia de features + interpretación política, defensa metodológica (validación temporal y F1-macro) y la mejora del tuning. (depende de: T18, T19, T22)
- [x] T24 — Ejecutar el script y verificar que el `.docx` se genera con todas las secciones y los gráficos embebidos. (depende de: T23)

## Bloque E — Cierre

- [x] T25 — Agregar dependencias nuevas (`xgboost`, `lightgbm`, `python-docx`, `matplotlib` si falta) a `requirements.txt` con versión. (depende de: T16, T24)
- [x] T26 — Validar contra TODOS los criterios de aceptación de la spec 009 (28.738 filas, assert no-leakage, CV temporal, 5 modelos con F1-macro+matriz, ganador+importancia, STG_7 con TimeSeriesSplit, .docx completo, random_state fijo, Constitución). (depende de: T25)
- [x] T27 — Registrar resultado y decisiones (modelo ganador, F1-macro, mejora del tuning, relleno 0.5, etc.) en `memoria/DECISIONES.md`. (depende de: T26)
