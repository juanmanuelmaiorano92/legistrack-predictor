# Tareas 006 — Mover la búsqueda de autor al STG 3 y exportar tabla de autoría

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

---

## Parte A — Ajustar STG 2

- [x] T1 — Registrar métricas de control del `df_consolidado.csv` actual ("antes"):
      número de filas, distribución de `voto`, diputados únicos, títulos únicos.
      Guardar esos valores como comentario en la primera celda de validación del notebook
      o imprimirlos al correr STG 2. Sirven de referencia para T3.

- [x] T2 — En STG 2, agregar `id_votacion` a `cols_contexto` (la lista que se pasa al
      `agg`) con la función `'first'`, para que el id de votación de la HCDN sobreviva
      la consolidación y aparezca en `df_consolidado.csv`. (depende de: T1)

- [x] T3 — Correr STG 2 completo y verificar que el resultado es idéntico al "antes"
      excepto por la columna nueva `id_votacion`: mismo número de filas, misma
      distribución de `voto`, mismos valores en `diputado`, `titulo_base`, `bloque`,
      `provincia`, `voto`, `fecha_votacion` fila a fila. Si algo difiere, frenar y
      corregir antes de continuar. (depende de: T2)

- [x] T4 — Eliminar de STG 2 las celdas que cargan `proyectos_parlamentarios2.1.csv`,
      hacen el match exacto y fuzzy, y exportan `titulos_autor.xlsx` y
      `autores_manuales.xlsx`. Verificar que STG 2 corre de punta a punta sin errores
      y que `df_consolidado.csv` se guarda correctamente al final. (depende de: T3)

---

## Parte B — Ampliar STG 3

- [x] T5 — En STG 3, agregar una celda de parámetros al inicio de la nueva sección
      (después de la celda de aplicación del filtro) con las variables:
      `URL_PROYECTOS = '../data/proyectos_parlamentarios2.1.csv'`,
      `THRESHOLD_FUZZY = 0.70`, `BATCH_SIZE = 200`.
      Agregar un comentario de aviso que indique que el archivo de proyectos debe estar
      en `data/` para que esta sección funcione. (depende de: T4)

- [x] T6 — Agregar celda de carga del catálogo de proyectos: leer
      `proyectos_parlamentarios2.1.csv`, quedarse con las columnas
      `['TITULO', 'EXP_DIPUTADOS', 'EXP_SENADO', 'AUTOR', 'CAMARA_ORIGEN']`
      e imprimir cuántos proyectos se cargaron. (depende de: T5)

- [x] T7 — Agregar las celdas de match exacto (por expediente extraído del título) y
      match fuzzy (TF-IDF + coseno en lotes de BATCH_SIZE), copiadas y adaptadas de
      STG 2. La búsqueda opera sobre los títulos únicos de `df_modelado` (no de
      `df_consolidado`). Al final, imprimir la cobertura: cuántos títulos tuvieron
      match determinístico, fuzzy, y cuántos quedaron sin autor. (depende de: T6)

- [x] T8 — Agregar celda de merge: pegar las columnas `autor_final`, `camara_origen`,
      `fuente_autor`, `score_fuzzy` de vuelta en `df_modelado` usando `titulo_base`
      como clave. Si `df_modelado` ya tuviera esas columnas de una corrida anterior,
      descartarlas antes del merge para evitar duplicados. (depende de: T7)

- [x] T9 — Reemplazar (o actualizar) la celda de exportación de `df_modelado.csv` al
      final de STG 3 para que incluya las nuevas columnas de autor. Verificar que el
      archivo se guarda en `../data/df_modelado.csv` con encoding `utf-8-sig`. (depende de: T8)

- [x] T10 — Agregar celda de exportación de `titulos_autor.xlsx`: una fila por título
       único de votación, con las columnas `titulo_votacion`, `fecha_votacion`,
       `id_votacion`, `autor_final`, `fuente_autor`, `score_fuzzy`. Ordenar por
       `fuente_autor` (primero los sin autor) para facilitar el completado manual.
       Guardar en `../data/titulos_autor.xlsx`. (depende de: T9)

---

## Verificación final

- [x] T11 — Correr STG 3 de punta a punta y verificar:
       - `df_modelado.csv` tiene las columnas `autor_final`, `camara_origen`,
         `fuente_autor`, `score_fuzzy` además de las columnas originales.
       - `titulos_autor.xlsx` tiene exactamente las seis columnas especificadas y
         contiene filas sin autor (para completado manual).
       (depende de: T10)

- [x] T12 — Validar contra todos los criterios de aceptación de la spec 006:
       recorrer cada ítem y marcar cumplido o indicar qué falta. (depende de: T11)

- [x] T13 — Registrar el cierre de la spec 006 en `memoria/DECISIONES.md`:
       decisión técnica tomada, archivos modificados, cobertura de autor obtenida.
       (depende de: T12)
