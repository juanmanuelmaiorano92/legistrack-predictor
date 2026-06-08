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
