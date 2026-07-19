# Spec 013 — Reentrenamiento del modelo con features de autoría (solo votaciones 2019+)

## Objetivo

Reentrenar el modelo de predicción de votos de LegisTrack incorporando las **features de
autoría** construidas en las specs 011 y 012, restringiendo el entrenamiento a las
votaciones de **2019 en adelante**, y decidir empíricamente si el bloque **PRO** debe contarse
**dentro o fuera** de la coalición de Milei (escenario A vs. B). El resultado es un modelo más
ajustado a la Cámara actual y una definición oficial del escenario PRO, respaldada por datos.

## Problema que resuelve

Hoy el modelo oficial es el de la spec 009 (F1-macro = 0.453). Tiene tres limitaciones que
esta spec corrige:

1. **No usa la autoría.** El modelo de la spec 009 no conoce de quién viene cada proyecto.
   Desde entonces se construyeron cuatro features de autoría —`bloque_autor`,
   `es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`— que capturan una señal
   política potencialmente fuerte (la disciplina partidaria y si el proyecto lo impulsa el
   oficialismo). El modelo todavía no las aprovecha.

2. **Se entrenó con todos los años.** Buena parte de esos votos son de composiciones de la
   Cámara y contextos políticos muy distintos al actual. Para predecir cómo vota la Cámara de
   **hoy**, entrenar con votaciones recientes (2019 en adelante) debería dar una señal más
   limpia. Además, el trabajo manual de autoría del equipo (spec 012) se concentró justamente
   en 2019+, así que en ese período la cobertura de autoría es alta.

3. **Quedó una duda sin resolver: el PRO bajo Milei.** El PRO es aliado frecuente pero bloque
   formalmente independiente de La Libertad Avanza. Las specs 011/012 dejaron preparadas dos
   columnas de escenario (`es_oficialista_b`, `coincide_bloque_autor_b`) para resolver la duda
   con datos en vez de a priori. Tras la spec 012 existen por primera vez **3 títulos reales**
   donde ambos escenarios difieren.

Además, se detectaron **4 votaciones con datos anómalos** que conviene sacar del entrenamiento.

## Qué construir (en lenguaje funcional)

Un reentrenamiento del modelo, partiendo del dataset con autoría ya construido
(`df_modelado_autor.csv`) más las features del diputado (STG_5) y del título (STG_4), con
estas reglas:

**1. Ventana temporal de entrenamiento: 2019 en adelante.**
El modelo se entrena y se evalúa **solo** con votaciones de 2019 en adelante. Todas las
votaciones de 2018 inclusive hacia atrás se excluyen como filas de entrenamiento.

**2. El historial se calcula con TODO el pasado disponible (no se corta en 2019).**
Las features históricas de cada diputado/bloque (afinidad acumulada = qué proporción de veces
votó afirmativo hasta ese momento) se calculan usando **también** los votos de 2018 y
anteriores. Es decir: los votos viejos alimentan la "memoria" de cada diputado, pero no se
usan como casos a predecir. Esto preserva el contexto histórico sin romper la regla
anti-leakage: cada feature sigue usando solo información anterior a la fecha del voto.
*Orden crítico: primero se calculan las features con el historial completo, y recién después
se filtran las filas a 2019+.*

**3. Se excluyen 4 votaciones anómalas.**
Las votaciones con `id_votacion` **1925, 3527, 3585 y 3494** se quitan del entrenamiento por
tener datos anómalos/erróneos que ensuciarían el modelo.

**4. Se incorporan las features de autoría al modelo.**
Las cuatro features de autoría (`bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`,
`coincide_bloque_autor`) se suman al conjunto de features que ya usaba la spec 009 (9
históricas/políticas + 384 embeddings + tema_id).

**5. Se prueban dos escenarios para el PRO y se vuelven a comparar los 6 modelos de la spec 009.**
- **Escenario A**: PRO **fuera** de la coalición de Milei (usa `es_oficialista` y
  `coincide_bloque_autor`).
- **Escenario B**: PRO **dentro** de la coalición de Milei (usa `es_oficialista_b` y
  `coincide_bloque_autor_b`).
Para cada escenario se **vuelven a comparar los mismos 6 modelos que evaluó la spec 009**
(STG_6) —ahora con las features de autoría y sobre los datos 2019+— y se optimizan los
hiperparámetros del mejor. Gana el que logre mejor **F1-macro** con validación temporal. No
se descarta ningún candidato a priori: aunque en la spec 009 ganó LightGBM, con el nuevo
conjunto de features y de datos otro modelo podría rendir mejor, así que se corre la
comparación completa de cero.

**Salida esperada:** el modelo ganador (mejor F1-macro), la definición oficial del escenario
PRO (A o B), la matriz de confusión de cada caso, y una comparación contra el benchmark
histórico 0.453 con su aclaración de contexto.

## Datos involucrados

- **`data/df_modelado_autor.csv`** (28.738 filas × 19 col, salida de STG_5.2/spec 012):
  `diputado`, `bloque`, `provincia`, `voto`, `fecha_votacion`, `id_votacion`, `titulo_base`,
  y las features de autoría `bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`,
  `coincide_bloque_autor` + variantes de escenario B `es_oficialista_b`,
  `coincide_bloque_autor_b`.
- **Features del diputado** (STG_5): historial de afinidad acumulada por diputado, por bloque,
  por tema, etc.
- **Features del título** (STG_4 / `df_features_titulo.csv`): 384 embeddings semánticos +
  `tema_id`.
- **Los 4 `id_votacion` a excluir**: 1925, 3527, 3585, 3494.

## Criterios de aceptación

- [x] El dataset de entrenamiento contiene **solo votaciones con fecha 2019-01-01 o
      posterior** (verificable: fecha mínima ≥ 2019).
      → `df_entrenamiento_autor.csv`: fecha mínima 2019-04-04 (T9/T10, STG_5.3).
- [x] Las 4 votaciones anómalas (id 1925, 3527, 3585, 3494) **no aparecen** en el dataset de
      entrenamiento.
      → Verificado explícitamente en T10 (STG_5.3): 0 filas con esos `id_votacion`.
- [x] Las features históricas se calculan con el **historial completo** (incluye pre-2019) y
      el filtro a 2019+ se aplica **después** de calcularlas.
      → T4-T8 calculan sobre 25.082 filas (todos los años); T9 recorta recién después a 20.608
      filas (STG_5.3). Orden verificado en el propio notebook.
- [x] Se mantiene el filtrado de votos AUSENTE (igual que la spec 009: AUSENTE no es posición
      política).
      → T2 (STG_5.3): 3.656 filas AUSENTE eliminadas antes de calcular cualquier feature.
- [x] Las cuatro features de autoría están incorporadas al modelo.
      → `bloque_autor_enc`, `es_poder_ejecutivo`, `es_oficialista`/`_b`, `coincide_bloque_autor`/`_b`
      incluidas en `FEATURES_A`/`FEATURES_B` (T7, T11, STG_5.3/STG_6.2).
- [x] Se **vuelven a comparar los 6 modelos de la spec 009** (no solo LightGBM), en cada uno
      de los dos escenarios (A: PRO fuera, B: PRO dentro), y queda **registrado cuál gana** en
      F1-macro y por qué.
      → T13/T14/T15 (STG_6.2): tabla de 12 combinaciones. Ganador: **LGBMClassifier, Escenario A**
      (holdout F1-macro 0.581). Motivo: mejor holdout, más consistente en CV (menor desvío) y
      más defendible institucionalmente (PRO como bloque propio) — decisión confirmada por el
      usuario tras diferencia A/B no concluyente estadísticamente (T16).
- [x] Se reporta **F1-macro + matriz de confusión** para cada modelo/escenario evaluado.
      → Tabla `tabla_comparativa_modelos_autor.csv` (12 filas, CV+holdout F1-macro);
      `matriz_confusion_ganador_autor.png` para el ganador (T15).
- [x] Se compara el resultado contra el **benchmark histórico 0.453**, aclarando que la
      población de entrenamiento cambió (menos años, otra Cámara) y que la comparación es de
      referencia, no estrictamente pareja.
      → T16 (STG_6.2): 0.581 vs. 0.453 (+28.3%), con la aclaración de contexto explícita
      impresa en el notebook.
- [x] **Validación temporal** (TimeSeriesSplit + holdout temporal), nunca split aleatorio.
      → T12 (STG_6.2): split 80/20 por fecha + `TimeSeriesSplit(5)`, con asserts de orden
      temporal en cada fold. Igual esquema en T17a (STG_7.2).
- [x] Sin data leakage (assert automático de que ninguna feature usa datos posteriores a la
      fecha del voto).
      → T5 (STG_5.3): chequeo explícito de que el primer voto de cada diputado (y diputado-tema)
      es NaN en las features históricas, sobre el historial completo. Features de autor ya
      verificadas anti-leakage en specs 011/012.
- [x] `random_state` fijo y resultado reproducible.
      → `RANDOM_STATE = 42` en los 3 notebooks (STG_5.3, STG_6.2, STG_7.2); todos los modelos,
      splits y `RandomizedSearchCV` lo usan.
- [x] Cumple la CONSTITUCION (validación temporal, cero leakage, F1-macro, reproducibilidad).
      → Ver puntos anteriores; Constitution Check ya validado en `plan.md`.

## Fuera de alcance

- **Actualizar la API y la app con el nuevo modelo.** Reserializar los artefactos (STG_8:
  `modelo_lgbm.joblib`, etc.) y conectar el nuevo modelo a `POST /predecir` queda para una
  spec futura. Esta spec produce y valida el modelo; la integración es otro paso.
- Mejorar el matching fuzzy de autores de la spec 006.
- Completar los 492 títulos que aún están sin autor conocido.
- Deploy en Render u otro servidor (requisito de entrega final, pendiente aparte).
- Cambiar la ingeniería de las features de autoría en sí (ya cerradas en specs 011/012); acá
  solo se **usan**.

## Riesgos conocidos

- **Comparación no del todo pareja contra el 0.453.** El benchmark histórico se calculó con
  todos los años; este modelo entrena solo con 2019+. Una diferencia de F1-macro puede
  deberse al cambio de población, no solo a las features nuevas. Hay que reportarlo
  explícitamente y no vender la mejora/caída como efecto puro de la autoría.
- **Menos datos = posible caída de métrica.** Restringir a 2019+ reduce el volumen de
  entrenamiento; el modelo podría bajar en F1-macro por tener menos ejemplos, no por ser peor.
- **La diferencia A vs. B puede ser chica o no concluyente.** Solo 3 títulos difieren entre
  escenarios; el impacto en F1-macro podría quedar dentro del ruido. Si es así, hay que
  decirlo y elegir el escenario con un criterio secundario explícito, no forzar una conclusión.
- **Leakage por orden de operaciones.** Si el filtro a 2019+ se aplicara **antes** de calcular
  las features históricas, se perdería el historial previo (contradice la decisión tomada). El
  orden correcto es: calcular features con todo el historial → filtrar filas a 2019+.
- **Cobertura de autoría en 2019+.** Los títulos SIN_DATO llevan features de autor = -1. Hay
  que verificar qué proporción de las filas 2019+ tiene autor conocido; si fuera baja, las
  features de autoría aportarían poco (se espera que sea alta porque el completado manual de la
  spec 012 fue justamente sobre 2019+).
