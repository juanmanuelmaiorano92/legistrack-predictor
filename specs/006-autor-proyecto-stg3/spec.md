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
  y proyecto, sin columnas de autor).
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
- `data/titulos_autor.xlsx` — tabla de auditoría con una fila por título único, pensada
  para que el equipo complete manualmente los autores que faltan:
  `titulo_base`, `id_proyecto` (expediente), `fecha_votacion` (la más reciente asociada
  a ese título),
  `autor_final`, `fuente_autor` (`exacto` / `fuzzy` / `sin_autor`), `score_fuzzy`.

**Qué deja de hacer STG 2:**
- STG 2 se limpia: se eliminan las celdas que cargan el catálogo de proyectos y hacen la
  búsqueda de autor. STG 2 solo consolida votos y guarda `df_consolidado.csv`.

## Datos involucrados
- `data/df_consolidado.csv`: columnas `diputado`, `titulo_base`, `bloque`, `provincia`,
  `voto`, `fecha_votacion`.
- `data/proyectos_parlamentarios2.1.csv`: columnas `TITULO`, `EXP_DIPUTADOS`, `EXP_SENADO`,
  `AUTOR`, `CAMARA_ORIGEN`.

## Criterios de aceptación
- [ ] STG 2 ya no contiene ninguna celda que cargue `proyectos_parlamentarios2.1.csv` ni
      calcule `autor_final`.
- [ ] STG 3 produce `df_modelado.csv` con las cuatro columnas de autor:
      `autor_final`, `camara_origen`, `fuente_autor`, `score_fuzzy`.
- [ ] Se genera `data/titulos_autor.xlsx` con las columnas:
      `titulo_base`, `id_proyecto`, `fecha_votacion`, `autor_final`, `fuente_autor`,
      `score_fuzzy`. Las filas con `fuente_autor = sin_autor` están presentes para
      completado manual.
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
