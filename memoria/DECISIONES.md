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

### [2026-07-18] — Diseño futuro: selector de "autor hipotético" en la app (spec 011, aclaración del usuario)
- **Tipo**: decisión
- **Qué**: cuando se construya el selector de autor hipotético en la app (spec futura, fuera de alcance de la 011), **NO debe usarse `tabla_autor_bloque.csv`** (la tabla por-autor que exportó T10.2 de esta spec) como fuente de los autores seleccionables. Esa tabla es un insumo de auditoría/consulta general, pero tiene dos problemas para ese uso puntual: (1) solo cubre a los ~162 autores que alguna vez escribieron un proyecto en el dataset (no a los 257 diputados actuales), y (2) el bloque que guarda es el último conocido al momento del proyecto, no necesariamente el bloque actual del diputado. En cambio, el selector de la app debe: (a) ofrecer como opciones únicamente a los **diputados actuales** (la nómina de 257/259, independientemente de si alguna vez firmaron un proyecto), tomando su **bloque vigente hoy**; y (b) ofrecer además una opción explícita **"Poder Ejecutivo Nacional"**, que hoy corresponde a **La Libertad Avanza** (según `tabla_periodos_presidenciales.csv`).
- **Por qué**: el usuario aclaró que la utilidad real del selector es predecir cómo votaría la Cámara actual ante una ley hipotética firmada por alguien que hoy tiene banca (o por el Ejecutivo), no reconstruir la autoría histórica de proyectos ya votados. Usar el "último bloque conocido" de `tabla_autor_bloque.csv` sería incorrecto si ese diputado cambió de bloque después de su último proyecto registrado, y dejaría afuera a la mayoría de los 257 diputados actuales que nunca aparecen ahí.
- **Impacto**: no cambia nada de lo ya implementado en la spec 011 (`tabla_autor_bloque.csv` sigue siendo válida como lo que es: consulta histórica por-autor). Es una restricción de diseño para la spec futura que construya el selector de autor en la app — debería construir su propia lista a partir de la nómina de diputados actuales (bloque vigente) + la opción del Ejecutivo, no reutilizar `tabla_autor_bloque.csv` directamente.

### [2026-07-13] — Bug recurrente: saltos de línea reales dentro de strings (SyntaxError)
- **Tipo**: bug
- **Qué**: varias celdas de STG_5, STG_6 y STG_7 tenían un salto de línea real pegado dentro de un string de comillas simples/dobles (en vez de `\n` escapado), lo que da `SyntaxError: unterminated string literal` al ejecutar la celda. Apareció en: STG_5 T8 (`raise AssertionError(...)`), STG_6 T18 (`ax.set_title(f'...')`), STG_6 T19 (diccionario `grupos = {...}`), STG_7 T22 (lista `x = ['Por defecto...', 'Afinado...']`).
- **Por qué / causa raíz**: en Python, un string entre comillas simples/dobles (no triples) no puede contener un salto de línea literal — solo puede llevar `\n` escapado. Probablemente el código se generó o se pegó con saltos de línea "crudos" dentro del string en vez del escape, en varios puntos distintos del pipeline.
- **Impacto**: se corrigieron las 4 celdas reemplazando el salto de línea literal por `\n` escapado. Se validó con un script que compila (`compile()`) todas las celdas de código de los 8 notebooks de `notebooks/` — no quedan errores de sintaxis pendientes. Si aparece este mismo error en otra celda, buscar comillas que arrancan en una línea y no se cierran en la misma.

### [2026-07-17] — Spec 011: features de autoría (APROBADA)
- **Tipo**: decisión
- **Qué**: se aprobó `specs/011-bloque-autor/spec.md`. Alcance: construir 4 features de autoría sobre los 312 títulos que ya tienen `autor_final` (spec 006) — `bloque_autor` (bloque de la autoría a la fecha de la votación), `es_poder_ejecutivo` (proyecto enviado directamente por el Ejecutivo: presidente, Jefatura de Gabinete o ministerio), `es_oficialista` (la autoría pertenece al oficialismo del momento; todo es_poder_ejecutivo=1 implica es_oficialista=1) y `coincide_bloque_autor` (el diputado votante es del mismo bloque que el autor). Además, dos tablas reutilizables para la app futura: autor→bloque y período presidencial→coalición oficialista con sus bloques integrantes y firmantes del Ejecutivo.
- **Por qué**: el modelo no sabe de quién viene cada proyecto; la pertenencia política del autor (y en especial si es el Ejecutivo) es una señal de disciplina partidaria potencialmente fuerte. Diagnóstico previo: 274/312 títulos se resuelven automático contra `hcdn_votaciones_historico.csv` (2.057 diputados históricos con bloque y fecha); los 38 restantes (21 autores: senadores, funcionarios, comisiones, variantes de nombre) van a una tabla manual autor→bloque que el proceso deja generada.
- **Decisiones de diseño acordadas con el usuario**: (1) para proyectos del Ejecutivo, `bloque_autor` = coalición oficialista del momento (no el bloque que el presidente tuvo como diputado); (2) los no resueltos se completan a mano, no quedan SIN_BLOQUE; (3) alcance limitado a construir la feature — reentrenar el modelo será la spec siguiente y la integración en app/API otra spec futura; (4) los 710 títulos sin autor llevan categoría explícita "sin dato" y el proceso debe re-ejecutarse sin cambios de código cuando avance el completado manual de `titulos_autor.xlsx`.
- **Riesgo clave para /planificar**: criterio de comparación coalición vs. bloque (ej. proyecto del Ejecutivo de Macri = "Cambiemos" vs. votante del bloque "PRO") — afecta a `coincide_bloque_autor` y `es_oficialista`; lo resuelve la tabla de bloques integrantes por coalición. También: no usar el bloque de un autor si solo aparece en el histórico DESPUÉS de la votación (leakage).
- **Impacto**: `specs/011-bloque-autor/spec.md` (nuevo). Próximo paso: `/planificar`.

### [2026-07-17] — Plan 011 (APROBADO): cascada de resolución de bloque_autor
- **Tipo**: decisión
- **Qué**: se aprobó `specs/011-bloque-autor/plan.md`. Diseño: notebook nuevo `STG_9_features_autor.ipynb` *(nombre provisorio del plan; renombrado a `STG_5.2_features_autor.ipynb` al implementarlo — ver entrada "Convención: notebooks intermedios..." más abajo. Si en el futuro existe un STG_9 real, no tiene relación con esta feature)* que resuelve el bloque de cada autor con una cascada de 4 pasos — (1) Ejecutivo en ejercicio (el autor figura como firmante de un período presidencial Y la votación cae dentro del mandato) → coalición oficialista; (2) tabla manual `tabla_autor_bloque_manual.csv` (que además pisa cualquier asignación automática mala); (3) lookup temporal hacia atrás (`merge_asof` backward) contra `hcdn_votaciones_historico.csv`; (4) PENDIENTE_MANUAL. Salidas: `df_modelado_autor.csv` (df_modelado + 4 columnas), `tabla_autor_bloque.csv` (para la app futura), `autores_pendientes.csv`. Tabla manual clave: `tabla_periodos_presidenciales.csv` (Menem→Milei) con coalición, firmantes del Ejecutivo y bloques integrantes — la propone Claude pero la valida el equipo fila por fila (definición politológica).
- **Por qué / decisiones de diseño**: la condición de fecha en la regla del Ejecutivo excluye casos reales detectados (proyectos de Macri votados en 2026 fuera de mandato; un "FERNANDEZ, ALBERTO" votado en 2013, probable homónimo) — van a pendientes con motivo. "Sin dato" = -1 (no 0) en las tres features binarias para no confundir "no coincide" con "no sabemos". Autores que solo aparecen en el histórico DESPUÉS de la votación no se resuelven automático (leakage) — van a pendientes. Sin librerías nuevas (pandas + unicodedata). Constitution Check: pasa los 8 principios; assert automático anti-lookup-al-futuro.
- **Impacto**: `specs/011-bloque-autor/plan.md` (nuevo). Próximo paso: `/tareas`.

### [2026-07-17] — Semántica de es_poder_ejecutivo: gobierno vigente, no cargo puntual (spec 011, T1)
- **Tipo**: decisión
- **Qué**: un proyecto cuenta como "del Ejecutivo" si su autor es firmante de un período presidencial Y la coalición gobernante **a la fecha de la votación** es la misma de ese período. No se exige que el firmante siga en el cargo exacto (ej.: proyecto firmado por Alberto Fernández como JGM, votado en 2013 bajo CFK → SÍ es del Ejecutivo, porque el gobierno FpV que lo originó seguía impulsándolo). Sí queda excluido si se vota bajo otra coalición (ej.: proyecto de Macri votado en 2026 bajo LLA → NO).
- **Por qué**: criterio definido por el usuario ante el caso real Alberto-2013: lo que importa politológicamente es qué gobierno impulsa el proyecto al momento del voto, no la tenencia del cargo del firmante. Descarta la alternativa de una tabla de firmantes con mandatos individuales (más compleja y con peor semántica). Bonus: la regla cubre la continuidad NK→CFK (misma coalición FpV) automáticamente.
- **Impacto**: `tabla_periodos_presidenciales.csv` queda con firmantes por período (sin fechas individuales). Preview validado: 90 de 312 títulos resueltos como Ejecutivo (CFK 48, Macri 19, A. Fernández 10, Milei 7, y JGMs en ejercicio: Peña 2, Aníbal Fernández 2, Abal Medina 1, Cafiero 1).

### [2026-07-17] — Bloques integrantes por coalición validados + escenario A/B para el PRO (spec 011, T2)
- **Tipo**: decisión
- **Qué**: el equipo validó fila por fila los `bloques_integrantes` de `tabla_periodos_presidenciales.csv`, incluyendo los llamados de criterio: bloque "Justicialista" cuenta como oficialismo bajo Néstor Kirchner (PJ aún unificado 2003-2005), Nuevo Encuentro integra el oficialismo de CFK, Evolución Radical integra Cambiemos. La única duda fue el PRO bajo Milei: se decidió NO definirlo a priori sino **resolverlo empíricamente** — el dataset llevará dos columnas extra (`es_oficialista_b`, `coincide_bloque_autor_b`) calculadas con PRO dentro de la coalición de Milei (escenario B), además de las oficiales con PRO fuera (escenario A). En la spec 012 (reentrenamiento) se entrena con cada escenario, se comparan F1-macro con validación temporal y el ganador queda como definición oficial para la app.
- **Por qué**: el PRO es aliado frecuente pero bloque formalmente independiente de LLA; ambas posturas son defendibles politológicamente. Dejar que el dato decida es más honesto y da un argumento empírico para la defensa del TP. Solo 2 de las 4 features dependen de esta definición (`bloque_autor` y `es_poder_ejecutivo` no cambian entre escenarios), así que el costo es solo 2 columnas, no un dataset duplicado.
- **Impacto**: `tasks.md` T8/T10 actualizadas (escenario B), `spec.md` actualizada (la comparación A/B queda a cargo de la spec 012). El escenario B se define en una celda claramente marcada de `STG_5.2_features_autor.ipynb`.

### [2026-07-17] — Convención: notebooks intermedios usan numeración decimal (spec 011, T4)
- **Tipo**: convención
- **Qué**: el notebook de features de autoría se creó primero como `STG_9_...` (siguiendo al último notebook existente, STG_8) y se renombró a **`STG_5.2_features_autor.ipynb`**. Motivo señalado por el usuario: el número de un notebook debe reflejar su lugar en el pipeline de dependencias, no el orden de creación — STG_9 sugería falsamente que corre después de STG_8 (serialización de artefactos del modelo), cuando en realidad es enriquecimiento de features sobre `df_modelado.csv` (como STG_4) y debe ejecutarse **antes** de STG_6 (modelado), STG_7 (tuning) y STG_8 (artefactos).
- **Por qué**: se adopta numeración decimal (`STG_5.2`) para insertar una sub-etapa entre STG_5 (features del diputado) y STG_6 (modelado) sin renumerar los notebooks existentes, que ya están citados en specs, memoria e informes previos. Convención para el futuro: si hace falta insertar una etapa nueva entre dos existentes, usar notación `STG_N.M` en vez de continuar la numeración entera al final.
- **Impacto**: `notebooks/STG_5.2_features_autor.ipynb` (nuevo nombre). Referencias actualizadas en `specs/011-bloque-autor/plan.md` y `tasks.md`.

### [2026-07-18] — Bug detectado en T9: merge_asof con nombre de columna compartido pierde la fecha del registro matcheado
- **Tipo**: bug
- **Qué**: el `merge_asof` de T7 (paso histórico de la cascada) usaba `on='fecha_votacion'` con el **mismo nombre de columna** en ambos lados (la fecha del título y la fecha del registro histórico). El resultado conserva solo la fecha del lado izquierdo (el título) y descarta la fecha real del registro histórico que matcheó, así que no había forma de verificar directamente la garantía anti-leakage sobre ese resultado.
- **Por qué / causa raíz**: en `pd.merge_asof`, cuando `on=` referencia una columna con el mismo nombre en ambos DataFrames, pandas no distingue cuál valor conservar y se queda con el de referencia (el de la izquierda) — no es un error de pandas, es el comportamiento documentado, pero no es obvio a simple vista y puede esconder un chequeo de leakage que en realidad nunca se hizo.
- **Impacto**: no afectó el resultado de `bloque_autor` en sí (la asignación por histórico ya era correcta por construcción, con `direction='backward'`), pero **sí impedía demostrarlo**. Se agregó en T9(c) un merge separado con la fecha del registro histórico renombrada a una columna distinta (`fecha_registro_historico`), lo que permitió el assert explícito `fecha_registro_historico <= fecha_votacion` sobre las 183 asignaciones. **Lección para el equipo**: si en el futuro se usa `merge_asof` con nombres de columna compartidos entre dos fuentes de fecha, y se necesita auditar cuál fecha matcheó, hay que renombrar una de las columnas antes del merge.

### [2026-07-18] — Spec 012: integración de autores completados a mano 2019+ (APROBADA)
- **Tipo**: decisión
- **Qué**: se aprobó `specs/012-autores-manuales-2019/spec.md`. El equipo completó a mano `data/titulos_autor_manual.xlsx` (220 filas, 218 títulos únicos de 2019 en adelante que estaban SIN_DATO) con autor y bloque. La spec integra esa tabla al pipeline de la spec 011: cruce por `id_votacion` (no por texto — el Excel tiene encoding roto y el id lo esquiva de raíz; verificado que los 218 ids matchean 1 a 1 con un `titulo_base` y todos eran SIN_DATO), autores "PEN" (104) → `es_poder_ejecutivo=1`, `es_oficialista=1` y `bloque_autor` = coalición vigente por `tabla_periodos_presidenciales.csv` (el bloque cargado a mano queda como verificación cruzada; ante discrepancia manda la tabla de períodos, listando cada caso), normalización de nombres de bloque tipeados a mano contra los canónicos del dataset (riesgo principal — un bloque mal mapeado hace mentir `coincide_bloque_autor` en silencio). Los sin-autor bajan de 710 a 492; cobertura de autoría sube de 312 a 530 títulos.
- **Por qué**: el trabajo manual del equipo cubre justamente el período que más pesa para predecir la Cámara actual (2019+); sin integrarlo, el modelo sigue ciego sobre esos títulos.
- **Nota**: el usuario corrigió en el Excel la única fila con `bloque_autor="PEN"` (id 4553 → "Frente De Todos") y la fila que estaba vacía. **El reentrenamiento (comparación escenarios A/B) pasa a ser la spec 013** (antes planificado como 012).
- **Impacto**: `specs/012-autores-manuales-2019/spec.md` (nuevo). Próximo paso: `/planificar`.

### [2026-07-18] — Plan 012 (APROBADO): tabla manual como fuente nueva de la cascada en STG_5.2
- **Tipo**: decisión
- **Qué**: se aprobó `specs/012-autores-manuales-2019/plan.md`. Diseño: no se crea notebook nuevo — se extiende `STG_5.2_features_autor.ipynb`. La tabla `titulos_autor_manual.xlsx` entra como fuente de autores (`fuente_autor='manual_2019'`, cruce por `id_votacion`) y como paso de cascada previo al histórico: autores "PEN" → regla del Ejecutivo (coalición vigente por `tabla_periodos_presidenciales.csv`, con verificación cruzada contra el bloque cargado a mano e informe de discrepancias — manda la tabla de períodos); legisladores → bloque manual por título (`fuente_bloque_autor='manual_titulo'`), normalizado en dos pasadas: automática (normalizar_nombre) + diccionario explícito auditable para variantes que no resuelven solas (ej. "Ucr" vs "Unión Cívica Radical" — verificado que conviven como valores distintos en el propio dataset). Chequeo de sanidad: cada bloque asignado debe existir entre los votantes de esa época. Chequeo de no-regresión: las filas de los 312 títulos de la spec 011 deben quedar idénticas antes de exportar. Cero librerías nuevas, cero azar.
- **Por qué**: reutilizar el pipeline existente minimiza código nuevo y garantiza que las features derivadas (es_oficialista, escenario B, coincide) se calculen exactamente igual que para los 312 previos. Constitution Check: pasa los 8 principios (P2/P4 N/A — no se entrena modelo; eso es la spec 013).
- **Impacto**: `specs/012-autores-manuales-2019/plan.md` (nuevo). Próximo paso: `/tareas`.

### [2026-07-18] — Spec 012, T6: 3 discrepancias PEN resueltas a favor de la coalición vigente
- **Tipo**: decisión
- **Qué**: de los 103 títulos con autor "PEN" (spec 012), 3 tenían el bloque cargado a mano como "Pro" pero se votaron en 2020 bajo el gobierno de Frente De Todos: "Acuerdo Regional - OD 93 - Exp. 76-S-2020", "Convenio FONPLATA" y el acuerdo con Qatar (Exp. 115-S-18) — los tres acuerdos internacionales, probablemente iniciados durante la gestión de Macri pero votados después. Se confirmó con el usuario que `bloque_autor` para esos 3 sea "Frente De Todos" (coalición vigente al momento del voto), no "Pro".
- **Por qué**: consistente con la regla ya acordada en la spec 011 (2026-07-17): lo que importa es qué gobierno impulsa el proyecto al momento del voto, no quién lo inició o firmó originalmente. Los acuerdos internacionales tardan en tratarse y pueden empezar bajo un gobierno y votarse bajo otro.
- **Impacto**: `notebooks/STG_5.2_features_autor.ipynb`, celda `49e08ccf` (T6 spec 012) — el notebook ya aplica este criterio por default (manda la tabla de períodos ante discrepancia), no hizo falta cambiar código.

### [2026-07-18] — Spec 012, T9: primera evidencia real para la duda PRO/LLA (útil para spec 013)
- **Tipo**: decisión
- **Qué**: tras integrar los 218 títulos manuales, por primera vez `es_oficialista`/`coincide_bloque_autor` difieren entre escenario A (PRO fuera de LLA) y B (PRO dentro de LLA) en 3 títulos: autores del bloque Pro (Finocchiaro, Lospennato, Juez/Álvarez Rivero/Vigo) votados en 2024-2025 bajo el gobierno de Milei. Antes de esta spec (312 títulos) ningún caso disparaba la diferencia — por eso en el cierre de la spec 011 se registró "A y B idénticos".
- **Por qué**: es justamente el fenómeno que la spec 011 dejó pendiente de resolver empíricamente en la spec 013 (comparar F1-macro con cada escenario). Ahora hay 3 títulos reales que lo ponen a prueba, en vez de cero.
- **Impacto**: no cambia nada de lo ya decidido; es un dato a tener presente al comparar escenarios en la spec 013. También: `tabla_autor_bloque.csv` ahora tiene una fila de autor "PEN" (103 títulos, bloque=La Libertad Avanza por ser la coalición más reciente) — refuerza la decisión ya tomada de no usar esa tabla para el selector de autor hipotético de la app.

### [2026-07-18] — Spec 012 COMPLETA: integración de autores manuales 2019+ en STG_5.2
- **Tipo**: decisión
- **Qué**: se cerraron las 12 tareas de `specs/012-autores-manuales-2019/tasks.md`. `notebooks/STG_5.2_features_autor.ipynb` (spec 011) se extendió — sin notebook nuevo — para integrar `data/titulos_autor_manual.xlsx` (220 filas, 218 títulos únicos de 2019+ completados a mano por el equipo con autor y bloque). Resultado:
  - **Cobertura de autoría**: 312 → **530 títulos** con autor conocido (de 1022 totales); sin-autor 710 → **492**.
  - **Cruce por `id_votacion`** (no por texto — el Excel tiene encoding roto), con dedupe de 2 filas repetidas (220→218).
  - **103 títulos "PEN"** (Poder Ejecutivo Nacional) → `es_poder_ejecutivo=1`, `es_oficialista=1`, `bloque_autor` = coalición vigente **a la fecha de cada voto** (FRENTE DE TODOS 2020-2023, LA LIBERTAD AVANZA desde 2024 — verificado título por título que varía correctamente con la fecha, no es un valor fijo). Verificación cruzada contra el bloque cargado a mano: 100/103 coincidían; 3 discrepancias (acuerdos internacionales FONPLATA/Qatar/OD93, cargados como "Pro" pero votados en 2020 bajo FdT) resueltas a favor de la coalición vigente, con acuerdo explícito del usuario.
  - **115 títulos de legisladores** → bloque cargado a mano específico del título, reutilizando la categoría `fuente_bloque_autor='manual'` ya existente (sin agregar categorías nuevas, sin tocar los chequeos de T8/T9 salvo un fix necesario).
  - **Normalización de bloques**: de 17 bloques distintos, 13 matchean verbatim contra votantes actuales; 4 son bloques reales sin votantes actuales (documentado, no error) — no hizo falta ningún diccionario de corrección.
  - **Bug corregido**: el assert de T9(d) tenía `312` hardcodeado; se cambió a un total calculado dinámicamente para no romper con conteos futuros.
  - **No-regresión verificada**: los 312 títulos originales quedaron idénticos byte a byte. **Reproducibilidad verificada**: dos corridas completas dieron las tres salidas idénticas byte a byte.
  - **Hallazgo para la spec 013**: por primera vez aparecen 3 títulos donde escenario A (PRO fuera de LLA) y B (PRO dentro) difieren en `es_oficialista`/`coincide_bloque_autor` — autores Pro votados bajo Milei (Finocchiaro, Lospennato, Juez et al.). Antes de esta spec, cero títulos disparaban esa diferencia.
- **Por qué**: aprovechar el trabajo manual del equipo, concentrado justamente en el período 2019+ que más pesa para predecir la Cámara actual.
- **Validado (T11)**: los 7 criterios de aceptación de `spec.md` marcados con evidencia.
- **Impacto**: `notebooks/STG_5.2_features_autor.ipynb` (modificado, 5 celdas nuevas + 1 corregida), `data/df_modelado_autor.csv` (regenerado, 28.738×19), `data/tabla_autor_bloque.csv` (regenerado, 251 autores — incluye una fila pseudo-autor "PEN" que resume su último bloque conocido, LLA; no afecta el entrenamiento, solo refuerza no usar esta tabla para el selector de autor hipotético de la app), `data/autores_pendientes.csv` (sin cambios, 4 títulos/2 autores). **Próximo paso**: spec 013 — reentrenar el modelo con autoría más completa y comparar F1-macro entre escenario A y B (PRO dentro/fuera de LLA), usando ahora evidencia empírica real en vez de cero casos.

### [2026-07-18] — Spec 011 COMPLETA: features de autoría (`bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`)
- **Tipo**: decisión
- **Qué**: se cerraron las 13 tareas de `specs/011-bloque-autor/tasks.md`. `notebooks/STG_5.2_features_autor.ipynb` resuelve, para los 312 títulos con autor conocido (de 1022 totales), su `bloque_autor` mediante una cascada de 4 pasos (manual → ejecutivo → histórico → pendiente) y deriva las otras 3 features binarias + sus variantes de escenario B (duda PRO/LLA). Resultado final por fuente (tras el completado manual del equipo):
  - **312 títulos con autor** → `manual` 35, `ejecutivo` 90, `historico` 183, `pendiente` 4 (2 autores sin resolver: "Asuntos Constitucionales", colectivo sin bloque real, y "Peña, Marcos", homónimo del JGM de Macri en títulos de Presupuesto 1995-1997 — no puede ser la misma persona).
  - **710 títulos sin autor conocido** → `SIN_DATO` (categoría explícita, no vacío silencioso).
  - `es_poder_ejecutivo`: -1 en 714 títulos, 0 en 209, 1 en 99. `es_oficialista`: -1 en 714, 0 en 89, 1 en 219 (idéntico en escenario A y B — el PRO no cambia ningún título porque ningún autor legislador conocido es del PRO bajo Milei). `coincide_bloque_autor` a nivel de fila (28.738 filas): escenario A → -1 en 21.580, 0 en 5.058, 1 en 2.100; escenario B → -1 en 21.580, 0 en 4.927, 1 en 2.231 (119 filas cambian, todas votantes del PRO ante proyectos del Ejecutivo de Milei — la señal empírica que la spec 012 va a evaluar).
- **Validación (T9-T12)**: 5 chequeos automáticos permanentes (consistencia PE⇒oficialista, existencia de legisladores oficialistas, anti-leakage verificado explícitamente, sin vacíos silenciosos, coincide verificado con casos concretos); reproducibilidad confirmada byte a byte (T11); los 9 criterios de aceptación de `spec.md` marcados con evidencia (T12).
- **Deuda de datos detectada durante el completado manual (avisada por el usuario, no bloqueante para esta spec)**: al completar `tabla_autor_bloque_manual.csv`, el usuario notó que el match **fuzzy** de la spec 006 falló en algunos casos — le había asignado a un autor el título de otro proyecto. Como corrección práctica para que el entrenamiento funcione, en esos casos se cargó en la tabla manual el bloque del **proyecto verdadero** (no el bloque real de la persona), porque cada uno de esos autores aparece en un solo título. Esto dejó **`tabla_autor_bloque.csv` con datos factualmente incorrectos para esas personas puntuales** (su bloque ahí no es el suyo real, es el del proyecto al que terminó pegado por el fuzzy). No afecta el entrenamiento (que es lo que importaba resolver ahora), pero si en el futuro se usa `tabla_autor_bloque.csv` para otra cosa, hay que tenerlo presente. Refuerza que mejorar el matching fuzzy de la spec 006 (ya anotado como fuera de alcance) es una spec futura de valor.
- **Decisión de diseño para la app futura (ver entrada 2026-07-18 más arriba)**: `tabla_autor_bloque.csv` NO debe usarse para el selector de autor hipotético — ese selector debe construirse a partir de la nómina de diputados actuales (bloque vigente) + una opción "Poder Ejecutivo Nacional" (hoy La Libertad Avanza).
- **Impacto**: archivos nuevos en `data/`: `tabla_periodos_presidenciales.csv`, `tabla_autor_bloque_manual.csv` (30 autores, 28 completados por el equipo), `df_modelado_autor.csv` (28.738×19), `tabla_autor_bloque.csv` (162 autores), `autores_pendientes.csv` (4 títulos, 2 autores). Notebook nuevo: `notebooks/STG_5.2_features_autor.ipynb`. **Próximo paso**: spec 012 — reentrenar el modelo con estas features, comparar F1-macro entre escenario A y B (PRO dentro/fuera de LLA), y registrar cuál queda como definición oficial.

### [2026-07-18] — Spec 013: reentrenamiento con features de autoría, solo votaciones 2019+ (APROBADA)
- **Tipo**: decisión
- **Qué**: se aprobó `specs/013-reentrenar-modelo-features-autor/spec.md`. Alcance: reentrenar el modelo de votos incorporando las 4 features de autoría (specs 011/012), restringiendo el entrenamiento a votaciones de **2019 en adelante** (excluir 2018 inclusive para atrás como filas objetivo), excluyendo 4 votaciones anómalas (`id_votacion` 1925, 3527, 3585, 3494), y resolviendo empíricamente la duda PRO dentro/fuera de LLA (escenario A vs. B). Se **vuelven a comparar los 6 modelos de la spec 009** (no solo LightGBM) en cada escenario, con optimización de hiperparámetros del mejor y validación temporal.
- **Decisiones acordadas con el usuario en la especificación**: (1) las features históricas se calculan con **todo el historial disponible** (incluidos votos pre-2019), y el filtro a 2019+ se aplica **después** de calcularlas — preserva la memoria de cada diputado sin romper anti-leakage; (2) la comparación se hace contra el **benchmark histórico 0.453** (spec 009) como referencia, dejando aclarado que la población cambió (menos años, otra Cámara) y no es una comparación estrictamente pareja; (3) los 4 ids se excluyen por **datos anómalos/erróneos**.
- **Riesgos anotados para /planificar**: comparación no pareja contra el 0.453; posible caída de métrica por menos volumen de datos; la diferencia A vs. B puede ser chica o no concluyente (solo 3 títulos difieren); leakage si se filtra a 2019+ antes de calcular features; verificar cobertura de autoría en el subconjunto 2019+.
- **Fuera de alcance**: actualizar API/app con el nuevo modelo (reserializar STG_8 + `/predecir`), mejorar el fuzzy de la spec 006, completar los 492 títulos sin autor, deploy en Render.
- **Impacto**: `specs/013-reentrenar-modelo-features-autor/spec.md` (nuevo). Próximo paso: `/planificar`.

### [2026-07-18] — Plan 013 (APROBADO): reuso del pipeline de la spec 009 con autoría + recorte 2019+
- **Tipo**: decisión
- **Qué**: se aprobó `specs/013-reentrenar-modelo-features-autor/plan.md`. Diseño: 3 notebooks nuevos (numeración decimal) — `STG_5.3_dataset_entrenamiento_autor.ipynb` (arma `df_entrenamiento_autor.csv` reusando la ingeniería de features de STG_5 + las features de autor de `df_modelado_autor.csv`), `STG_6.2_modelado_autor.ipynb` (6 modelos × 2 escenarios A/B, elige ganador, compara vs 0.453) y `STG_7.2_tuning_autor.ipynb` (RandomizedSearchCV del ganador). Sin librerías nuevas, sin pisar artefactos de la spec 009. Constitution Check: pasa los 8 principios.
- **Orden de operaciones clave (anti-leakage)**: (1) leer todos los años → (2) sacar las 4 votaciones anómalas → (3) sacar AUSENTE → (4) pegar embeddings → (5) calcular features históricas con historial COMPLETO (`cumsum().shift(1)`) → (6) assert anti-leakage sobre todos los años → (7) rellenar NaN → (8) normalizar+codificar `bloque_autor` → (9) **recién acá filtrar a 2019+** → (10) guardar. El recorte a 2019+ va al final para que cada voto conserve toda su memoria histórica previa.
- **Hallazgos de datos verificados (ground truth sobre `df_modelado_autor.csv`, 28.738×19)**: (a) las **4 votaciones anómalas son TODAS pre-2019** (id 1925→2009, 3527→1996, 3585→1995, 3494→1997) — el filtro de año ya las excluiría de las filas de entrenamiento, así que sacarlas solo tiene efecto si se hace **antes** de calcular el historial (para no contaminar la afinidad acumulada); (b) **2019+ conserva 20.608 filas sin AUSENTE de 25.082 (~82%)** — la pérdida de volumen es moderada, no drástica; (c) **cobertura de autoría en 2019+ = 98,3%** (solo 342 filas SIN_DATO); (d) `bloque_autor` tiene la **misma coalición con distinta grafía** ("Frente De Todos" vs "FRENTE DE TODOS", "La Libertad Avanza" vs "LA LIBERTAD AVANZA") — hay que normalizar mayúsculas/tildes antes de codificarla como feature, o el modelo la trataría como dos bloques distintos.
- **Escenario A/B**: comparten `bloque_autor` y `es_poder_ejecutivo`; A usa `es_oficialista`/`coincide_bloque_autor`, B usa `es_oficialista_b`/`coincide_bloque_autor_b`. Si la diferencia de F1-macro cae dentro del desvío de la CV, se declara "no concluyente" y se elige por criterio secundario explícito.
- **Impacto**: `specs/013-reentrenar-modelo-features-autor/plan.md` (nuevo). Próximo paso: `/tareas`.

### [2026-07-19] — Spec 013 COMPLETA: modelo reentrenado con autoría, 2019+, ganador LGBM Escenario A (F1-macro holdout 0.581)
- **Tipo**: decisión
- **Qué**: se cerraron las 19 tareas de `specs/013-reentrenar-modelo-features-autor/tasks.md`. Se crearon 3 notebooks nuevos:
  - `STG_5.3_dataset_entrenamiento_autor.ipynb` → `data/df_entrenamiento_autor.csv` (20.608 filas × 408 cols: 7 meta + 394 base + 6 autor + 1 target). Historial calculado sobre los 25.082 votos (todos los años, sin AUSENTE) y recién después recortado a 2019+. Los 4 `id_votacion` anómalos (1925, 3527, 3585, 3494) participaron del historial (no se excluyeron del cálculo, por decisión explícita del usuario) pero quedaron fuera de las filas de entrenamiento al ser todos pre-2019 (verificado T10: 0 apariciones). `bloque_autor` normalizado (sin tildes, mayúsculas, espacios colapsados — misma convención que match de diputados) colapsó 55→51 valores únicos (4 pares de grafía duplicada, ej. "Frente De Todos"/"FRENTE DE TODOS"), sin tocar bloques genuinamente distintos (ej. "Ucr" vs "Ucr - Union Civica Radical").
  - `STG_6.2_modelado_autor.ipynb` → comparó los 6 modelos de la spec 009 (Dummy, LogReg, RandomForest, Bagging, XGBoost, LightGBM) en 2 escenarios (A: PRO fuera de LLA, B: PRO dentro), 12 combinaciones en total. **Ganador: LGBMClassifier + Escenario A, holdout F1-macro = 0.581** (vs. benchmark histórico 0.453 de la spec 009, +28.3% — comparación de referencia, no pareja, por distinta población de años). LGBM Escenario B dio 0.531; la diferencia (0.050) resultó **menor al desvío de la CV (0.081) → no concluyente estadísticamente**.
  - `STG_7.2_tuning_autor.ipynb` → `RandomizedSearchCV` sobre LightGBM/Escenario A. El afinado mejora la CV (0.468 vs 0.406) pero **empeora el holdout (0.534 vs 0.581, -8.1%)** — mismo patrón que STG_7 de la spec 009 (tuning no supera al default). **El modelo final queda siendo LightGBM con los hiperparámetros por defecto.**
- **Definición oficial del PRO — Escenario A (PRO fuera de la coalición de Milei)**: confirmada explícitamente por el usuario ante la AskUserQuestion, con tres razones: (1) gana en holdout aunque el margen no sea estadísticamente aplastante; (2) es más consistente entre folds (menor desvío de CV); (3) es institucionalmente más defendible — el PRO sigue siendo, formalmente, un bloque propio y distinto de LLA en la Cámara. Esta definición cierra la duda que quedó abierta desde la spec 011 (2026-07-17).
- **Hallazgo no anticipado**: `LogisticRegression` colapsa en el holdout en ambos escenarios (CV ~0.41 → holdout 0.108-0.126), muy por debajo de su propio CV. Hipótesis: `class_weight='balanced'` sobre-corrige hacia las clases minoritarias (NEGATIVO/ABSTENCIÓN) justo en un holdout donde AFIRMATIVO está sobrerrepresentado (83.9% vs. 76.6% global) por ser el período más reciente. No se investigó a fondo por no ser el modelo ganador; queda como nota para quien reuse LogReg en este dataset.
- **Incidente operativo (no afecta el resultado final, documentado por transparencia)**: la sesión de Claude Code se cortó una vez a mitad del tuning (T17) por cierre de la app/máquina en reposo — el proceso murió sin guardar nada (mensaje `Parent appears to have exited, shutting down` en el log de Jupyter). Se perdió tiempo de cómputo pero ningún resultado ya validado (T1-T16 quedaron intactos en disco). Además, `RandomizedSearchCV` con la grilla completa (`n_iter=30`, 150 ajustes) tardó más de 60 minutos sin terminar en la máquina disponible; se redujo a `n_iter=15` (75 ajustes, ~77 min) con autorización explícita del usuario. **Lección**: para búsquedas largas en esta máquina, presupuestar el doble del tiempo que en la spec 009, y preferir `n_iter` más chico si hay restricción de tiempo — no compromete la validez metodológica (sigue usando `TimeSeriesSplit`, `random_state` fijo), solo la exhaustividad de la búsqueda.
- **Validado (T18)**: los 12 criterios de aceptación de `spec.md` marcados con evidencia (notebook + tarea de origen).
- **Impacto**: notebooks nuevos: `STG_5.3_dataset_entrenamiento_autor.ipynb`, `STG_6.2_modelado_autor.ipynb`, `STG_7.2_tuning_autor.ipynb`. Datos nuevos en `data/`: `df_entrenamiento_autor.csv`, `encoder_bloque_autor.joblib`, `encoder_bloque_provincia_autor.joblib`, `le_voto_autor.joblib`. Artefactos en `specs/013-reentrenar-modelo-features-autor/`: `tabla_comparativa_modelos_autor.csv`, `comparacion_modelos_autor.png`, `matriz_confusion_ganador_autor.png`, `comparacion_default_vs_afinado_autor.csv`, `comparacion_tuning_autor.png`. No se tocó ningún artefacto de la spec 009. **Próximo paso**: fuera de alcance de esta spec — reserializar el modelo ganador (LGBM por defecto, Escenario A) para la API/app (equivalente a un nuevo STG_8) queda para una spec futura. Recordar correr `/revisar`.
