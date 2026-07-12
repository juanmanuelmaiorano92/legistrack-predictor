# Spec 009 — Features de modelado y entrenamiento del predictor de votos

## Objetivo
Construir el dataset de entrenamiento con todas las features (del título, del diputado y de
su historial sin fuga de información), entrenar y comparar varios modelos de predicción de
voto con validación temporal, y dejar documentado en un informe para la defensa del TP qué
modelos se probaron, cuál ganó y qué peso tuvo cada feature. Es el corazón del proyecto: pasar
de "datos limpios" a "modelo que predice el voto".

## Problema que resuelve
Hoy el proyecto tiene los datos consolidados y las features semánticas del título
(`df_modelado.csv` + `df_features_titulo.csv`), pero **no existe todavía ninguna feature del
comportamiento del diputado ni ningún modelo entrenado**. Sin esto, la app solo muestra
historial; no puede predecir. Esta feature cierra esa brecha.

## Qué construir (en lenguaje funcional)

Cuatro entregables:

### 1. Notebook de ingeniería de features (`STG_5_features_diputado.ipynb`)
Toma `df_modelado.csv` (28.738 votos) y `df_features_titulo.csv` (embeddings + tema) y
produce un dataset listo para entrenar, donde cada fila ("el diputado D votó la ley L el día
F") tiene columnas que describen:

- **Del título**: a qué tema pertenece la ley y su representación semántica (embeddings).
  Ya existen; solo hay que unirlas.
- **Del diputado (fijas)**: su bloque político y su provincia.
- **Del historial del diputado** (calculadas **solo con votos anteriores** a cada voto, para
  no hacer trampa):
  - qué tan seguido vota AFIRMATIVO en general,
  - qué tan seguido vota AFIRMATIVO **en ese tema**,
  - qué tan alineado vota con su bloque,
  - su comportamiento desde el **10 de diciembre de 2023** (inicio del gobierno actual): qué tan
    seguido vota AFIRMATIVO contando solo sus votos posteriores a esa fecha y anteriores al voto
    que se quiere predecir,
  - su comportamiento en **2026** (desde el **1 de enero de 2026**): ídem, pero contando solo sus
    votos de este año previos al voto que se quiere predecir,
  - cuántos votos previos tiene registrados (para saber cuánta historia hay detrás de cada tasa).
- **Del historial del bloque**: qué posición histórica tiene el bloque del diputado frente a
  ese tema.

La salida es un único archivo de dataset de entrenamiento (`df_entrenamiento.csv` o similar)
que la siguiente notebook consume directamente.

### 2. Notebook de entrenamiento y comparación de modelos (`STG_6_modelado.ipynb`)
Toma el dataset de entrenamiento y:
- separa los datos respetando el orden temporal (entrena con el pasado, evalúa con el futuro),
- prueba y compara cinco enfoques, de simple a sofisticado:
  1. un **baseline** simple (clasificador trivial y/o regresión logística) como piso de comparación,
  2. **Random Forest**,
  3. **Bagging** (`BaggingClassifier`),
  4. **XGBoost**,
  5. **LightGBM**,
- usa **validación cruzada temporal** (estilo `TimeSeriesSplit`, nunca aleatoria),
- reporta **F1-macro** y la **matriz de confusión** de cada modelo,
- identifica el modelo ganador y calcula el **peso (importancia) de cada feature**.

### 3. Notebook de optimización de hiperparámetros (`STG_7_tuning.ipynb`)
Toma **únicamente el modelo ganador** de STG_6 y busca una mejor configuración de sus
hiperparámetros (con `GridSearchCV`/`RandomizedSearchCV`). Solo se afina al ganador, no a los
cinco: tunear todos es caro y puede hacer elegir un modelo por suerte de configuración en vez
de por calidad real. La búsqueda **debe usar validación cruzada temporal** (`cv=TimeSeriesSplit`),
nunca el CV aleatorio por defecto, o se introduce leakage. Reporta si el modelo afinado mejora
el F1-macro respecto a su versión por defecto.

### 4. Informe en `.docx` para la defensa del TP
Documento en lenguaje claro para estudiantes de Ciencia Política, que explique:
- qué features se construyeron y qué captura cada una (por qué deberían ayudar a predecir),
- qué modelos se probaron y cómo se comparan (tabla y/o gráfico de F1-macro por modelo),
- la matriz de confusión del modelo ganador,
- el ranking de importancia de features (gráfico de barras) y su interpretación política
  (ej: "el bloque y el tema pesan más que la provincia"),
- por qué se usó validación temporal y F1-macro (defensa metodológica frente a la Constitución).
- la mejora de F1-macro obtenida al afinar los hiperparámetros del ganador (STG_7).

## Datos involucrados
- `data/df_modelado.csv`: `diputado`, `titulo_base`, `bloque`, `provincia`, `voto`,
  `fecha_votacion`, `tema_id`, `tema_label` (28.738 filas). `autor_final` **no se usa**
  (cobertura baja y no disponible para una ley hipotética).
- `data/df_features_titulo.csv`: `titulo_base`, `tema_id`, `tema_label`, `emb_0`…`emb_383`
  (1.022 filas). Se une por `titulo_base` solo para traer los embeddings.

## Criterios de aceptación
- [ ] La notebook de features genera un dataset de entrenamiento con todas las features
      descritas y sin filas perdidas respecto a `df_modelado.csv` (28.738 filas).
- [ ] Toda feature de historial pasa un chequeo automático de no-leakage: el primer voto de
      cada diputado tiene historial nulo (NaN), nunca un valor calculado con su voto actual.
- [ ] La separación de datos y la validación cruzada respetan el orden temporal
      (`TimeSeriesSplit` o partición pasado/futuro), nunca `train_test_split` aleatorio.
- [ ] Se comparan los 5 enfoques (baseline, Random Forest, Bagging, XGBoost, LightGBM)
      reportando **F1-macro** + **matriz de confusión** de cada uno.
- [ ] Se identifica el modelo ganador y se calcula la importancia de features.
- [ ] STG_7 afina los hiperparámetros del modelo ganador usando validación cruzada temporal
      (`cv=TimeSeriesSplit`) y reporta la mejora de F1-macro respecto a su versión por defecto.
- [ ] El `.docx` incluye: tabla/gráfico comparativo de modelos, matriz de confusión del
      ganador, gráfico de importancia de features, y la justificación metodológica en lenguaje
      claro.
- [ ] Todo `random_state` está fijo; las nuevas dependencias quedan en `requirements.txt`.
- [ ] Cumple la CONSTITUCION (sin leakage, validación temporal, F1-macro, reproducible,
      simple antes que sofisticado).

## Fuera de alcance
- **Serialización del modelo** (`.pkl`/`.joblib`) y su carga en la app Streamlit: queda para
  una spec futura de integración con la app.
- **Tuning de los cinco modelos**: STG_6 compara con configuración razonable por defecto. El
  único tuning previsto es el de STG_7, y solo sobre el modelo ganador.
- Cambios en notebooks anteriores (STG_1 a STG_4) o en los datasets de entrada.

## Riesgos conocidos
- **Fuga de información (el riesgo principal)**: las tasas históricas (afinidad, alineación
  con el bloque, comportamiento reciente) son fáciles de calcular mal e incluir el voto que se
  quiere predecir. Mitigación: todas se calculan de forma acumulativa hacia atrás y se validan
  con un chequeo automático.
- **Sparsity en la tasa por tema**: muchas combinaciones diputado×tema tienen pocos o ningún
  voto previo → NaN. Hay que definir un relleno honesto (ej: caer a la tasa global del
  diputado) sin introducir leakage.
- **Cómputo del comportamiento reciente (desde 10-dic-2023 y desde 1-ene-2026)**: si se hace
  fila por fila puede ser lento (~minutos en 28.738 filas). Aceptable para una notebook que corre
  una vez, pero hay que tenerlo presente. Además, ambas features siguen sujetas a la regla de
  no-leakage: solo cuentan votos anteriores al voto que se predice.
- **Desbalance fuerte de clases** (ABSTENCIÓN ≈ 3%): el baseline trivial puede tener accuracy
  alto y F1-macro bajo; por eso la métrica oficial es F1-macro, no accuracy.
- **`libomp` para XGBoost/LightGBM en Windows**: pueden requerir dependencias del sistema;
  verificar que instalen y corran en el entorno del equipo (anaconda3).
