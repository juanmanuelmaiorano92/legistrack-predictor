# Plan 009 — Features de modelado y entrenamiento del predictor de votos

## Enfoque técnico

El trabajo se parte en tres notebooks encadenadas más un documento, en este orden:

**STG_5 — Construcción de features.** Partimos de `df_modelado.csv` (una fila = un voto de un
diputado en una ley). A esa tabla le pegamos los embeddings del título y le calculamos, fila por
fila, el "perfil histórico" del diputado y de su bloque **mirando solo el pasado**. La idea clave:
para la fila del voto del día F, cualquier número que resuma comportamiento (tasas, conteos) debe
calcularse con votos **anteriores** a F. En pandas esto se logra ordenando por fecha y usando
sumas acumuladas "corridas un lugar" (`shift(1)`), de modo que cada fila ve el acumulado de las
filas previas pero nunca a sí misma. El resultado se guarda como `df_entrenamiento.csv`.

**STG_6 — Comparación de modelos.** Cargamos `df_entrenamiento.csv`, ordenamos por fecha y
separamos un tramo final como "futuro" para la prueba honesta. Entrenamos cinco modelos (de
simple a complejo) y los comparamos con validación cruzada temporal (`TimeSeriesSplit`), que
respeta el orden del tiempo. Medimos F1-macro y matriz de confusión. Elegimos el ganador por
F1-macro y le calculamos la importancia de cada feature.

**STG_7 — Afinado del ganador.** Tomamos solo el modelo ganador y buscamos mejores
hiperparámetros con `RandomizedSearchCV`, pasándole **el mismo `TimeSeriesSplit`** para no romper
la regla temporal. Reportamos cuánto mejora (o no) el F1-macro respecto a la versión por defecto.

**Documento .docx.** Una notebook o script final que toma los resultados ya calculados (tablas y
gráficos guardados por STG_6 y STG_7) y arma el informe para la defensa, en lenguaje claro.

## Librerías y herramientas

| Herramienta | Para qué | Justificación |
|---|---|---|
| `pandas`, `numpy` | manipulación de datos y features | ya en el stack |
| `scikit-learn` | `TimeSeriesSplit`, `DummyClassifier`, `LogisticRegression`, `RandomForestClassifier`, `BaggingClassifier`, `OrdinalEncoder`, métricas | ya en el stack; cubre baseline, RF, Bagging, CV y métricas |
| `xgboost` | modelo XGBoost | pedido en la spec; ya previsto en el stack del proyecto |
| `lightgbm` | modelo LightGBM | pedido en la spec; ya previsto en el stack del proyecto |
| `matplotlib` | gráficos (comparación de modelos, matriz de confusión, importancia de features) | estándar, sin dependencias pesadas |
| `python-docx` | generar el `.docx` | única forma de armar el Word mediante código; nueva dependencia justificada |
| `joblib` | guardar encoders/objetos auxiliares para reuso entre notebooks | parte de scikit-learn |

`sentence-transformers` **no** se usa en esta spec (los embeddings ya están calculados en
`df_features_titulo.csv`). La serialización del modelo final para la app queda fuera de alcance.

## Diseño anti-leakage / validación

Esta es la parte crítica. Se aplican tres salvaguardas:

### 1. Features de historial: solo el pasado

Función única reutilizable:

```python
def media_acumulada_pasado(serie_binaria):
    # cada fila ve la media de las filas 0..i-1 (nunca a sí misma)
    suma = serie_binaria.cumsum().shift(1)
    cuenta = serie_binaria.notna().cumsum().shift(1)
    return suma / cuenta
```

Se aplica con `groupby(...).transform(media_acumulada_pasado)` después de **ordenar por
`fecha_votacion`** dentro de cada grupo. Las features así calculadas:

- `tasa_afirmativo_hist` — grupo `diputado`
- `tasa_afirmativo_tema_hist` — grupo `[diputado, tema_id]`
- `tasa_alineacion_bloque_hist` — grupo `diputado`
- `tasa_afirmativo_desde_2023` — grupo `diputado`, **filtrando** la ventana a votos con fecha
  ≥ 2023-12-10 y < fecha del voto actual
- `tasa_afirmativo_2026` — grupo `diputado`, ventana a votos con fecha ≥ 2026-01-01 y < fecha
  del voto actual
- `n_votos_hist` — `groupby('diputado').cumcount()` (cuenta filas previas, empieza en 0)

Para `tasa_afirmativo_bloque_tema` (historial del bloque por tema) hay un riesgo sutil: si se
hace `shift(1)` sobre filas individuales, el "anterior" puede ser otro diputado del mismo bloque
votando **el mismo día**. Solución: **agregar primero por día** (`bloque, tema_id, fecha`),
hacer el `shift`/acumulado a nivel de día, y recién después pegar el resultado de vuelta. Así el
shift salta de día a día, no de diputado a diputado.

> Sobre la "alineación con el bloque": el voto mayoritario del bloque en una votación pasada se
> calcula con todos los votos de esa votación (incluido el del propio diputado). Esto **no es
> leakage**: es un hecho consumado del pasado, y se usa solo para filas de fechas posteriores. El
> target del modelo es `voto`, no `alineado_bloque`.

### 2. Relleno de NaN honesto (sin leakage)

Las tasas son NaN cuando no hay historia previa. Cascada de relleno:

1. `tasa_afirmativo_tema_hist` NaN → cae a `tasa_afirmativo_hist`.
2. `tasa_afirmativo_desde_2023` / `tasa_afirmativo_2026` NaN → caen a `tasa_afirmativo_hist`.
3. Cualquier tasa que siga NaN (primerísimos votos, sin ningún pasado) → se rellena con **0.5
   (neutral)**, no con la tasa global del dataset. Usar la media global sería mirar todo el
   dataset (incluido el futuro) → leakage. El 0.5 dice "no hay información, postura neutra", y
   la columna `n_votos_hist` le avisa al modelo cuánta historia respalda cada número.

> Nota sobre `tasa_afirmativo_2026`: para los votos anteriores a 2026 (la mayoría del dataset)
> esta feature cae a la tasa histórica del diputado. Es esperable y correcto; aporta señal real
> sobre todo al predecir votos de 2026 en adelante.

### 3. Validación temporal (nunca aleatoria)

- El `df_entrenamiento.csv` se **ordena por `fecha_votacion`** antes de modelar.
- Partición pasado/futuro: el último ~20% temporal se aparta como **test de evaluación final**
  (futuro). El modelo nunca lo ve durante el entrenamiento.
- Sobre el 80% de entrenamiento se usa `TimeSeriesSplit(n_splits=5)` para la comparación y para
  el tuning. `TimeSeriesSplit` entrena con bloques tempranos y valida con el bloque siguiente —
  siempre pasado→futuro. **Prohibido** `train_test_split`, `KFold` o `shuffle=True`.
- En STG_7, `RandomizedSearchCV(cv=tscv)` recibe ese mismo `TimeSeriesSplit`.

### Chequeo automático de no-leakage

Assert en STG_5: el primer voto cronológico de cada diputado debe tener `tasa_*_hist` en NaN
**antes** del relleno. Si algún valor no es NaN, hay leakage y la notebook frena.

## Pasos de implementación

**STG_5 — `notebooks/STG_5_features_diputado.ipynb`**
1. Cargar `df_modelado.csv` (parse de `fecha_votacion`) y `df_features_titulo.csv`.
2. Merge por `titulo_base` para traer `emb_0..emb_383` (tema_id ya viene en df_modelado).
3. Crear `es_afirmativo` y `alineado_bloque` (voto vs. moda del bloque en esa votación).
4. Ordenar por `[diputado, fecha_votacion]` y calcular las features de historial con
   `media_acumulada_pasado` y las dos ventanas con fecha de corte.
5. Calcular `tasa_afirmativo_bloque_tema` con la agregación por día.
6. Correr el **assert de no-leakage** (primer voto = NaN).
7. Aplicar la cascada de relleno de NaN.
8. Codificar `bloque` y `provincia` con `OrdinalEncoder`; guardar el encoder en `data/`.
9. Guardar `data/df_entrenamiento.csv`. Imprimir verificación: 28.738 filas, sin NaN residual.

**STG_6 — `notebooks/STG_6_modelado.ipynb`**
1. Cargar `df_entrenamiento.csv`, ordenar por `fecha_votacion`.
2. Definir lista de features y target (`voto`). Codificar target con `LabelEncoder`.
3. Separar holdout temporal final (~20%).
4. Definir `TimeSeriesSplit(n_splits=5)` sobre el 80% de entrenamiento.
5. Entrenar y evaluar con CV temporal: `DummyClassifier(strategy='most_frequent')` +
   `LogisticRegression`, `RandomForestClassifier`, `BaggingClassifier`, `XGBClassifier`,
   `LGBMClassifier`. Métrica: **F1-macro** (+ guardar matriz de confusión de cada uno).
6. Tabla comparativa de F1-macro (media ± desvío en CV) y evaluación en el holdout.
7. Elegir ganador por F1-macro. Graficar comparación y matrices de confusión (guardar PNG).
8. Calcular importancia de features del ganador (`feature_importances_` o coeficientes).
   Graficar y guardar PNG. Guardar la tabla de resultados (CSV) para el .docx.

**STG_7 — `notebooks/STG_7_tuning.ipynb`**
1. Cargar `df_entrenamiento.csv`, reconstruir el mismo split temporal y `TimeSeriesSplit`.
2. Definir la grilla de hiperparámetros del modelo ganador.
3. `RandomizedSearchCV(estimator=ganador, cv=tscv, scoring='f1_macro', random_state=42)`.
4. Comparar F1-macro del ganador por defecto vs. afinado (en CV y en holdout). Guardar
   resultados (CSV) y el PNG comparativo para el .docx.

**Documento — `specs/009-modelado-prediccion-votos/generar_informe.py` (o notebook)**
1. Leer las tablas/PNG guardados por STG_6 y STG_7.
2. Con `python-docx` armar el informe: features y qué captura cada una, tabla/gráfico de
   modelos, matriz de confusión del ganador, gráfico de importancia + interpretación política,
   defensa metodológica (validación temporal y F1-macro), y la mejora del tuning.

## Reproducibilidad

- `random_state=42` en todos los modelos, `BaggingClassifier`, `RandomizedSearchCV` y cualquier
  fuente de azar. `TimeSeriesSplit` es determinista (no usa azar).
- Entradas: `data/df_modelado.csv`, `data/df_features_titulo.csv` (no se modifican).
- Salidas nuevas: `data/df_entrenamiento.csv`, encoders en `data/`, PNG/CSV de resultados en la
  carpeta de la spec, y el `.docx`. No se sobrescribe ningún dato crudo.
- Dependencias nuevas (`xgboost`, `lightgbm`, `python-docx`, `matplotlib` si falta) se agregan a
  `requirements.txt`.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Leakage en tasas históricas | `shift(1)` + assert automático de "primer voto = NaN" |
| Leakage del historial de bloque por el mismo día | agregación por día antes del shift |
| Relleno de NaN que mire el futuro | cascada que termina en 0.5 neutro, nunca media global |
| CV aleatoria por descuido | `TimeSeriesSplit` explícito; prohibido `KFold`/`shuffle` |
| Desbalance (ABSTENCIÓN ≈ 3%) | métrica F1-macro + matriz de confusión, no accuracy |
| 384 embeddings dominan o ralentizan | RF/XGBoost/LightGBM los toleran; si hace falta se documenta, no se reduce dimensionalidad en esta spec |
| `xgboost`/`lightgbm` no instalan en Windows/anaconda3 | verificar instalación temprano; si uno falla, se documenta y se reporta antes de seguir |
| Cómputo lento de ventanas por fila | vectorizar con `groupby`/`shift` donde se pueda; aceptar minutos en una corrida única |

---

## Constitution Check

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| **1 — Sin spec, no hay código** | ✅ | spec 009 aprobada antes de este plan |
| **2 — Validación temporal obligatoria** | ✅ | `TimeSeriesSplit` + holdout pasado/futuro; prohibido split aleatorio |
| **3 — Cero data leakage** | ✅ | `shift(1)`, agregación por día para el bloque, relleno neutro 0.5, assert automático |
| **4 — Métrica honesta (F1-macro)** | ✅ | F1-macro como métrica principal + matriz de confusión en cada modelo |
| **5 — Reproducibilidad total** | ✅ | `random_state=42`, dependencias congeladas, salidas con nombre propio, crudos intactos |
| **6 — Trazabilidad y memoria** | ✅ | se registra la decisión en `memoria/DECISIONES.md` |
| **7 — Simple antes que sofisticado** | ✅ | baseline (Dummy + LogReg) primero, luego RF/Bagging/boosting; tuning solo al ganador |
| **8 — El equipo entiende lo que entrega** | ✅ | informe .docx en lenguaje claro + explicación de cada feature y decisión |

**Resultado: el plan PASA el Constitution Check.** No se viola ningún principio.
