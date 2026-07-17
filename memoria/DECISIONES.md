# DECISIONES — LegisTrack

Bitácora de decisiones técnicas, bugs resueltos y convenciones del proyecto.
Es la **memoria** del proyecto: reemplaza a una herramienta de memoria automática.

**Cómo se usa:**
- Al **empezar** una sesión, Claude lee este archivo para recuperar contexto.
- Durante el trabajo, se agregan entradas con `/recordar` o automáticamente.
- Las entradas se **agregan al final**; no se borra lo anterior.

Formato de cada entrada:

```
### [AAAA-MM-DD] — Título corto
- **Tipo**: decisión | bug | convención
- **Qué**: ...
- **Por qué / causa raíz**: ...
- **Impacto**: ...
```

---

## Historial

### [2026-01] — Match de diputados por nombre normalizado
- **Tipo**: decisión
- **Qué**: para filtrar el histórico a la nómina actual, se hace match por nombre
  normalizado (sin tildes, mayúsculas, espacios colapsados) en vez de match exacto.
- **Por qué**: el match exacto fallaba por tildes y formato; el normalizado dio 257/257
  diputados actuales sin necesidad de fuzzy matching.
- **Impacto**: notebook de filtrado; columna auxiliar `diputado_norm`.

### [2026-01] — Descarte del autor como feature automatizada
- **Tipo**: decisión
- **Qué**: se abandonó el join con el dataset de proyectos para traer el "autor".
- **Por qué**: cobertura baja (31%) y colapso en el período 2020-2026; no es confiable como
  feature. Se completará a mano solo el remanente si se decide usarlo.
- **Impacto**: ingeniería de features; el autor no es feature por defecto.

### [2026-01] — Agrupamiento de votaciones por artículo en titulo_base
- **Tipo**: bug
- **Qué**: votaciones del mismo proyecto aparecían separadas por artículo/capítulo/título.
- **Por qué / causa raíz**: la función `extraer_titulo_base` solo cortaba sufijos abreviados
  (`ART.`) y con separador guión. No capturaba "Artículo" completo en español, separadores
  `.`/`*`/`--`, referencias en el medio (`* Artículo N. texto`), `ARTS. N AL M` ni el sufijo
  `Dictamen de Mayoría/Minoría`. Se reescribió la función para cubrir esos casos de forma
  iterativa.
- **Impacto**: STG_2 (transformación); reduce títulos canónicos y agrupa bien los votos.

### [2026-01] — Voto en empate de artículos → ABSTENCIÓN
- **Tipo**: bug
- **Qué**: cuando un diputado vota la misma cantidad a favor y en contra por artículo (sin
  votación en general), `moda_voto` asignaba AFIRMATIVO.
- **Por qué / causa raíz**: ante empate, `Series.mode()` devuelve los valores empatados en
  orden alfabético y el código tomaba `iloc[0]`, así que AFIRMATIVO ganaba por orden, no por
  representatividad. Se corrigió para devolver ABSTENCIÓN ante empate real.
- **Impacto**: STG_2 (consolidación de votos).

### [2026-01] — Detección de "voto en general" sobre el título original
- **Tipo**: convención
- **Qué**: el flag `es_voto_general` se calcula sobre `titulo_proyecto` (original), no sobre
  `titulo_base` (ya limpio).
- **Por qué**: la limpieza de `titulo_base` borra justamente las marcas de "En General"; hay
  que detectarlas antes de limpiar. Mantener este orden evita romper la consolidación.
- **Impacto**: STG_2; orden de operaciones en la consolidación.

### [2026-06-07] — Diseño del flujo de predicción (feature futura)
- **Tipo**: decisión
- **Qué**: el predictor no será "diputado + proyecto → un voto", sino "texto de ley + autor → cómo vota cada uno de los 257 diputados".
- **Por qué**: la utilidad real es ver el panorama completo de votación para una ley hipotética, no consultar diputado por diputado.
- **Impacto**: la spec de la feature de predicción (futura) debe diseñarse con esta salida masiva en mente. El selector de diputado de la app v1 es solo para explorar historial; no es el flujo del predictor.

### [2026-06-07] — App Streamlit v1 (spec 001)
- **Tipo**: decisión
- **Qué**: se construyó la primera versión de la app con Streamlit. Muestra historial de votaciones por diputado (bloque, provincia, conteo de votos, últimas 10 votaciones) y un placeholder de predicción.
- **Por qué**: tener algo funcional para presentar antes de que el modelo esté listo.
- **Impacto**: archivos creados: `app/app.py`, `requirements.txt`, `data/df_consolidado.csv` (6.6 MB, 39.972 filas). Se ajustó `.gitignore` para permitir commitear el CSV.

### [2026-06-07] — Detalle técnico de la App Streamlit v1
- **Tipo**: decisión
- **Qué**: la app se construyó en `app/app.py` (44 líneas, solo pandas + streamlit estándar). Flujo: carga el CSV con `@st.cache_data`, muestra selector de diputado, al presionar "Consultar" filtra el dataframe y muestra bloque, provincia, conteo de votos y tabla de últimas 10 votaciones ordenadas por fecha. Placeholder de predicción al final.
- **Por qué**: diseño minimalista elegido por el equipo — sin CSS, sin gráficos externos, solo componentes nativos de Streamlit.
- **Impacto**: archivos del proyecto: `app/app.py`, `data/df_consolidado.csv`, `requirements.txt` (pandas + streamlit sin versión fija, para compatibilidad con Python 3.14 de Streamlit Cloud). `.gitignore` modificado: usa `data/*` + `!data/df_consolidado.csv` en vez de `data/` para permitir commitear el CSV procesado. Se configuró Git LFS para los CSV grandes (>100 MB) con `git lfs migrate import --include="*.csv" --everything`.

### [2026-06-07] — Problema de versiones en Streamlit Cloud (Python 3.14)
- **Tipo**: bug
- **Qué**: el deploy inicial fallaba porque `pillow==10.4.0` (dependencia de `streamlit==1.35.0`) no tiene wheel precompilado para Python 3.14 y requería compilar desde fuente, lo que fallaba por falta de `zlib`.
- **Por qué / causa raíz**: Streamlit Cloud usa Python 3.14 (muy nuevo). Las versiones fijas de pandas y streamlit no tienen wheels para esa versión. Al intentar compilar desde fuente, falta la librería del sistema `zlib`.
- **Impacto**: se resolvió sacando las versiones fijas de `requirements.txt` (quedó solo `pandas` y `streamlit` sin versión). Esto permite que Streamlit Cloud elija las versiones más recientes que ya tienen wheels para Python 3.14.

<!-- Nuevas entradas debajo de esta línea -->

### [2026-06-16] — Spec 008: fondo visual difuminado en la app (COMPLETA)
- **Tipo**: decisión
- **Qué**: fondo visual en la app Streamlit con tres fotos del Congreso (congreso3.jpg izquierda, exterior centro, interior recinto derecha) combinadas en un canvas fijo 1920×900px. Proporciones: costados 25% cada uno, centro 50%. Blur gaussiano radio 2, brillo 60%. El CSS usa `background-size: 100% auto` para mostrar la imagen completa sin recortes, con panel frosted-glass sobre el contenido para legibilidad.
- **Por qué**: la app tenía fondo blanco sin identidad visual. Para la demo y presentación del TP se quiere un aspecto institucional.
- **Bug resuelto durante implementación**: el degradado de fusión entre imágenes estaba invertido (`linspace(255,0)` en lugar de `linspace(0,255)`), lo que causaba artefactos visibles en las uniones. Causa raíz: en PIL `paste(src, pos, mask)`, mask=255 muestra `src` y mask=0 deja el canvas — la máscara para `der` debe ir de 0 (transparente al inicio del seam) a 255 (opaco al final).
- **Bug resuelto**: Pillow 12 en Anaconda/Windows no tiene `libavif` compilado. Solución: convertir el AVIF a JPG manualmente con la app Fotos de Windows.
- **Impacto**: archivos nuevos: `app/generar_fondo.py`, `app/assets/fondo_combinado.jpg`, `app/assets/congreso3.jpg`. Archivos modificados: `app/app.py`, `requirements.txt`.

### [2026-06-09] — Spec 007: todos los archivos de datos disponibles en GitHub vía Git LFS
- **Tipo**: decisión
- **Qué**: se subieron todos los archivos de `data/` a GitHub. Los 6 CSV usan Git LFS (ya configurado en `.gitattributes` con `*.csv filter=lfs`). `titulos_autor.xlsx` y `data/README.md` van por Git normal. `.gitignore` actualizado: se eliminó el bloqueo `data/*` y solo quedan ignorados `.sav`, `.env` y archivos temporales de Python.
- **Por qué**: los archivos solo existían en la computadora de quien los generó. Cualquier integrante que clonara el repo no podía correr los notebooks.
- **Impacto**: archivos ahora en GitHub: `diputados_actuales.csv` (22 KB), `votaciones_filtrado.csv` (17.6 MB), `df_consolidado.csv` (7 MB, ya estaba), `df_modelado.csv` (6 MB), `df_features_titulo.csv` (4.7 MB), `proyectos_parlamentarios2.1.csv` (33 MB), `hcdn_votaciones_historico.csv` (140 MB, LFS), `titulos_autor.xlsx` (90 KB). Total subido a LFS: 201 MB. **Nota para el equipo**: Git LFS debe estar instalado antes de clonar (`git lfs install` + `git lfs pull`).

### [2026-06-09] — Spec 006: búsqueda de autor movida a STG 3
- **Tipo**: decisión
- **Qué**: la lógica de asignación de autor de proyecto (match determinístico por expediente + fuzzy TF-IDF) fue movida de STG 2 a STG 3. STG 2 quedó exclusivamente para la consolidación de votos. STG 3 ahora produce `df_modelado.csv` con las columnas `autor_final`, `camara_origen`, `fuente_autor`, `score_fuzzy`. Se agrega también `id_votacion` a la consolidación de STG 2 para que ese campo llegue a STG 3 y al Excel de auditoría.
- **Por qué**: STG 2 tenía dos responsabilidades mezcladas. Separar mejora la claridad del pipeline. La búsqueda de autor es semánticamente parte del enriquecimiento de títulos, no de la consolidación de votos. Además, al mover la búsqueda a STG 3, opera solo sobre los 1022 títulos útiles (post-filtrado), no sobre todos los títulos del consolidado.
- **Impacto**: archivos modificados: `notebooks/STG_2_transformacion.ipynb` (eliminadas celdas de autor, agregado `id_votacion`), `notebooks/STG_3_filtro_titulos.ipynb` (agregadas 8 celdas nuevas). Salidas: `data/df_modelado.csv` (ahora incluye columnas de autor e `id_votacion`), `data/titulos_autor.xlsx` (nueva: 1022 filas, 6 columnas, 710 sin autor para completado manual, 312 con autor — 30.5% de cobertura: 91 determinístico + 221 fuzzy).

### [2026-06-09] — Resumen de estado al iniciar sesión
- **Tipo**: convención
- **Qué**: registro de contexto general del proyecto al 2026-06-09.
  - Specs completas: 001 (app Streamlit v1), 002 (filtro títulos STG_3), 003 (features título STG_4), 004 (reorganización notebooks + rutas), 005 (README + guía de presentación PDF).
  - Archivos clave: `notebooks/STG_3_filtro_titulos.ipynb`, `notebooks/STG_4_features_titulo.ipynb`, `app/app.py`, `data/df_modelado.csv` (28.738 filas), `data/df_features_titulo.csv` (1022 filas × 387 cols), `specs/005-documentacion-presentacion/guia-presentacion.pdf`.
  - App publicada en Streamlit Cloud (branch `main`, `app/app.py`).
- **Por qué**: el usuario pidió registrar el contexto del proyecto para arrancar la próxima sesión con todo el estado documentado.
- **Impacto**: próxima sesión debe continuar con **spec 006** — features del diputado (historial de afinidad por bloque, por tema) para armar el dataset de entrenamiento final y comenzar el modelado.

### [2026-06-08] — Documentación y guía de presentación (spec 005)
- **Tipo**: decisión
- **Qué**: se reescribió el README.md y se generó una guía de presentación en PDF para uso interno del equipo.
- **Por qué**: el README anterior no reflejaba el estado real del proyecto (describía etapas que no existían y omitía las que sí). El equipo necesitaba un documento para presentar los avances en clase sin asumir conocimiento de programación.
- **Impacto**: `README.md` actualizado con estado real (STG 1–4 + app completos, modelado pendiente), instrucciones de instalación y link a la app. `specs/005-documentacion-presentacion/guia-presentacion.pdf` generado con explicación funcional y técnica de cada etapa, estructura de encadenamiento de notebooks y preguntas frecuentes. El script de generación queda en `specs/005-documentacion-presentacion/generar_pdf.py` para regenerar el PDF ante correcciones. Python usado: anaconda3 (`C:/Users/TALIGENT/anaconda3/python.exe`); reportlab instalado en ese entorno.

### [2026-06-08] — Reorganización de notebooks y rutas (spec 004)
- **Tipo**: convención
- **Qué**: los tres notebooks iniciales (`Scraping.ipynb`, `STG_1_Filtrado.ipynb`, `STG_2_transformacion.ipynb`) fueron movidos a `notebooks/`. Se corrigieron todas las rutas de lectura y escritura para que apunten a `../data/` (relativo a `notebooks/`). Se agregó celda `to_csv` al final de STG_1 (guarda `votaciones_filtrado.csv`) y STG_2 (guarda `df_consolidado.csv`).
- **Por qué**: STG_1 y STG_2 no guardaban su output — al cerrar el notebook se perdía el resultado. Los notebooks estaban sueltos en la raíz en vez de en `notebooks/`.
- **Impacto**: hay que re-correr STG_1 y STG_2 para regenerar los CSVs en `data/`. Antes de correr STG_1, mover `hcdn_votaciones_historico.csv` y `diputados_actuales.csv` a `data/` si están en la raíz. **Nota**: el nombre del CSV que genera Scraping (`votacion_{id}_completa.csv`) no coincide con el que lee STG_1 (`hcdn_votaciones_historico.csv`) — ese renombre se hacía manualmente; sigue siendo así.

### [2026-06-07] — Features semánticas de títulos (spec 003)
- **Tipo**: decisión
- **Qué**: se implementó `STG_4_features_titulo.ipynb` que genera embeddings de 384 dimensiones por título único usando `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers) y agrupa los 1022 títulos en 20 temas con K-Means (`random_state=42`). La salida es `data/df_features_titulo.csv` (1022 filas × 387 columnas: `titulo_base`, `tema_id`, `tema_label`, `emb_0`...`emb_383`).
- **Por qué**: K=20 elegido tras comparar K=10/15/20 — produce grupos temáticamente más específicos y coherentes.
- **Impacto**: `notebooks/STG_4_features_titulo.ipynb`, `data/df_features_titulo.csv` (nuevo). `df_modelado.csv` intacto.

### [2026-06-07] — Grupo sin tema en clustering K=20 (spec 003)
- **Tipo**: decisión
- **Qué**: el grupo 11 del clustering K=20 fue marcado como `sin_clasificar` porque agrupa títulos del tipo "Votación en General y Particular de Proyectos de Ley..." — votos sobre lotes de proyectos sin ley identificable.
- **Por qué**: hardcodeado (`GRUPOS_SIN_TEMA = {11}`) porque la auto-detección por regex falló por diferencias Unicode NFC/NFD, y el 42% de matcheo por substring quedaba bajo el umbral del 50%. El clustering es determinista (datos fijos + `random_state=42`) así que el ID del grupo no va a cambiar.
- **Impacto**: `STG_4_features_titulo.ipynb` celda `c3286a33`. Si se re-ejecuta STG_3 y cambia `df_modelado.csv`, hay que re-verificar que el grupo 11 siga siendo el "sin tema".

### [2026-06-07] — Ruido residual detectado en STG_4 y agregado a STG_3 (spec 003)
- **Tipo**: bug
- **Qué**: al inspeccionar el K=20, los grupos 0/3/5/9 contenían títulos que debían filtrarse en STG_3: Solicitud de Licencia, Habilitación de temas, VOTACION DESARROLLO DE LA SESION, Proceder a la Apertura del sobre, Renuncia del Dip., OD sin descripción (O.D. NNN), listas de O.D.s.
- **Por qué / causa raíz**: los patrones de STG_3 solo cubrían los casos más frecuentes. Al ver los clusters temáticos reales quedó claro que había ruido residual.
- **Impacto**: se agregaron patrones a `PATRONES_SIN_VALOR` y pasos a `_tiene_descripcion()` en `STG_3_filtro_titulos.ipynb`. El test suite creció de 18 a 36 casos (todos pasan). `df_modelado.csv` pasó de ~39k a 28.738 filas.

### [2026-06-07] — Cierre de sesión
- **Tipo**: convención
- **Qué**: specs 002 y 003 completadas y validadas. Estado del proyecto al cierre:
  - `data/df_modelado.csv`: 28.738 filas, 1022 títulos únicos (filtrado STG_3 aplicado)
  - `data/df_features_titulo.csv`: 1022 filas × 387 columnas (embeddings + tema_id + tema_label)
  - `notebooks/STG_3_filtro_titulos.ipynb`: 36/36 tests pasan
  - `notebooks/STG_4_features_titulo.ipynb`: K=20, grupo 11 sin_clasificar
- **Próximo paso**: spec 004 — features del diputado (historial de afinidad por bloque, por tema, etc.) para armar el dataset de entrenamiento final.

### [2026-06-07] — Filtro de títulos sin valor semántico (spec 002)
- **Tipo**: decisión
- **Qué**: se implementó `STG_3_filtro_titulos.ipynb` que elimina de `df_consolidado` los registros cuyo `titulo_base` no describe el contenido temático de una ley. El resultado se guarda como `df_modelado.csv`.
- **Por qué**: mociones, habilitaciones, expedientes sin descripción y similares son ruido para el modelo. Entrenaría con títulos que nunca aparecerán como input real.
- **Impacto**: `notebooks/STG_3_filtro_titulos.ipynb`, `data/df_modelado.csv` (nuevo archivo base para el modelado). `df_consolidado.csv` intacto.

### [2026-06-07] — Bug en filtro de Exp./Expte. con re.IGNORECASE
- **Tipo**: bug
- **Qué**: los patrones `r'^EXPTE?\.\s+[\dA-Z\-\/\.\s]+$'` clasificaban mal títulos como `Expte. 0089-S-2020. DE LEY. CONVENIO...` (los filtraban cuando debían conservarse).
- **Por qué / causa raíz**: `re.IGNORECASE` hace que `[A-Z]` también matchee minúsculas. Como la descripción "DE LEY. CONVENIO..." solo contiene letras, puntos y espacios, el patrón la consumía entera y daba falso positivo.
- **Impacto**: se eliminaron esos patrones de `PATRONES_SIN_VALOR` y se delegó todo `Exp*/EXPTE*` a la función `_tiene_descripcion()`, que quita el número con un regex estricto (`^\d+-[A-Za-z]+-\d+`) sin depender de clases de caracteres amplias con IGNORECASE.

### [2026-06-27] — Spec 009: modelado y predicción de votos (COMPLETA)
- **Tipo**: decisión
- **Qué**: se implementaron STG_5, STG_6, STG_7 y el informe .docx. Resultados clave:
  - **Dataset de entrenamiento**: `data/df_entrenamiento.csv` — 25.082 filas × 401 cols (394 features). Se filtraron 3.656 votos AUSENTE (no son posición política).
  - **Features**: 9 históricas/políticas + 384 embeddings semánticos + 1 tema_id. Anti-leakage garantizado con cumsum().shift(1) y assert automático.
  - **Validación**: TimeSeriesSplit(n_splits=5) + holdout 20% más reciente. Sin split aleatorio en ningún punto.
  - **Modelo ganador**: LGBMClassifier — CV F1-macro 0.383 ± 0.042, Holdout F1-macro 0.453.
  - **Relleno de NaN**: cascada tema→hist→0.5 neutro. El 0.5 es el valor neutral (ni afinidad ni rechazo) y no se calculó como media del dataset (eso sería leakage global).
  - **Tuning**: RandomizedSearchCV sobre LightGBM no mejoró al modelo por defecto (holdout 0.433 vs 0.453). Los hiperparámetros por defecto son robustos para este dataset.
  - **Importancia de features**: embeddings 61.4%, features históricas 38.4%. La feature individual más importante es bloque_enc (6.7%) — la disciplina partidaria es el predictor más fuerte.
- **Por qué**: completar el módulo de modelado para integrar luego la predicción en la app Streamlit.
- **Impacto**: notebooks creados: STG_5, STG_6, STG_7. Artefactos: df_entrenamiento.csv, encoder_bloque_provincia.joblib, le_voto.joblib, informe_legistrack.docx y 6 PNGs en specs/009-modelado-prediccion-votos/.

### [2026-06-27] — Bug doble paralelismo LightGBM + cross_val_score
- **Tipo**: bug
- **Qué**: `cross_val_score(n_jobs=-1)` con `LGBMClassifier(n_jobs=-1)` causaba TerminatedWorkerError por agotamiento de memoria.
- **Por qué / causa raíz**: doble paralelismo — joblib spawneaba N procesos para los folds, y cada proceso spawneaba N threads de LightGBM. La solución es pasar `cv_n_jobs=1` a cross_val_score cuando el estimador ya usa todos los cores.
- **Impacto**: STG_6 y STG_7 — LightGBM siempre se evalúa con `cross_val_score(..., n_jobs=1)`.

### [2026-06-27] — Cierre de sesión
- **Tipo**: convención
- **Qué**: spec 009 completa y validada (24/24 criterios). Estado del proyecto al cierre:
  - `notebooks/STG_5_features_diputado.ipynb`: pipeline de features anti-leakage
  - `notebooks/STG_6_modelado.ipynb`: comparación 6 modelos, ganador LGBM F1=0.453
  - `notebooks/STG_7_tuning.ipynb`: tuning sin mejora sobre el default
  - `specs/009-modelado-prediccion-votos/informe_legistrack.docx`: informe académico completo con 6 imágenes
  - `data/df_entrenamiento.csv`: dataset listo para la app
  - `requirements.txt`: versiones fijas de todas las dependencias
- **Próximo paso**: integrar el predictor en la app Streamlit (cargar el modelo entrenado, recibir un título de ley como input, devolver predicciones para los 257 diputados).

### [2026-07-13] — Spec 010: API FastAPI para servir datos y predicciones (APROBADA)
- **Tipo**: decisión
- **Qué**: se aprobó `specs/010-api-fastapi/spec.md`. Alcance: backend FastAPI modular (routers, esquemas Pydantic, `database.py`) con dos endpoints — `GET /diputados/{id}` (historial de diputado, igual a lo que hoy calcula `app/app.py`) y `POST /predecir` (predicción masiva para los 257 diputados dado un título de ley, reutilizando el modelo LGBM ya entrenado en la spec 009, sin reentrenar). La app Streamlit deja de leer los CSV directamente y pasa a consumir estos endpoints por HTTP. Motivado por un checklist de MVP de la cátedra (18 ítems) adjuntado por el usuario.
- **Por qué**: separar el backend de datos del frontend, cumpliendo la arquitectura modular exigida por el checklist, sin sofisticar de más (Principio 7).
- **Fuera de alcance** (quedan para specs futuras): migración a Postgres/SQLAlchemy, login/JWT/bcrypt, deploy en Render/Streamlit Cloud, navegación multisección y gráficos Plotly/Altair en Streamlit.
- **Riesgos anotados para /planificar**: generar embedding y tema (cluster K-Means) de un título nuevo en tiempo real sin reentrenar; mantener las features históricas del diputado actualizadas a la fecha de la predicción sin fuga de información. Se acordó con el usuario que si más adelante se agrega una feature al modelo, la lógica que arma el vector de features para un título nuevo (dentro de esta spec) debe quedar aislada en una sola función para poder actualizarla sin tocar el resto del endpoint.
- **Impacto**: `specs/010-api-fastapi/spec.md` (nuevo). Próximo paso: `/planificar` para definir el `plan.md` técnico.

### [2026-07-16] — Spec 010, Parte A completa: artefactos serializados (`STG_8`)
- **Tipo**: decisión
- **Qué**: se implementó y corrió de punta a punta `notebooks/STG_8_serializar_artefactos.ipynb` (tareas T1–T8 de `specs/010-api-fastapi/tasks.md`). Genera y guarda en `data/`: `modelo_lgbm.joblib` (LGBM ganador de la spec 009, reentrenado con los mismos hiperparámetros sobre train+holdout combinados), `kmeans_temas.joblib` (K=20, `random_state=42`, reproduce el 100% de los `tema_id` ya existentes), `mapa_temas.json` (`tema_id → tema_label`), y tres tablas snapshot — `snapshot_diputado.csv`, `snapshot_diputado_tema.csv`, `snapshot_bloque_tema.csv` — con las tasas históricas de cada diputado/bloque acumuladas **sin `.shift`** (acumulado total hasta hoy, sin excluir ningún voto, porque no hay ningún voto "actual" que descartar al predecir una ley futura).
- **Por qué**: la spec 009 había dejado la serialización del modelo explícitamente fuera de alcance; sin estos artefactos la API de la spec 010 no tiene con qué predecir. Ninguno de estos pasos es una evaluación nueva ni leakage — está documentado en detalle en la propia notebook (celda de resumen T8).
- **Chequeo de sanity check (T3)**: el modelo reentrenado da F1-macro = 0.989 sobre el holdout de `STG_6`, pero ese número **no es la métrica oficial** (el modelo ya vio esas filas al entrenarse con train+holdout combinados) — solo confirma que la serialización no rompió nada. **La métrica oficial para citar en la defensa del TP sigue siendo 0.453** (holdout genuino de `STG_6`, sin ver esos datos).
- **Observación pendiente, no bloqueante**: el snapshot de diputados (`snapshot_diputado.csv`) tiene 259 diputados, no los 257 de la nómina actual mencionados en el proyecto. Viene de `df_modelado.csv` tal cual está hoy; no se investigó la causa raíz porque no es parte del alcance de la spec 010. Revisar al validar los criterios de aceptación (T20) o en una spec futura si afecta la nómina real de predicción.
- **Impacto**: `notebooks/STG_8_serializar_artefactos.ipynb` (nuevo). Archivos nuevos en `data/`: `modelo_lgbm.joblib`, `kmeans_temas.joblib`, `mapa_temas.json`, `snapshot_diputado.csv`, `snapshot_diputado_tema.csv`, `snapshot_bloque_tema.csv`. Próximo paso: Parte B de la spec 010 — construir la API FastAPI (`api/`) que carga estos artefactos.

### [2026-07-16] — Bug: KMeans.predict() rompía con embeddings de sentence-transformers (dtype mismatch)
- **Tipo**: bug
- **Qué**: `api/modelo.py` (`construir_features`, T12) fallaba con `ValueError: Buffer dtype mismatch, expected 'const float' but got 'double'` al asignar el tema de un título nuevo con `kmeans_temas.predict()`.
- **Por qué / causa raíz**: `kmeans_temas` (T4) se ajustó sobre embeddings leídos desde `df_features_titulo.csv` con pandas, que por defecto son `float64`. `sentence_transformers.encode()` en cambio devuelve `float32` por defecto. La implementación en Cython de `KMeans.predict()` de scikit-learn exige que `X` tenga el mismo dtype que `cluster_centers_`, y con tipos mezclados tira este error de bajo nivel en vez de castear automáticamente.
- **Impacto**: se corrigió casteando el embedding a `float64` inmediatamente después de generarlo en `construir_features` (`api/modelo.py`), antes de usarlo tanto para `kmeans.predict()` como para las columnas `emb_*` del vector de features del LGBM (que también se entrenó con embeddings `float64` desde CSV). No hizo falta re-correr `STG_8`. Si en el futuro se cambia la fuente de los embeddings (ej. generarlos todos con `sentence-transformers` en vez de leerlos de un CSV), hay que revisar que el dtype siga siendo consistente en todo el pipeline.

### [2026-07-16] — Spec 010, Parte B completa: API FastAPI funcionando (T9–T16)
- **Tipo**: decisión
- **Qué**: se implementó la carpeta `api/` completa:
  - `api/database.py`: lee `df_consolidado.csv` y las tres tablas snapshot, cacheadas con `lru_cache` para no releer el CSV en cada pedido.
  - `api/schemas.py`: esquemas Pydantic v2 (`DiputadoHistorial`, `PrediccionRequest` con validador de título no vacío, `PrediccionResponse`).
  - `api/modelo.py`: carga los artefactos de `STG_8` y expone `construir_features(titulo)` (aislada, único lugar a tocar si se agrega una feature al modelo) y `predecir_votos(titulo)`.
  - `api/routers/diputados.py`: `GET /diputados/{id}` — el `id` es el **nombre completo del diputado** (los datos no tienen ID numérico), 404 si no existe.
  - `api/routers/predecir.py`: `POST /predecir`, devuelve la predicción de los 259 diputados del snapshot.
  - `api/main.py`: arma la app FastAPI con `lifespan` (no el `@app.on_event` deprecado) para precargar todos los artefactos pesados (modelo, KMeans, embedder) una sola vez al iniciar.
- **Por qué**: cerrar la Parte B de la spec 010 — la API ya sirve, por HTTP, lo mismo que hoy calcula `app/app.py` leyendo CSV directamente.
- **Validado**: probado con `TestClient` y también con un servidor `uvicorn` real corriendo en `127.0.0.1:8000`. El arranque tarda ~52s (carga del modelo de embeddings de `sentence-transformers`), pero una vez arriba, `/predecir` responde en ~0.5s.
- **Bug encontrado y resuelto**: ver entrada anterior (dtype mismatch `float32` vs `float64` entre `sentence-transformers` y el KMeans guardado).
- **Dependencias nuevas instaladas** (entorno anaconda3): `fastapi`, `uvicorn`, `httpx`, `requests`. Pendiente reflejar en `requirements.txt` (T19).
- **Impacto**: `api/` (nuevo, 7 archivos + `__init__.py`). Próximo paso: Parte C de la spec 010 — conectar `app/app.py` a la API por HTTP.

### [2026-07-17] — Spec 010 COMPLETA: API FastAPI integrada con la app Streamlit (T17–T21)
- **Tipo**: decisión
- **Qué**: se cerraron las 21 tareas de `specs/010-api-fastapi/tasks.md`. `app/app.py` ya no lee ningún CSV directamente: el selector de diputados llama a `GET /diputados`, el historial a `GET /diputados/{id}`, y se agregó una sección nueva de predicción que llama a `POST /predecir` y muestra tema detectado, distribución de la predicción y la tabla completa. `requirements.txt` quedó con `fastapi==0.139.2`, `uvicorn==0.51.0`, `pydantic==2.12.4`, `requests==2.32.5` sumados a lo que ya había.
- **Bug/mejora encontrada en el camino**: el formulario de predicción usaba `st.text_area` + `st.button` sueltos; el valor tipeado no llegaba sincronizado al backend si se hacía clic inmediatamente después de escribir (debounce de Streamlit — el servidor podía recibir el título vacío aunque el usuario ya lo hubiera completado). Se resolvió envolviendo el input y el botón en `st.form`, el patrón nativo de Streamlit para commitear todo junto al enviar. No es solo un fix para testing automatizado: evita que un usuario real dispare una predicción vacía por clickear rápido.
- **Validación final (T20)**: los 7 criterios de aceptación de `spec.md` pasan (marcados `[x]` con nota de qué se verificó cada uno). Se confirmó además que `/predecir` es determinista (mismo título → misma predicción en llamadas repetidas) y que no queda ningún `pd.read_csv` en `app/app.py`.
- **Deuda conocida, no bloqueante**: el snapshot de diputados tiene 259 personas en vez de los 257 de la nómina actual (arrastrado de `df_modelado.csv`, no introducido por esta spec — ver entrada del 2026-07-16). Queda para revisar en una spec futura si se quiere acotar a la nómina exacta.
- **Fuera de alcance de la 010, confirmado como spec futura**: migración a Postgres/SQLAlchemy, login/JWT/bcrypt, deploy en Render/Streamlit Cloud, navegación multisección y gráficos Plotly/Altair (checklist de la cátedra, ítems no cubiertos todavía).
- **Impacto**: `app/app.py` (modificado, ya no depende de `data/df_consolidado.csv` en tiempo de ejecución), `requirements.txt` (modificado), `.claude/launch.json` (nuevo, config para correr `api` y `streamlit` con el preview). Toda la cadena CSV → notebooks → artefactos → API → Streamlit está integrada de punta a punta.

---

## Cierre de sesión — 2026-07-17

**Objetivo de la sesión**: implementar la spec 010 (API FastAPI) completa, desde la especificación hasta el código funcionando.

**Qué se logró**: ciclo completo `/especificar` → `/planificar` → `/tareas` → `/implementar` de la spec 010. Las 21 tareas quedaron hechas y verificadas (con `TestClient`, con `uvicorn` real, y en el navegador vía Streamlit). La app dejó de depender de leer CSV en tiempo de ejecución para historial y predicción; ahora todo pasa por la API.

**Qué quedó pendiente**: los ítems del checklist de la cátedra que se dejaron explícitamente fuera de alcance de la 010 (base de datos persistente, autenticación, deploy en la nube, mejoras de frontend) — son candidatos a specs futuras (011, 012, ...). También quedó la deuda conocida de los 259 vs 257 diputados, sin investigar a fondo.

**Archivos tocados en la sesión**: `notebooks/STG_8_serializar_artefactos.ipynb` (nuevo), `api/` completo (nuevo), `app/app.py` (modificado), `requirements.txt` (modificado), `.claude/launch.json` (nuevo), `data/modelo_lgbm.joblib`, `data/kmeans_temas.joblib`, `data/mapa_temas.json`, `data/snapshot_diputado.csv`, `data/snapshot_diputado_tema.csv`, `data/snapshot_bloque_tema.csv` (todos nuevos), `specs/010-api-fastapi/` (spec, plan, tasks — completos y aprobados).

### [2026-07-17] — Bug: bloque desactualizado en `/diputados/{id}` (encontrado en `/revisar`)
- **Tipo**: bug
- **Qué**: `obtener_historial_diputado` (`api/database.py`) devolvía el bloque/provincia con `df_dip["bloque"].iloc[0]` — la primera fila del diputado tal como aparece en `df_consolidado.csv`, no la más reciente.
- **Por qué / causa raíz**: `df_consolidado.csv` no está ordenado por fecha dentro de cada diputado (confirmado: `df.equals(df.sort_values(['diputado','fecha_votacion']))` da `False`). Para los 98 diputados que cambiaron de bloque a lo largo del tiempo, `.iloc[0]` podía traer un bloque viejo. Esto ya venía de la app v1 original, pero al agregar `/predecir` — que sí usa el bloque más reciente en `snapshot_diputado.csv` (T5) — quedó expuesta una inconsistencia real: 39 de esos 98 diputados mostraban un bloque distinto entre `/diputados/{id}` y `/predecir` para la misma persona.
- **Impacto**: se corrigió ordenando por `fecha_votacion` descendente antes de tomar `bloque`/`provincia` (T22). Verificado: los 98 diputados con más de un bloque ahora coinciden entre ambos endpoints.

### [2026-07-17] — Mejora: precarga completa de datos al iniciar la API (encontrado en `/revisar`)
- **Tipo**: bug
- **Qué**: `modelo.precargar_artefactos()` calentaba el modelo LGBM, el KMeans y el embedder, pero no las funciones cacheadas de `api/database.py` (`df_consolidado.csv` y las tres tablas snapshot). El primer pedido real a `/diputados/{id}` o `/predecir` después de arrancar pagaba el costo de leer esos CSV, contra el objetivo declarado de T15 ("cargar todos los artefactos al iniciar").
- **Por qué / causa raíz**: al escribir `precargar_artefactos()` (T15) solo se pensó en los artefactos de Machine Learning, no en los de `database.py`.
- **Impacto**: se agregaron las 4 llamadas de `database.py` a `precargar_artefactos()` (T23). Verificado con un servidor `uvicorn` recién arrancado: primer pedido a `/diputados/{id}` en 0.069s y a `/predecir` en 0.380s (antes hubiera incluido la lectura de los CSV).

### [2026-07-13] — Bug recurrente: saltos de línea reales dentro de strings (SyntaxError)
- **Tipo**: bug
- **Qué**: varias celdas de STG_5, STG_6 y STG_7 tenían un salto de línea real pegado dentro de un string de comillas simples/dobles (en vez de `\n` escapado), lo que da `SyntaxError: unterminated string literal` al ejecutar la celda. Apareció en: STG_5 T8 (`raise AssertionError(...)`), STG_6 T18 (`ax.set_title(f'...')`), STG_6 T19 (diccionario `grupos = {...}`), STG_7 T22 (lista `x = ['Por defecto...', 'Afinado...']`).
- **Por qué / causa raíz**: en Python, un string entre comillas simples/dobles (no triples) no puede contener un salto de línea literal — solo puede llevar `\n` escapado. Probablemente el código se generó o se pegó con saltos de línea "crudos" dentro del string en vez del escape, en varios puntos distintos del pipeline.
- **Impacto**: se corrigieron las 4 celdas reemplazando el salto de línea literal por `\n` escapado. Se validó con un script que compila (`compile()`) todas las celdas de código de los 8 notebooks de `notebooks/` — no quedan errores de sintaxis pendientes. Si aparece este mismo error en otra celda, buscar comillas que arrancan en una línea y no se cierran en la misma.
