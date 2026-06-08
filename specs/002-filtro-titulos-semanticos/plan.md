# Plan 002 — Filtro de títulos sin valor semántico

## Enfoque técnico

El filtro funciona en dos fases separadas por una revisión humana obligatoria:

1. **Fase de identificación** (celda de inspección): se aplican patrones de texto
   sobre `titulo_base` y se genera una lista de todos los títulos que serían
   descartados. El equipo la revisa antes de que se elimine nada.

2. **Fase de aplicación** (celda de filtrado): una vez aprobada la lista, se
   eliminan del DataFrame todas las filas cuyos `titulo_base` están en esa lista.
   El resultado se guarda como `df_modelado.csv`.

Los patrones son reglas de texto simples (expresiones regulares). No hay modelo de
ML involucrado en este paso: es limpieza de datos determinista y auditable.

## Librerías y herramientas

- **`pandas`**: para filtrar filas del DataFrame. Ya está en el proyecto.
- **`re`** (módulo estándar de Python): para las expresiones regulares. No requiere
  instalación adicional.

No se agrega ninguna librería nueva.

## Diseño anti-leakage / validación

Este paso **no genera features ni entrena ningún modelo**, por lo que no existe
riesgo de fuga de información (data leakage) ni se requiere validación temporal.

El filtro opera únicamente sobre el texto del `titulo_base`: no usa la columna
`voto`, no usa `fecha_votacion`, y no agrega información que no estuviera ya en
el título original. Es un paso de limpieza pura.

El único riesgo de integridad es eliminar filas que no deberían eliminarse (falsos
positivos), por eso la revisión humana es obligatoria antes de aplicar.

## Pasos de implementación

Se implementa en el notebook `STG_3_filtro_titulos.ipynb`.

1. **Cargar `df_consolidado`** desde `data/df_consolidado.csv`.

2. **Definir los patrones de filtrado** como una lista de expresiones regulares,
   con un comentario que explica a qué categoría corresponde cada uno:
   - Expedientes sin descripción (`EXPTE. XXXX`, `Exp. XX-S-XX`)
   - Habilitaciones de tratamiento
   - Insistencias sin descripción
   - Mociones (emplazamiento, reconsideración)
   - Apartamientos del reglamento
   - Listas de ODs sin descripción
   - Plan de labor
   - Votación en general sin título propio
   - Pliegos de magistrados (`Exp. 7835-D-00`)

3. **Función `es_sin_valor(titulo)`**: aplica todos los patrones. Devuelve `True`
   si el título debe descartarse. Incluye la regla especial para `Exp.`/`Expte.`:
   solo descarta si no hay descripción temática después del número.

4. **Celda de inspección** (separada, con título en negrita):
   - Calcula `titulos_a_filtrar`: lista de títulos únicos que la función marcaría.
   - Los muestra en pantalla para revisión.
   - Muestra también cuántas filas representa cada título.
   - **No aplica el filtro todavía.**

5. **Celda de aplicación** (separada, con advertencia):
   - Solo ejecutar después de revisar la celda anterior.
   - Filtra `df_consolidado` excluyendo las filas en `titulos_a_filtrar`.
   - Imprime resumen: títulos únicos eliminados, filas eliminadas, filas restantes.

6. **Guardar** el resultado como `data/df_modelado.csv`.

## Reproducibilidad

- No hay fuente de azar en este paso (no se usa `random_state`).
- **Entrada**: `data/df_consolidado.csv` (no se toca).
- **Salida**: `data/df_modelado.csv` (archivo nuevo).
- **Notebook**: `STG_3_filtro_titulos.ipynb`.
- Los patrones de filtrado están escritos en el propio notebook y son la única
  fuente de verdad: cualquiera que corra el notebook obtiene exactamente el mismo
  resultado.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|--------|-----------|
| Falsos positivos: se filtran títulos que deberían conservarse | La celda de inspección obliga a revisar la lista antes de aplicar. Los 6 casos borderline están documentados en la spec. |
| Falsos negativos: títulos basura que no matchean los patrones | Impacto bajo: el modelo simplemente tendrá algo más de ruido. Se puede correr de nuevo el filtro si se detectan más casos. |
| Se sobreescribe `df_consolidado` por error | El notebook escribe siempre a `df_modelado.csv`. El nombre de archivo de salida es diferente. |
| Patrones que rompan con nuevas votaciones | No aplica para este dataset congelado. Si se agregan datos nuevos, re-correr la celda de inspección. |
