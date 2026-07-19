# Plan 014 — Modelo con autoría servido en la API y selector de autor en la app

## Enfoque técnico

La idea general: repetir el camino que ya funcionó en la spec 010 (notebook que serializa →
API que carga → app que consume), pero con el modelo de la spec 013 y un ingrediente nuevo:
el autor del proyecto hipotético. Se divide en tres frentes:

1. **Un notebook nuevo, `STG_8.2_serializar_artefactos_autor.ipynb`** (numeración decimal:
   es la versión "con autoría" de STG_8, y debe correr después de STG_5.3/6.2/7.2). Deja en
   `data/` todo lo que la API necesita, con nombres nuevos terminados en `_autor` — no pisa
   ningún archivo de las specs 009/010.
2. **La API** (`api/`) pasa a cargar esos artefactos nuevos y a exigir el autor en
   `/predecir`. Toda la lógica de armado del vector de features sigue viviendo en **una sola
   función** (`construir_features`), como quedó establecido en la spec 010 — solo que ahora
   recibe `(titulo, autor)`.
3. **La app** (`app/app.py`) suma el selector de autor al formulario de predicción (dentro
   del `st.form` existente) y muestra autor y bloque asignado en el resultado.

### Hechos verificados sobre los datos (ground truth, medidos en esta sesión)

Estos hechos sostienen las decisiones del plan; se citan en los pasos correspondientes:

- **`data/diputados_actuales.csv` es la fuente del bloque vigente**: tiene exactamente 257
  filas con columnas `Apellido`, `Nombre`, `Distrito`, `Bloque`. Es la nómina oficial que ya
  se usó para filtrar el histórico en las primeras etapas del proyecto.
- **El match nómina oficial ↔ dataset da 256/257** con la normalización estándar del
  proyecto (sin tildes, mayúsculas, espacios colapsados). El único fallo es
  `Alí, Ernesto "Pipi"`: el dataset lo escribe `ALI, ERNESTO "PIPI"` y la nómina tiene las
  comillas rotas (`Ernesto Pipi""`). **Quitando los caracteres de comillas en la
  normalización, matchean los 257.**
- **Los duplicados 259→257 son exactamente 2**: OSUNA, Blanca Inés y PICHETTO, Miguel Angel,
  cada uno con dos grafías. La fila "vieja" de cada uno arrastra bloque y provincia
  desactualizados (Osuna: Frente para la Victoria - PJ; Pichetto: Justicialista / Río Negro).
- **Después de unificar grafías, el bloque del último voto coincide con el bloque oficial de
  `diputados_actuales.csv` para los 257** (se midió: las únicas 2 discrepancias eran las
  filas viejas de los duplicados). Esto permite usar una sola noción de "bloque actual" sin
  contradicciones.
- **El encoder de `bloque_autor` (spec 013) tiene 51 categorías y fue creado con
  `handle_unknown='use_encoded_value', unknown_value=-1`**: un bloque que nunca vio lo
  codifica como -1 sin tirar error. Importa porque **48 de los 257 diputados actuales
  pertenecen a 14 bloques que nunca aparecieron como autores en el entrenamiento** (el más
  grande: Provincias Unidas, 18 diputados).
- **El orden de features del Escenario A no es el orden natural de las columnas del CSV**:
  STG_6.2 define `FEATURES_A = FEATURES_COMUNES + ["es_oficialista", "coincide_bloque_autor"]`
  — las dos features del escenario van **al final** de la lista (398 features en total). Si la
  API reconstruyera el orden leyendo el encabezado del CSV, pondría esas columnas en otro
  lugar y el modelo predeciría mal **en silencio**. Por eso el orden se serializa como
  artefacto.
- **El modelo ganador exacto**: `LGBMClassifier(class_weight='balanced', random_state=42,
  n_jobs=-1, verbosity=-1)` — hiperparámetros por defecto más el balanceo de clases, tal
  cual se instanció en STG_6.2.

### Artefactos que produce STG_8.2 (todos nuevos)

| Archivo | Contenido |
|---|---|
| `data/modelo_lgbm_autor.joblib` | LGBM ganador reentrenado con todas las filas (train + holdout) |
| `data/orden_features_autor.json` | Lista ordenada de las 398 features del Escenario A |
| `data/nomina_diputados.csv` | Los 257: nombre canónico, clave normalizada, grafías históricas, bloque actual, provincia |
| `data/snapshot_diputado_autor.csv` | Tasas históricas por diputado (257 filas, historial de grafías combinado) |
| `data/snapshot_diputado_tema_autor.csv` | Tasas por diputado × tema |
| `data/snapshot_bloque_tema_autor.csv` | Tasas por bloque × tema |

**Se reutilizan sin cambios** (no hace falta regenerarlos): `kmeans_temas.joblib` y
`mapa_temas.json` (los temas no cambiaron), y los tres artefactos que la spec 013 ya dejó
serializados: `le_voto_autor.joblib`, `encoder_bloque_autor.joblib`,
`encoder_bloque_provincia_autor.joblib`.

### Cómo se arman las features de autoría en la predicción

Para un proyecto hipotético con autor elegido:

- **Autor = un diputado**: `bloque_autor` = su bloque actual (de `nomina_diputados.csv`,
  normalizado con la misma convención que usó STG_5.3); `es_poder_ejecutivo` = 0;
  `es_oficialista` = 1 solo si su bloque está en los `bloques_integrantes` de la coalición
  gobernante vigente (Escenario A: hoy solo "La Libertad Avanza" — el PRO queda afuera).
- **Autor = Poder Ejecutivo Nacional**: `bloque_autor` = la coalición gobernante vigente;
  `es_poder_ejecutivo` = 1; `es_oficialista` = 1.
- **Coalición gobernante vigente**: se deriva de `tabla_periodos_presidenciales.csv` buscando
  el período que contiene la fecha de hoy (no se hardcodea "La Libertad Avanza"). Si la fecha
  cae fuera de todos los períodos (la tabla llega a 2027), se usa el período más reciente y
  se registra una advertencia en el log.
- **`coincide_bloque_autor`**: se calcula **por votante** — 1 si el bloque actual del
  diputado votante (normalizado) es igual al `bloque_autor`, 0 si no. Nota: esta comparación
  es entre textos de bloque, así que funciona aunque el bloque no esté entre las 51
  categorías del encoder.
- **`bloque_autor_enc`**: el texto del bloque pasa por `encoder_bloque_autor`. Si el bloque
  nunca fue autor en el entrenamiento (los 14 bloques / 48 diputados medidos), el encoder
  devuelve **-1** — comportamiento previsto del artefacto, no un error. En ese caso el
  modelo no reconoce el bloque puntual, pero las otras tres features de autoría (que se
  calculan por texto, no por código) siguen aportando la señal política real. Esto queda
  documentado en el código y en el notebook para que el equipo pueda explicarlo.

## Librerías y herramientas

**Ninguna librería nueva.** Todo lo necesario ya está en `requirements.txt`: pandas, numpy,
scikit-learn, lightgbm, joblib, sentence-transformers, fastapi, uvicorn, pydantic, streamlit,
requests. El notebook corre con el mismo Python de anaconda3 usado en todo el proyecto.

## Diseño anti-leakage / validación

- **Esta spec no entrena ni evalúa nada nuevo desde cero**: reentrena el ganador ya elegido
  en la spec 013 con sus mismos hiperparámetros, sobre todas las filas disponibles. Es el
  mismo criterio que STG_8 (spec 010): para predecir leyes futuras se usa todo el
  conocimiento disponible hasta hoy.
- **La métrica oficial sigue siendo F1-macro = 0.581** (holdout temporal genuino de
  STG_6.2). El chequeo de sanidad del modelo reentrenado (predicción sobre filas conocidas)
  se documenta explícitamente como NO-métrica: el modelo ya vio esas filas.
- **Snapshots acumulados sin `.shift(1)`**: las tasas históricas por diputado/bloque/tema se
  acumulan hasta hoy inclusive, sin excluir ningún voto. No es leakage porque al predecir
  una ley futura no existe ningún "voto actual" que haya que descartar — mismo razonamiento
  ya documentado y aceptado en STG_8 (T5, spec 010). Se calculan sobre
  `df_modelado_autor.csv` (todos los años, sin AUSENTE), la misma base poblacional que usó
  STG_5.3 para las features de entrenamiento.
- **Validación temporal**: no aplica una nueva — no se comparan modelos ni se eligen
  hiperparámetros en esta spec.

## Pasos de implementación

**Parte A — Notebook `STG_8.2_serializar_artefactos_autor.ipynb`:**

1. **Nómina canónica**: leer `diputados_actuales.csv`, armar el nombre `APELLIDO, Nombre`,
   normalizar (tildes, mayúsculas, espacios **y quitando comillas** — la extensión que
   resuelve el caso Alí) y matchear contra los nombres del dataset. `assert` de 257/257
   matcheados. El nombre canónico de cada diputado es la grafía de su voto más reciente en
   el dataset. Exportar `nomina_diputados.csv` con las grafías históricas que absorbe cada
   canónico (para Osuna y Pichetto serán dos).
2. **Snapshots con historial combinado**: recalcular las tres tablas snapshot desde
   `df_modelado_autor.csv` (sin AUSENTE, todos los años), reemplazando cada grafía por su
   nombre canónico ANTES de agrupar — así los votos de las dos grafías de Osuna/Pichetto
   cuentan juntos. `assert`: 257 filas; para Osuna y Pichetto, `n_votos_hist` = suma de los
   conteos que antes estaban repartidos entre sus dos grafías.
3. **Bloque y provincia actuales**: tomar el bloque/provincia del voto más reciente de cada
   canónico y verificar con `assert` que coincide (normalizado) con el `Bloque` oficial de
   `diputados_actuales.csv` para los 257 (hoy se cumple; si un día deja de cumplirse, el
   assert lista los casos para decidir a mano). Codificar con
   `encoder_bloque_provincia_autor` (el de la spec 013).
4. **Orden de features**: reconstruir `FEATURES_A` con la misma expresión de STG_6.2
   (comunes + las 2 del escenario al final) y guardarlo como `orden_features_autor.json`.
   `assert`: son 398 y coinciden una a una con las columnas usadas al entrenar.
5. **Reentrenar y serializar el modelo**: `LGBMClassifier(class_weight='balanced',
   random_state=42, n_jobs=-1, verbosity=-1)` entrenado con TODAS las filas de
   `df_entrenamiento_autor.csv` (features del Escenario A, target codificado con
   `le_voto_autor`). Guardar `modelo_lgbm_autor.joblib`.
6. **Chequeo de sanidad**: predecir sobre una muestra de filas conocidas y verificar
   coherencia (sin exigir un número), dejando escrito que la métrica oficial es 0.581 y que
   cualquier medición sobre datos ya vistos no vale como evaluación.
7. **Reproducibilidad**: correr el notebook dos veces y verificar que los 6 artefactos salen
   idénticos byte a byte.

**Parte B — API:**

8. **`api/database.py`**: cargar `nomina_diputados.csv`; `GET /diputados` responde los 257
   canónicos; el historial de un diputado filtra `df_consolidado` por **todas sus grafías**
   (vía la clave normalizada), así el historial de Osuna/Pichetto sale completo. Bloque y
   provincia mostrados: los actuales de la nómina.
9. **`api/schemas.py`**: `PrediccionRequest` pasa a `{titulo, autor}` con autor obligatorio;
   la respuesta suma `autor` y `bloque_autor` asignado. Autor inválido (no es uno de los 257
   ni "Poder Ejecutivo Nacional") → error 422 con mensaje claro que liste el valor recibido.
10. **`api/modelo.py`**: `construir_features(titulo, autor)` — sigue siendo la única función
    que arma el vector. Carga los artefactos `_autor`, arma las 4 features de autoría según
    la sección de diseño, mantiene la cascada de relleno de NaN (tema → tasa individual →
    0.5 neutro) y el casteo a `float64` de los embeddings (bug conocido de la spec 010). El
    orden de columnas sale de `orden_features_autor.json`, no del encabezado de un CSV.
11. **`api/routers/predecir.py` y `api/main.py`**: propagar el campo autor, actualizar la
    precarga (`precargar_artefactos`) a los artefactos nuevos, y verificar que `/predecir`
    devuelve exactamente 257 predicciones.

**Parte C — App y verificación de punta a punta:**

12. **`app/app.py`**: dentro del `st.form` de predicción, agregar `st.selectbox` de autor con
    258 opciones — "Poder Ejecutivo Nacional" primero y los 257 diputados como
    "APELLIDO, Nombre (Bloque actual)" ordenados alfabéticamente, obtenidos de
    `GET /diputados`. El resultado muestra el autor elegido y el bloque que se le asignó.
13. **Verificación integral**: levantar API + app reales; probar (a) autor = PEN → bloque La
    Libertad Avanza, (b) autor = diputado de LLA → oficialista sí, (c) autor = diputado del
    PRO → oficialista no (definición oficial Escenario A), (d) autor de un bloque X → los
    votantes de X tienen coincide=1 y el resto 0, (e) autor de un bloque no visto por el
    encoder (ej. Provincias Unidas) → predicción funciona y se registra el caso, (f) mismo
    título+autor dos veces → misma predicción, (g) historial de Pichetto → una sola entrada
    con historial completo. Cerrar marcando los criterios de aceptación de la spec.

## Reproducibilidad

- **Semillas**: `random_state=42` en el LGBM (única fuente de azar; los snapshots y la nómina
  son agregaciones deterministas).
- **Entradas**: `df_entrenamiento_autor.csv`, `df_modelado_autor.csv`,
  `diputados_actuales.csv`, `tabla_periodos_presidenciales.csv`, `df_features_titulo.csv` +
  artefactos ya serializados de las specs 010/013.
- **Salidas**: los 6 artefactos de la tabla, todos con nombre nuevo — nada de las specs
  009/010/013 se modifica ni se borra. Verificación de doble corrida idéntica (paso 7).

## Riesgos y cómo se mitigan

| Riesgo (de la spec) | Mitigación en este plan |
|---|---|
| Bloque actual desconocido para el encoder (48 diputados / 14 bloques, **medido**) | Comportamiento previsto del artefacto (`unknown_value=-1`), documentado en código y notebook; las features por texto (`coincide`, `es_oficialista`, `es_poder_ejecutivo`) conservan la señal; caso probado explícitamente en la verificación (paso 13e) |
| Fuente del bloque vigente | `diputados_actuales.csv` (nómina oficial, 257 filas con `Bloque`); verificado que coincide con el bloque del último voto para los 257 tras unificar grafías; `assert` permanente por si diverge en el futuro (paso 3) |
| Cambio incompatible de `/predecir` | API y app se actualizan en la misma spec y se prueban juntas de punta a punta (paso 13); no hay clientes externos |
| Fusión de duplicados perdiendo historial | Los snapshots se recalculan desde las filas de votos con el nombre ya canonizado — no se elige una fila ni se promedian tasas; `assert` de suma de votos (paso 2) |
| Desalineación silenciosa de columnas entrenamiento–predicción | `orden_features_autor.json` serializado desde la MISMA expresión que usó STG_6.2 (con las 2 features del escenario al final), con `assert` de 398 y de igualdad una a una (paso 4); embeddings casteados a `float64` |
| Coalición gobernante hardcodeada | Derivada de `tabla_periodos_presidenciales.csv` por fecha del día; fallback al período más reciente con advertencia en log |
| Caso Alí (comillas rotas en la nómina) | La normalización de nombres quita caracteres de comillas; `assert` de match 257/257 (paso 1) |
| Predicción degradada sin aviso | Chequeo de sanidad post-serialización (paso 6) + verificación funcional con casos concretos (paso 13) |

## Constitution Check

- **P1 (sin spec no hay código)**: la spec 014 está aprobada por el usuario. ✅
- **P2 (validación temporal)**: no se entrena/compara nada nuevo; la única métrica citada
  (0.581) proviene del holdout temporal de STG_6.2. No se introduce ningún split aleatorio. ✅
- **P3 (cero leakage)**: snapshots acumulados hasta hoy sin `.shift` — justificado (no hay
  voto "actual" que excluir al predecir una ley futura, mismo criterio aceptado en STG_8);
  el vector de predicción replica las convenciones del entrenamiento. ✅
- **P4 (métrica honesta)**: no se reporta ninguna métrica nueva; el chequeo de sanidad queda
  documentado como no-métrica y la oficial sigue siendo F1-macro 0.581. ✅
- **P5 (reproducibilidad)**: `random_state=42`, artefactos con nombres nuevos, nada se
  sobrescribe, doble corrida verificada, sin dependencias nuevas. ✅
- **P6 (trazabilidad)**: este plan queda en `specs/014-.../plan.md` y la decisión principal
  se registra en `memoria/DECISIONES.md`; los hechos medidos quedan citados. ✅
- **P7 (simple antes que sofisticado)**: cero librerías nuevas; se reusa el patrón completo
  de la spec 010 (notebook serializador → API → app) y los encoders ya serializados de la
  013; la única pieza nueva de verdad es la nómina canónica y las features de autor en
  `construir_features`. ✅
- **P8 (el equipo entiende lo que entrega)**: cada decisión no obvia (encoder -1, orden de
  features serializado, snapshots sin shift, fusión de duplicados) queda explicada en el
  notebook y en este plan en lenguaje claro. ✅

**Resultado: los 8 principios se cumplen. El plan puede pasar a `/tareas`.**
