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
