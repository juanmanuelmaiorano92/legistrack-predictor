# Spec 006 — Mover la búsqueda de autor al STG 3 y exportar tabla de autoría

## Objetivo
Trasladar toda la lógica de asignación de autor de proyecto desde STG 2 a STG 3, de modo
que STG 2 quede exclusivamente para la consolidación de votos. Además, generar un Excel de
auditoría con los datos de autoría de cada título único.

## Problema que resuelve
Hoy STG 2 hace dos cosas mezcladas: consolida las votaciones por proyecto Y busca el autor
de cada proyecto. Eso dificulta entender y mantener el pipeline. La búsqueda de autor es
semánticamente más cercana al filtrado y enriquecimiento de títulos que ya ocurre en STG 3,
así que corresponde moverla allí.

## Qué construir (en lenguaje funcional)

**Qué entra:**
- `data/df_consolidado.csv` — el dataset consolidado que produce STG 2 (votos por diputado
  y proyecto, sin columnas de autor). A partir de esta spec, STG 2 también deberá conservar
  `id_votacion` durante la consolidación (ver más abajo).
- `data/proyectos_parlamentarios2.1.csv` — el catálogo de proyectos descargado del Congreso,
  con título, expediente, autor y cámara de origen.

**Qué hace STG 3 (además de lo que ya hace):**
1. Carga el catálogo de proyectos parlamentarios.
2. Para cada título único en `df_consolidado`, intenta encontrar el proyecto parlamentario
   que le corresponde usando dos estrategias en cascada:
   - **Match exacto**: si el título del catálogo coincide de forma directa.
   - **Match por similitud (fuzzy)**: si el exacto falla, busca el proyecto más parecido
     usando similitud entre textos (TF-IDF + coseno). Solo se acepta si el puntaje supera
     un umbral mínimo de confianza (0.70 por defecto).
3. Registra, para cada título, qué autor se asignó, por qué método y con qué puntaje.
4. Agrega esas columnas al dataset de trabajo (`df_modelado`):
   `autor_final`, `camara_origen`, `fuente_autor`, `score_fuzzy`.

**Qué sale:**
- `data/df_modelado.csv` actualizado — mismo archivo de salida de STG 3, ahora con las
  columnas de autor incluidas.
- `data/titulos_autor.xlsx` — tabla de auditoría con una fila por título único de
  votación, pensada para que el equipo complete manualmente los autores que faltan.
  Columnas:
  - `titulo_votacion` → el `titulo_base` limpio de la votación
  - `fecha_votacion`  → la fecha de votación más reciente asociada a ese título
  - `id_votacion`     → el id numérico de la votación en la web de la HCDN
    (ej: `5902`), que el scraping agrega a cada fila. Se toma el primer valor
    del grupo al consolidar en STG 2. Puede ser vacío si la fila original no lo tenía.
  - `autor_final`     → autor asignado (vacío si no se encontró)
  - `fuente_autor`    → método de asignación: `determinístico`, `fuzzy`, o vacío
  - `score_fuzzy`     → puntaje de similitud del match fuzzy (0 a 1); vacío si el
    método fue determinístico o no hubo match

**Ajuste menor en STG 2:**
- Se eliminan las celdas que cargan el catálogo de proyectos y hacen la búsqueda de autor.
- Se agrega `id_votacion` a las columnas de contexto que se conservan durante la
  consolidación (como `first`, es decir, se toma el primer id del grupo). Esto es necesario
  para que `id_votacion` esté disponible en STG 3 y en el Excel de salida.
  El `id_votacion` es el número de votación de la web de la HCDN (ej: `5902`), que el
  scraping agrega como columna y que actualmente se pierde en el `groupby` de consolidación.

## Datos involucrados
- `data/df_consolidado.csv`: columnas `diputado`, `titulo_base`, `bloque`, `provincia`,
  `voto`, `fecha_votacion`, `id_votacion` (a partir de este cambio).
- `data/proyectos_parlamentarios2.1.csv`: columnas `TITULO`, `EXP_DIPUTADOS`, `EXP_SENADO`,
  `AUTOR`, `CAMARA_ORIGEN`.

## Criterios de aceptación
- [ ] STG 2 ya no contiene ninguna celda que cargue `proyectos_parlamentarios2.1.csv` ni
      calcule `autor_final`.
- [ ] El `df_consolidado` producido por STG 2 **después** del cambio es idéntico al
      producido **antes**, excepto por la columna nueva `id_votacion`. Se valida que:
      el número de filas es el mismo, la distribución de votos es la misma, y los valores
      de `diputado`, `titulo_base`, `bloque`, `provincia`, `voto` y `fecha_votacion`
      son iguales fila a fila.
- [ ] STG 3 produce `df_modelado.csv` con las cuatro columnas de autor:
      `autor_final`, `camara_origen`, `fuente_autor`, `score_fuzzy`.
- [ ] Se genera `data/titulos_autor.xlsx` con las columnas:
      `titulo_votacion`, `fecha_votacion`, `id_votacion`, `autor_final`, `fuente_autor`,
      `score_fuzzy`. Las filas sin autor están presentes para completado manual.
- [ ] El umbral de fuzzy matching y el nombre del archivo de proyectos están parametrizados
      en variables al principio de la celda (no hardcodeados en la lógica).
- [ ] El notebook STG 3 puede correrse de punta a punta sin errores después del cambio.
- [ ] STG 2 puede correrse de punta a punta sin errores después del cambio.
- [ ] Cumple la CONSTITUCIÓN: no hay leakage (el autor de un proyecto no depende de votos
      futuros), la lógica es reproducible (mismo resultado en cada corrida).

## Fuera de alcance
- No se completa ni se edita manualmente la tabla de autores faltantes (eso es trabajo del
  equipo sobre `titulos_autor.xlsx`).
- No se cambia el algoritmo de fuzzy matching ni el umbral (quedan como están en STG 2).
- No se modifica STG 4 ni ningún notebook posterior.
- No se agrega ninguna lógica de modelado.

## Riesgos conocidos
- El archivo `proyectos_parlamentarios2.1.csv` no está en el repositorio (es un dato grande).
  Si no está en `data/`, el notebook falla con un error claro. La spec asume que el archivo
  está disponible localmente.
- La cobertura de la búsqueda de autor es limitada (~31%, según decisión anterior registrada
  en `memoria/DECISIONES.md`). Esto no es un bug: los títulos sin match quedarán con
  `autor_final = NaN` y `fuente_autor = sin_autor`.
- El fuzzy matching por TF-IDF puede ser lento si hay muchos títulos únicos. El código de
  STG 2 ya lo procesa en lotes (BATCH_SIZE = 200); se mantiene esa estrategia.
