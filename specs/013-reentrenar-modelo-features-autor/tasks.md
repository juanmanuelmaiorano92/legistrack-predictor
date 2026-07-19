# Tareas 013 — Reentrenamiento del modelo con features de autoría (solo votaciones 2019+)

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.
> Agrupadas por notebook: STG_5.3 (dataset) → STG_6.2 (modelado A/B) → STG_7.2 (tuning).

## Notebook `STG_5.3_dataset_entrenamiento_autor.ipynb` — armar el dataset

- [x] T1 — Crear el notebook y cargar `data/df_modelado_autor.csv` (parse de `fecha_votacion`)
      y `data/df_features_titulo.csv`. Verificar: 28.738 filas, `id_votacion` presente, rango de
      fechas 1993→2026, distribución de votos impresa.
- [x] T2 — Filtrar los votos `AUSENTE` y unificar `ABSTENCION`/`ABSTENCIÓN`, idéntico a STG_5.
      Verificar el conteo de filas eliminadas. (depende de: T1)
- [x] T3 — Merge de `tema_id` + los 384 embeddings (`emb_*`) por `titulo_base`. Assert: 0 NaN en
      embeddings y en `tema_id`, y la cantidad de filas no cambia. (depende de: T2)
- [x] T4 — Calcular las features históricas del diputado reusando la función
      `media_acumulada_pasado` (cumsum().shift(1)) sobre el **historial completo (todos los
      años)**: `es_afirmativo`, `alineado_bloque`, `tasa_afirmativo_hist`,
      `tasa_afirmativo_tema_hist`, `tasa_alineacion_bloque_hist`, `tasa_afirmativo_desde_2023`,
      `tasa_afirmativo_2026`, `n_votos_hist`, `tasa_afirmativo_bloque_tema`. (depende de: T3)
- [x] T5 — Chequeo anti-leakage sobre todos los años: el primer voto de cada diputado (y de
      cada diputado-tema) debe ser NaN en las features históricas; la notebook frena con
      `AssertionError` si no. (depende de: T4)
- [x] T6 — Cascada de relleno de NaN honesta: tema → hist individual → ventanas → bloque-tema →
      `0.5` neutro. Assert: 0 NaN residuales en las features de modelado. (depende de: T5)
- [x] T7 — Normalizar la grafía de `bloque_autor` (mayúsculas + tildes) e imprimir la lista de
      bloques antes/después para confirmar que la misma coalición colapsó a un solo valor;
      codificar `bloque_autor` con `OrdinalEncoder`. Dejar listas las features binarias de autor
      (`es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`) y sus variantes de
      escenario B (`es_oficialista_b`, `coincide_bloque_autor_b`). (depende de: T6)
- [x] T8 — Codificar `bloque` y `provincia` del votante con `OrdinalEncoder`; guardar el/los
      encoders (incluido el de `bloque_autor`) con nombre propio en `data/`, sin pisar los de la
      spec 009. (depende de: T7)
- [x] T9 — Filtrar el dataset a `fecha_votacion >= 2019-01-01`. Verificar: fecha mínima ≥ 2019 y
      cantidad de filas resultante (~20.608 sin AUSENTE). (depende de: T8)
- [x] T10 — Verificar explícitamente que los `id_votacion` 1925, 3527, 3585 y 3494 **no**
      aparecen en el dataset. Guardar `data/df_entrenamiento_autor.csv` con columnas-meta
      (incluyendo `id_votacion`), las features base, las de autor A y B, y el target. Verificación
      final: fecha mínima ≥ 2019, los 4 ids ausentes, 0 NaN en features. (depende de: T9)

## Notebook `STG_6.2_modelado_autor.ipynb` — comparar 6 modelos × 2 escenarios

- [x] T11 — Crear el notebook, cargar `df_entrenamiento_autor.csv`, ordenar por fecha, codificar
      el target con `LabelEncoder`. Definir la lista de features base (las de STG_5) y armar dos
      listas de features: **escenario A** (base + `bloque_autor`_enc + `es_poder_ejecutivo` +
      `es_oficialista` + `coincide_bloque_autor`) y **escenario B** (base + `bloque_autor`_enc +
      `es_poder_ejecutivo` + `es_oficialista_b` + `coincide_bloque_autor_b`). (depende de: T10)
- [x] T12 — Partición temporal 80/20 (80% más viejo entrena, 20% más nuevo holdout) +
      `TimeSeriesSplit(5)`. Asserts: ninguna fecha del train supera la mínima del holdout, y cada
      fold valida con fechas posteriores a su train. (depende de: T11)
- [x] T13 — Correr los 6 modelos (Dummy, LogisticRegression, RandomForest, Bagging, XGBoost,
      LightGBM) en el **escenario A**, con la misma configuración de la spec 009 (LightGBM con
      `cross_val_score(n_jobs=1)`). Reportar CV F1-macro ± desvío y holdout F1-macro de cada uno.
      (depende de: T12)
- [x] T14 — Correr los mismos 6 modelos en el **escenario B** y reportar sus métricas.
      (depende de: T12)
- [x] T15 — Armar la tabla comparativa de 12 filas (6 modelos × 2 escenarios) ordenada por
      holdout F1-macro; elegir la combinación (modelo, escenario) ganadora; dibujar y guardar la
      matriz de confusión del ganador y el gráfico comparativo en
      `specs/013-reentrenar-modelo-features-autor/`. (depende de: T13, T14)
- [x] T16 — Comparar el mejor F1-macro contra el benchmark histórico **0.453** (spec 009),
      dejando escrito que la comparación es de referencia, no pareja (2019+ vs. todos los años).
      Si la diferencia entre escenario A y B cae dentro del desvío de la CV, declararlo "no
      concluyente" y elegir el escenario por un criterio secundario explícito. (depende de: T15)
      → Resultado: 0.581 vs 0.453 (+28.3%, no pareja). A vs B (0.050) < CV std (0.081) →
      no concluyente estadísticamente; usuario confirmó Escenario A como oficial (gana en holdout,
      más consistente entre folds, más defendible institucionalmente: PRO sigue siendo bloque propio).

## Notebook `STG_7.2_tuning_autor.ipynb` — optimizar el ganador

- [x] T17 — Crear el notebook, reconstruir el mismo split del modelo/escenario ganador, correr
      `RandomizedSearchCV` (cv = `TimeSeriesSplit`, `n_jobs=1`, `random_state=42`) sobre la grilla
      de hiperparámetros del ganador, comparar "por defecto vs. afinado" en CV y holdout, y
      guardar tabla + gráfico en `specs/013-...`. (depende de: T16)
      → Resultado: n_iter reducido de 30 a 15 (75 ajustes) por restricción de tiempo de cómputo
      (~77 min en la máquina disponible). Afinado empeora el holdout (0.534 vs 0.581 del default,
      -8.1%) aunque mejora la CV — mismo patrón que STG_7 (spec 009). Modelo final: LightGBM
      **por defecto**, Escenario A, holdout F1-macro = 0.581.

## Cierre

- [x] T18 — Validar contra los criterios de aceptación de `spec.md` (solo 2019+, 4 ids ausentes,
      historial completo antes del filtro, AUSENTE filtrado, features de autor incorporadas, 6
      modelos × 2 escenarios comparados, F1-macro + matriz de confusión, comparación vs 0.453,
      validación temporal, sin leakage, `random_state` fijo). Marcar cada criterio con evidencia.
      (depende de: T17)
      → Los 12 criterios marcados con evidencia concreta en spec.md (notebook + tarea de origen).
- [x] T19 — Registrar en `memoria/DECISIONES.md` el resultado: modelo ganador, escenario oficial
      del PRO (A o B), F1-macro final y su lectura frente al 0.453. (depende de: T18)
