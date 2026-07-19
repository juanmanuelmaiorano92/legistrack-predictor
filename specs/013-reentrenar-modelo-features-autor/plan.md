# Plan 013 — Reentrenamiento del modelo con features de autoría (solo votaciones 2019+)

## Enfoque técnico

La idea es **reusar exactamente el pipeline de modelado de la spec 009**, cambiándole tres
cosas: (1) le sumamos las features de autoría, (2) entrenamos solo con votaciones de 2019 en
adelante, y (3) probamos dos definiciones del PRO (escenario A/B). Nada de esto reescribe lo
ya hecho: se crean notebooks nuevos y se guardan salidas con nombre propio, dejando intactos
los artefactos de la spec 009.

Se trabaja en **dos notebooks nuevos** (numeración decimal, según la convención de la spec 011
— el número refleja el lugar en el pipeline, no el orden de creación):

1. **`STG_5.3_dataset_entrenamiento_autor.ipynb`** — arma el dataset de entrenamiento
   `df_entrenamiento_autor.csv`. Es la versión "con autoría y recortada a 2019+" del
   `df_entrenamiento.csv` de la spec 009.
2. **`STG_6.2_modelado_autor.ipynb`** — compara los 6 modelos en cada escenario (A/B), elige
   ganador y lo compara contra el benchmark 0.453.
3. **`STG_7.2_tuning_autor.ipynb`** — optimiza los hiperparámetros del modelo/escenario ganador.

### El orden de operaciones es lo más delicado (para no meter fuga de información)

El dato clave que descubrimos: **las 4 votaciones anómalas son todas anteriores a 2019**, así
que el filtro de año ya las excluye del entrenamiento por sí solo. Como decidiste que solo hay
que sacarlas **del entrenamiento** (no del historial), no se hace ninguna exclusión especial:
quedan participando de la afinidad acumulada como cualquier voto viejo, y simplemente no serán
filas a predecir porque caen antes de 2019. Se deja una **verificación explícita al final** que
confirma que esos 4 `id_votacion` no aparecen en el dataset de entrenamiento (cumple el criterio
de aceptación de la spec). El filtro a 2019+ va **al final**, después de calcular las features
históricas, para que un voto de principios de 2019 "recuerde" todo lo que el diputado votó antes
(incluido 2018 y anteriores). El orden correcto es:

```
1. Leer df_modelado_autor.csv (TODOS los años, 28.738 filas)
2. Sacar los votos AUSENTE (igual que la spec 009)
3. Pegar embeddings + tema_id desde df_features_titulo.csv
4. Calcular TODAS las features históricas con el historial completo (cumsum().shift(1))
   (las 4 votaciones anómalas SÍ participan de este historial, pero no serán filas de entrenamiento)
5. Correr el chequeo anti-leakage sobre TODOS los años (primer voto de cada diputado = NaN)
6. Rellenar NaN con la cascada honesta (tema → hist → 0.5 neutro)
7. Normalizar y codificar bloque_autor + preparar las features de autor
8. --> RECIÉN ACÁ filtrar a fecha >= 2019-01-01
9. Verificar que los 4 id anómalos no quedaron (redundante con el filtro, pero explícito)
10. Guardar df_entrenamiento_autor.csv
```

El paso 8 al final es la traducción exacta de la decisión que tomaste: "historial completo,
pero entrenar solo con 2019+".

### Cómo entran las features de autoría al modelo

`df_modelado_autor.csv` ya trae, calculadas y verificadas anti-leakage en las specs 011/012,
estas columnas por fila:

| Feature | Qué es | Tipo |
|---|---|---|
| `bloque_autor` | bloque/coalición del autor del proyecto a la fecha del voto | texto (se codifica) |
| `es_poder_ejecutivo` | 1 si el proyecto lo mandó el Poder Ejecutivo | -1 / 0 / 1 |
| `es_oficialista` | 1 si el autor es del oficialismo del momento | -1 / 0 / 1 |
| `coincide_bloque_autor` | 1 si el diputado votante es del mismo bloque que el autor | -1 / 0 / 1 |
| `es_oficialista_b` | igual que `es_oficialista` pero con PRO **dentro** de LLA | -1 / 0 / 1 |
| `coincide_bloque_autor_b` | igual que `coincide` pero con PRO **dentro** de LLA | -1 / 0 / 1 |

(`-1` = "sin dato de autor", una categoría explícita, no un vacío.)

- **Escenario A** (PRO fuera de LLA) usa: `bloque_autor`, `es_poder_ejecutivo`,
  `es_oficialista`, `coincide_bloque_autor`.
- **Escenario B** (PRO dentro de LLA) usa: `bloque_autor`, `es_poder_ejecutivo`,
  `es_oficialista_b`, `coincide_bloque_autor_b`.

`bloque_autor` y `es_poder_ejecutivo` son idénticos en ambos escenarios; solo cambian las otras
dos. Por eso el costo de probar A vs. B son 2 columnas, no dos datasets.

`bloque_autor` viene con la **misma coalición escrita de dos formas** ("Frente De Todos" vs.
"FRENTE DE TODOS", "La Libertad Avanza" vs. "LA LIBERTAD AVANZA"). Antes de codificarlo hay que
**normalizar la grafía** (mayúsculas/minúsculas y tildes), si no el modelo trataría a la misma
coalición como dos bloques distintos.

### Comparación de modelos y elección del ganador

En `STG_6.2` se repite el esquema de la spec 009: partición temporal 80/20 (el 80% más viejo
entrena, el 20% más nuevo es el holdout) + `TimeSeriesSplit(5)` para la validación cruzada.
Para **cada escenario (A y B)** se corren los **mismos 6 modelos** de la spec 009 —Dummy,
LogisticRegression, RandomForest, Bagging, XGBoost y LightGBM— con la misma configuración. Se
arma una tabla de 12 filas (6 modelos × 2 escenarios) ordenada por F1-macro en holdout, se
elige la combinación (modelo, escenario) ganadora, y se dibuja su matriz de confusión.

Luego, en `STG_7.2`, se afinan los hiperparámetros del modelo ganador con `RandomizedSearchCV`
sobre el mismo `TimeSeriesSplit`, igual que hizo STG_7.

Finalmente se compara el mejor F1-macro contra el **benchmark histórico 0.453** (spec 009),
dejando escrito que la comparación es de referencia, no pareja (aquel usó todos los años; este
solo 2019+).

## Librerías y herramientas

Ninguna nueva. Se usa exactamente lo que ya está en el proyecto:

- **pandas / numpy** — manipulación de datos y cálculo de las features históricas.
- **scikit-learn** — `OrdinalEncoder`, `LabelEncoder`, `TimeSeriesSplit`, `cross_val_score`,
  `RandomizedSearchCV`, `f1_score`, `confusion_matrix`, los modelos Dummy/LogReg/RF/Bagging.
- **xgboost / lightgbm** — los dos modelos de boosting.
- **matplotlib** — gráficos (comparación de modelos, matriz de confusión).
- **joblib** — guardar encoders.

Se respeta el bug ya documentado en la spec 009: LightGBM se evalúa con
`cross_val_score(..., n_jobs=1)` para evitar el doble paralelismo que reventaba la memoria.

## Diseño anti-leakage / validación

Esto es lo más importante del plan. Tres frentes:

1. **Features históricas.** Se calculan con `cumsum().shift(1)` (media acumulada que nunca
   incluye el voto actual), exactamente como en STG_5. Se calculan sobre **todos los años** y
   el filtro a 2019+ se aplica **después**. Un chequeo automático (assert) verifica que el
   primer voto de cada diputado tenga las features históricas en NaN — si alguna tiene valor,
   la notebook frena. Este chequeo corre **sobre el dataset completo** (antes de recortar a
   2019+), porque después del recorte "el primer voto" ya no sería el primero real del diputado.

2. **Features de autoría.** Ya vienen calculadas y verificadas anti-leakage en las specs
   011/012 (la resolución por histórico usa `merge_asof` hacia atrás; un autor que solo aparece
   en el histórico *después* de la votación no se usa). Acá solo se consumen, no se recalculan.

3. **Validación.** Partición temporal 80/20 + `TimeSeriesSplit(5)`. **Cero** `train_test_split`
   aleatorio. Un assert confirma que ninguna fecha del train supera la mínima del holdout, y que
   cada fold de la CV valida con fechas posteriores a su train (igual que la spec 009).

Métrica: **F1-macro** como principal, siempre acompañada de la **matriz de confusión** (P4).

## Pasos de implementación

**Notebook `STG_5.3_dataset_entrenamiento_autor.ipynb`:**

1. Cargar `df_modelado_autor.csv` (parse de `fecha_votacion`) y `df_features_titulo.csv`.
2. Filtrar AUSENTE y unificar `ABSTENCION`/`ABSTENCIÓN` (idéntico a STG_5).
3. Merge de `tema_id` + 384 embeddings por `titulo_base`.
4. Recalcular las mismas features del diputado que STG_5 (reusando la función
   `media_acumulada_pasado`): `es_afirmativo`, `alineado_bloque`, `tasa_afirmativo_hist`,
   `tasa_afirmativo_tema_hist`, `tasa_alineacion_bloque_hist`, `tasa_afirmativo_desde_2023`,
   `tasa_afirmativo_2026`, `n_votos_hist`, `tasa_afirmativo_bloque_tema` — todo con historial
   completo (las 4 votaciones anómalas participan del historial, no se sacan acá).
5. Chequeo anti-leakage sobre todos los años (assert de primer voto = NaN).
6. Cascada de relleno de NaN (tema → hist → 0.5).
7. Normalizar la grafía de `bloque_autor` y codificarlo (`OrdinalEncoder`); dejar listas las
   features binarias de autor y sus variantes de escenario B.
8. Codificar `bloque`/`provincia` del votante (ordinal), guardando el/los encoders con nombre
   propio (sin pisar los de la spec 009).
9. **Filtrar a `fecha_votacion >= 2019-01-01`.**
10. Verificar explícitamente que los `id_votacion` 1925, 3527, 3585 y 3494 no quedaron en el
    dataset (redundante con el filtro de año, pero deja el criterio de aceptación probado).
11. Guardar `df_entrenamiento_autor.csv` incluyendo en las columnas-meta `id_votacion` (para
    trazabilidad) y ambas variantes de autor (A y B). Verificación final: fecha mínima ≥ 2019,
    los 4 ids ausentes, 0 NaN en features.

**Notebook `STG_6.2_modelado_autor.ipynb`:**

12. Cargar `df_entrenamiento_autor.csv`, ordenar por fecha, codificar el target (`voto`).
13. Definir el bloque de features base (las de STG_5) + armar dos listas de features: la del
    escenario A y la del B.
14. Partición temporal 80/20 + `TimeSeriesSplit(5)` con los asserts de orden temporal.
15. Correr los 6 modelos en el escenario A y en el B (misma función `evaluar_modelo` de STG_6).
16. Tabla comparativa de 12 filas ordenada por holdout F1-macro; elegir (modelo, escenario)
    ganador; matriz de confusión del ganador; gráficos.
17. Comparar el mejor F1-macro contra 0.453 con la aclaración de contexto. Guardar tablas y
    PNGs en `specs/013-reentrenar-modelo-features-autor/`.

**Notebook `STG_7.2_tuning_autor.ipynb`:**

18. Reconstruir el mismo split, tomar el modelo/escenario ganador, correr `RandomizedSearchCV`
    (cv = `TimeSeriesSplit`) y comparar "por defecto vs. afinado". Guardar tabla y gráfico.

**Cierre:**

19. Registrar en `memoria/DECISIONES.md` el resultado: qué modelo ganó, qué escenario (A o B)
    quedó como definición oficial del PRO, el F1-macro final y su lectura frente al 0.453.

## Reproducibilidad

- `RANDOM_STATE = 42` en todo (modelos, `RandomizedSearchCV`, cualquier fuente de azar).
- **Entradas** (no se tocan): `data/df_modelado_autor.csv`, `data/df_features_titulo.csv`.
- **Salidas nuevas**: `data/df_entrenamiento_autor.csv`, encoder(s) con nombre propio en
  `data/`, y tablas/PNGs en `specs/013-reentrenar-modelo-features-autor/`.
- **No se sobrescribe** ningún artefacto de la spec 009 (`df_entrenamiento.csv`, `le_voto.joblib`,
  `encoder_bloque_provincia.joblib`, ni los PNG/CSV de `specs/009-...`).
- Sin librerías nuevas → no cambia `requirements.txt`.

## Constitution Check

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| **P1 — Sin spec, no hay código** | ✅ | `spec.md` aprobada antes de este plan. |
| **P2 — Validación temporal** | ✅ | Partición 80/20 por fecha + `TimeSeriesSplit(5)`. Cero split aleatorio. Asserts de orden temporal. |
| **P3 — Cero leakage** | ✅ | Features históricas con `cumsum().shift(1)`; se calculan sobre todo el historial **antes** de recortar a 2019+; assert anti-leakage sobre el dataset completo. Features de autor ya verificadas anti-leakage en 011/012. |
| **P4 — F1-macro** | ✅ | F1-macro como métrica principal + matriz de confusión en cada caso. Nunca accuracy sola. |
| **P5 — Reproducibilidad** | ✅ | `random_state=42`; salidas con nombre nuevo; datos crudos y artefactos de la 009 intactos. |
| **P6 — Trazabilidad** | ✅ | Se registra en `memoria/DECISIONES.md` el ganador y el escenario elegido, con su porqué. |
| **P7 — Simple antes que sofisticado** | ✅ | Se reusa el pipeline de la 009 tal cual; se agregan solo las 4 features pedidas; sin modelos ni librerías nuevas. |
| **P8 — El equipo entiende** | ✅ | Cada notebook explica en texto qué hace; el A/B da un argumento empírico defendible para el TP. |

**Resultado: el plan pasa el Constitution Check en los 8 principios.** No hay violaciones que
corregir.

## Riesgos y cómo se mitigan

- **Las 4 votaciones anómalas ya salen por el filtro de año.** Son todas pre-2019, y decidiste
  sacarlas solo del entrenamiento (no del historial). *Mitigación*: no se hace exclusión
  especial —quedan en la afinidad histórica como cualquier voto viejo— y se agrega una
  verificación explícita (paso 10) que confirma que no aparecen como filas de entrenamiento.
- **Grafía inconsistente de `bloque_autor`.** La misma coalición aparece con dos escrituras.
  *Mitigación*: normalizar (mayúsculas + tildes) antes de codificar. Se imprime la lista de
  bloques distintos antes/después para verificar que colapsaron bien.
- **Comparación no pareja contra el 0.453.** Distinta población (2019+ vs. todos los años).
  *Mitigación*: reportarlo explícitamente; presentar el 0.453 como referencia, no como
  igualdad de condiciones.
- **La diferencia A vs. B puede ser chica.** Solo 3 títulos difieren entre escenarios (119
  filas a nivel de voto). *Mitigación*: si la diferencia de F1-macro cae dentro del desvío de
  la CV, se declara "no concluyente" y se elige el escenario por un criterio secundario
  explícito (ej.: el más simple / el políticamente más defendible), sin forzar una conclusión.
- **Menos datos que la spec 009.** *Mitigación baja*: en la práctica 2019+ conserva ~82% de las
  filas (20.608 de 25.082), así que la pérdida de volumen es moderada, no drástica.
- **Duplicación de código entre STG_5 y STG_5.3.** Se copia la lógica de features del diputado.
  *Mitigación*: STG_5.3 reusa las mismas funciones y mantiene los mismos asserts, de modo que
  cualquier divergencia se detecta; se documenta que STG_5.3 es la versión "con autor + 2019+"
  de STG_5.

## Fuera de alcance (recordatorio de la spec)

Reserializar el modelo para la API/app (actualizar STG_8 y `POST /predecir`), mejorar el fuzzy
de la spec 006, completar los 492 títulos sin autor y el deploy en Render — todo eso queda para
specs futuras. Esta spec produce y valida el modelo; no lo pone en producción.
