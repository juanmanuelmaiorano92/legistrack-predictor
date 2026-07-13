# Plan 010 — API FastAPI para servir datos y predicciones

## Hallazgo previo importante
Antes de plantear la API hay que resolver algo que la spec 009 dejó pendiente a propósito
("Fuera de alcance: serialización del modelo... queda para una spec futura de integración
con la app"): **hoy no existe ningún artefacto guardado del modelo ganador ni del
clustering de temas.** Se verificó el repo:
- `data/` solo tiene `encoder_bloque_provincia.joblib` y `le_voto.joblib` (los encoders de
  columnas fijas y de la etiqueta). El **modelo LGBM entrenado no está guardado en ningún
  lado** — vive solo en memoria dentro de `STG_6_modelado.ipynb`/`STG_7_tuning.ipynb`
  mientras corre la notebook.
- El **KMeans de temas** (K=20, `random_state=42`) tampoco está guardado — se ajusta y se
  descarta dentro de `STG_4_features_titulo.ipynb`.

Sin estos dos artefactos, la API no tiene con qué predecir. Por eso este plan agrega un
paso previo (Notebook `STG_8`) para generar y guardar esos artefactos de forma reproducible,
**sin volver a validar ni re-diseñar el modelo** (eso ya está cerrado y aprobado en la spec
009) — solo se lo serializa.

## Enfoque técnico
1. **`STG_8_serializar_artefactos.ipynb`** (notebook nueva, numerada siguiendo la
   convención del proyecto): genera y guarda en disco todo lo que la API necesita para
   predecir sin tener que re-entrenar nada en cada request:
   - el modelo LGBM ganador,
   - el modelo de clustering de temas (KMeans),
   - una "foto" (snapshot) de las tasas históricas de cada diputado, actualizadas a hoy.
2. **`api/`** (carpeta nueva, backend FastAPI): carga esos artefactos una sola vez al
   arrancar el servidor y los usa para responder cada request en milisegundos, sin volver
   a leer los CSV grandes ni a recalcular nada pesado en cada pedido.
3. **`app/app.py`**: en vez de leer `df_consolidado.csv` con pandas, hace un pedido HTTP
   (`requests.get`/`requests.post`) a la API y muestra la respuesta.

### Por qué un diputado no necesita "recalcular" su historial en cada predicción
Las tasas históricas de un diputado (ej. `tasa_afirmativo_hist`) se calculan, en el
entrenamiento, de forma acumulativa **excluyendo el voto que se está prediciendo** (por eso
llevan `.shift(1)` en `STG_5`). Pero acá no hay ningún voto "actual" que excluir: se está
prediciendo una ley **hipotética, de hoy en adelante**. Eso significa que la tasa histórica
de un diputado para una predicción nueva es simplemente el acumulado de **todos** sus votos
conocidos hasta ahora — el mismo cálculo, sin el `.shift(1)`. Por eso alcanza con calcular
esa "foto" una vez (en `STG_8`) y reusarla, en vez de recalcular el historial completo en
cada pedido a la API.

## Librerías y herramientas
- **FastAPI** + **uvicorn**: servidor de la API. Es el estándar pedido por el checklist y
  tiene documentación automática (`/docs`), útil para que el equipo pruebe los endpoints
  sin herramientas extra.
- **Pydantic** (ya viene con FastAPI): valida las entradas (ej. que el título no esté vacío)
  y define la forma de las respuestas.
- **joblib**: ya se usa en el proyecto para los encoders; se reutiliza para guardar/cargar
  el modelo LGBM y el KMeans.
- **sentence-transformers**: ya se usa en `STG_4`; se reutiliza en la API para generar el
  embedding de un título nuevo (se carga en memoria una sola vez al iniciar la API, no en
  cada request, porque cargar el modelo es lento).
- **requests**: para que `app/app.py` le hable a la API por HTTP.
- **lightgbm**, **scikit-learn**: ya están en `requirements.txt`, se necesitan para
  deserializar y ejecutar el modelo y el KMeans.
No se agrega ninguna librería de base de datos, autenticación ni deploy (fuera de alcance
de esta spec).

## Diseño anti-leakage / validación
Esta spec **no entrena ni valida un modelo nuevo** — reutiliza el modelo y la metodología
ya validados y aprobados en la spec 009 (`TimeSeriesSplit`, holdout temporal, F1-macro).
Los puntos donde igual hay que cuidar el principio de "cero leakage":

- **Refit final para producción**: `STG_8` vuelve a ajustar el LGBM ganador con los
  mismos hiperparámetros por defecto que ganaron en `STG_6` (STG_7 confirmó que el tuning
  no mejora), pero esta vez sobre **todo** el dataset (train + holdout combinados), porque
  ya no se está evaluando — se está preparando el modelo que va a predecir votos reales de
  ahora en más, y conviene que aproveche toda la información disponible. Esto **no es
  leakage**: leakage es usar información del futuro para evaluar; acá no hay ninguna
  evaluación nueva, solo se reentrena con la config ya validada. Como chequeo de
  seguridad, `STG_8` recalcula el F1-macro en el mismo holdout de `STG_6` con el modelo
  final y verifica que sea igual o mejor a 0.453 (el valor ya documentado) — si empeorara,
  es señal de que algo se rompió al serializar y hay que frenar.
- **KMeans de temas**: se vuelve a ajustar con **los mismos parámetros** (`n_clusters=20`,
  `random_state=42`, `n_init=10`) sobre los mismos embeddings de `STG_4` — es determinista,
  así que da exactamente el mismo resultado, solo que esta vez se guarda. Para un título
  nuevo, la API usa `kmeans.predict()` (nunca `.fit()`) para asignarle el cluster más
  cercano, sin tocar los clusters existentes.
- **Snapshot de features del diputado**: se calcula como acumulado de **toda** la historia
  conocida (sin excluir ningún voto), lo cual es correcto porque no hay ningún voto
  "presente" que deba excluirse — la predicción es sobre un voto futuro/hipotético. Se
  documenta explícitamente que esta tabla hay que **regenerarla** (volver a correr `STG_8`)
  si se actualiza `df_entrenamiento.csv` con votos más recientes; si no, la predicción usa
  historial desactualizado (no es leakage, pero sí un dato stale a tener en cuenta).
- **NaN**: se mantiene la misma cascada de relleno que ya se validó en la spec 009
  (tema → histórico del diputado → 0.5 neutro), aplicada de la misma forma al construir el
  vector de features de una predicción nueva.

## Pasos de implementación

### Parte A — Serializar artefactos (una sola vez, notebook)
1. Crear `notebooks/STG_8_serializar_artefactos.ipynb`.
2. Cargar `data/df_entrenamiento.csv` y reconstruir el LGBM ganador con los hiperparámetros
   de `STG_6` (los mismos, sin tuning). Entrenarlo sobre el dataset completo (train+holdout).
   Guardar como `data/modelo_lgbm.joblib`.
3. Sanity check: recalcular F1-macro en el holdout de `STG_6` con este modelo final y
   comparar contra el 0.453 documentado. Si difiere significativamente, frenar e investigar
   antes de seguir.
4. Reconstruir el KMeans de `STG_4` (`n_clusters=20, random_state=42, n_init=10`) sobre los
   mismos embeddings. Guardar como `data/kmeans_temas.joblib`. Guardar también el diccionario
   `tema_id → tema_label` (incluyendo `GRUPOS_SIN_TEMA = {11}` → `sin_clasificar`) como
   `data/mapa_temas.json`.
5. Calcular las tablas snapshot (acumulado total, sin shift, hasta la fecha más reciente del
   dataset):
   - `data/snapshot_diputado.csv`: por diputado — `tasa_afirmativo_hist`,
     `tasa_alineacion_bloque_hist`, `tasa_afirmativo_desde_2023`, `tasa_afirmativo_2026`,
     `n_votos_hist`, `bloque`, `provincia`, `bloque_enc`, `provincia_enc`.
   - `data/snapshot_diputado_tema.csv`: por (diputado, tema_id) — `tasa_afirmativo_tema_hist`.
   - `data/snapshot_bloque_tema.csv`: por (bloque, tema_id) — `tasa_afirmativo_bloque_tema`.
6. Documentar en la notebook, en lenguaje claro, qué hace cada celda y por qué el refit
   final no viola la Constitución (para que el equipo lo pueda explicar en la defensa).

### Parte B — API FastAPI
7. Crear la carpeta `api/` con:
   - `api/main.py`: arranca la app FastAPI, incluye los routers, y carga **una sola vez**
     al iniciar (no en cada request): el modelo LGBM, el KMeans, los encoders, las tablas
     snapshot y el modelo de `sentence-transformers`.
   - `api/schemas.py`: esquemas Pydantic — `DiputadoHistorial` (respuesta de
     `/diputados/{id}`), `PrediccionRequest` (título de ley, valida que no esté vacío) y
     `PrediccionResponse` (lista de 257 predicciones diputado→voto).
   - `api/database.py`: funciones que leen `df_consolidado.csv` y las tablas snapshot
     (por ahora sigue siendo CSV, no una base de datos real — ver "Fuera de alcance" en
     `spec.md`).
   - `api/modelo.py`: la función `construir_features(titulo: str) -> DataFrame`, aislada en
     un solo lugar (según lo acordado con el usuario), que arma el vector de 394 features
     para los 257 diputados a partir de un título nuevo. Si en el futuro se agrega una
     feature al modelo, esta es la única función que hay que tocar además del reentrenamiento.
   - `api/routers/diputados.py`: define `GET /diputados/{id}`.
   - `api/routers/predecir.py`: define `POST /predecir`.
8. Probar la API localmente con `uvicorn api.main:app --reload` y verificar `/docs`.

### Parte C — Conectar Streamlit a la API
9. Modificar `app/app.py`: reemplazar la lectura directa de `df_consolidado.csv` por un
   `requests.get` a `/diputados/{id}` para el historial, y agregar el formulario de
   predicción que llama a `POST /predecir` y muestra el resultado para los 257 diputados
   (tabla, no gráfico — se mantiene el diseño minimalista ya elegido para la app).
10. Actualizar `requirements.txt` con las librerías nuevas (`fastapi`, `uvicorn`, `requests`,
    y confirmar que `lightgbm`, `scikit-learn`, `sentence-transformers`, `joblib` ya estén).

## Reproducibilidad
- `random_state=42` fijo en el refit del LGBM (mismos hiperparámetros de `STG_6`) y en el
  KMeans (igual que `STG_4`).
- `STG_8` lee `data/df_entrenamiento.csv` (entrada) y escribe artefactos con nombre propio
  (`modelo_lgbm.joblib`, `kmeans_temas.joblib`, `mapa_temas.json`, tres CSV de snapshot) —
  no sobrescribe ningún dato crudo ni ningún artefacto de etapas anteriores.
- La API no reentrena nada: solo carga artefactos ya fijados. Correr la API dos veces con
  el mismo título de ley da siempre la misma predicción.
- `requirements.txt` se actualiza con versiones ya usadas en el proyecto donde aplica.

## Riesgos y cómo se mitigan
- **El refit final da un modelo distinto al documentado en el informe**: se mitiga con el
  sanity check del paso 3 (comparar F1-macro contra 0.453). Si no coincide, no se sigue
  hasta entender por qué.
- **Cargar `sentence-transformers` es lento**: se mitiga cargándolo una sola vez al iniciar
  la API (`api/main.py`), no en cada request. El primer arranque de la API puede tardar unos
  segundos; los requests posteriores son rápidos.
- **Snapshot desactualizado**: si el dataset de votos se actualiza y no se vuelve a correr
  `STG_8`, la predicción usa historial viejo. Se documenta en el README de `api/` que hay
  que re-correr `STG_8` cada vez que cambie `df_entrenamiento.csv`. No se automatiza en esta
  spec (sería sofisticar de más para un MVP — Principio 7).
- **Título nuevo cae lejos de todos los clusters existentes**: el KMeans igual asigna el
  cluster más cercano (no hay "sin cluster" posible), así que no rompe, pero la calidad de
  esa predicción puede ser menor. Se documenta como limitación conocida, no se resuelve acá.

---

## Constitution Check

| Principio | Cumple | Cómo |
|---|---|---|
| 1. Sin spec no hay código | ✅ | `spec.md` de la 010 ya aprobado antes de este plan. |
| 2. Validación temporal | ✅ | No se re-valida ni re-diseña el modelo; se reutiliza la validación temporal ya hecha y aprobada en la spec 009. El refit final para producción no es una evaluación nueva. |
| 3. Cero data leakage | ✅ | El snapshot de historial usa todos los votos conocidos porque no hay voto "actual" que excluir (se predice a futuro). El KMeans solo predice (`.predict`), nunca se reajusta con el título nuevo. |
| 4. F1-macro | ✅ (heredado) | La métrica oficial del modelo (0.453 holdout) es la de la spec 009; el sanity check del paso 3 la usa como referencia para validar el refit. |
| 5. Reproducibilidad | ✅ | `random_state=42` en LGBM y KMeans; artefactos con nombre propio; `requirements.txt` actualizado. |
| 6. Trazabilidad y memoria | ✅ | Este plan se registra en `memoria/DECISIONES.md` al aprobarse. |
| 7. Simple antes que sofisticado | ✅ | Se descartó explícitamente DB real, auth y deploy para esta spec (ver "Fuera de alcance" en `spec.md`). El snapshot es la solución más simple que evita recalcular todo el historial en cada request. |
| 8. El equipo entiende lo que entrega | ✅ | `STG_8` documenta en lenguaje claro por qué el refit final no es trampa; este plan explica el mismo punto para la defensa del TP. |

**Resultado: el plan pasa el Constitution Check.**
