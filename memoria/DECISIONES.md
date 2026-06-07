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

<!-- Nuevas entradas debajo de esta línea -->
