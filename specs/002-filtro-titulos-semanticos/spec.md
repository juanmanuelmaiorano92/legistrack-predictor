# Spec 002 — Filtro de títulos sin valor semántico

## Objetivo

Eliminar de `df_consolidado` todos los registros cuyo `titulo_base` no describe el
contenido temático de una ley, porque esos títulos no aportan información útil para
predecir votos y ensucian el entrenamiento del modelo.

## Problema que resuelve

El dataset actual contiene votaciones sobre mociones procedimentales, habilitaciones de
expedientes, planes de labor y otros ítems de agenda que no son proyectos de ley
sustantivos. Un modelo entrenado con esos títulos aprende ruido en lugar de patrones
temáticos, y además genera predicciones sin sentido para cualquier ley nueva que se
consulte (ninguna ley real se llamará "MOCIÓN DE EMPLAZAMIENTO SOLICITADA POR EL
DIP. X").

## Qué construir (en lenguaje funcional)

Se construye un **filtro de títulos**. Dado el listado de `titulo_base` únicos en
`df_consolidado`, el filtro identifica y descarta aquellos que pertenecen a alguna de
estas categorías:

| Categoría | Ejemplos |
|-----------|---------|
| Expediente solo (número sin descripción) | `EXPTE. 5297-D-2025`, `Exp. 3-PE-09` |
| Habilitación de tratamiento | `HABILITACIÓN DEL TRATAMIENTO EXPTE. 9-PE-2025` |
| Insistencia de ley (sin descripción) | `INSISTENCIA PROYECTO DE LEY 27.795` |
| Moción de emplazamiento | `MOCIÓN DE EMPLAZAMIENTO SOLICITADA POR EL DIP. FERRARO` |
| Moción de reconsideración | `MOCION DE RECONSIDERACION SOLICITADA POR EL DIP. CASTILLO` |
| Apartamiento del reglamento | `APARTAMIENTO DEL REGLAMENTO SOLICITADO POR LA DIP. MATZEN` |
| Lista de órdenes del día sin descripción | `OD 86 - 89 - 90 - 92 - ...` |
| Plan de labor | `PLAN DE LABOR` |
| Votación en general sin título propio | `VOTACIÓN EN GRAL. Y PARTICULAR EMERGENCIA PROVINCIAS DE BS.AS. Y SANTA FE` |
| Pliegos de magistrados | `Exp. 7835-D-00 Ord. Día 395 Dict. Mayoría Dr. Nazareno J.` |

**Regla clave para expedientes**: un título que empieza con `Exp.` o `Expte.` se
descarta **solo si no tiene descripción temática** después del número. Se conservan
títulos como:
- `Expte. 0089-S-2020. DE LEY. CONVENIO DE TRANSFERENCIA PROGRESIVA A CABA`
- `Exp. 498-D-21 - Ayuda Transportistas Escolares`
- `Exp. 2183-D-09 - Impuestos Internos`

**Entrada**: `df_consolidado` (39.972 filas, 6 columnas).  
**Salida**: `df_modelado` — mismo formato, con las filas de títulos sin valor
semántico eliminadas.  
**Resultado esperado**: aproximadamente 75 títulos únicos eliminados (de 1.453),
lo que impacta en un subconjunto de filas del dataset.

## Datos involucrados

- Columna principal: `titulo_base`
- Se filtran **filas completas** (todos los votos asociados a ese título desaparecen
  del dataset de modelado)
- El dataset original `df_consolidado` **no se modifica** (Principio 5 de la
  Constitución: datos crudos intocables)

## Criterios de aceptación

- [ ] La lista completa de títulos a filtrar es revisada y aprobada por el equipo
      antes de ejecutar (se genera en una celda separada, no se aplica silenciosamente)
- [ ] Los 75 títulos identificados quedan excluidos del dataset de modelado
- [ ] Los 6 casos borderline confirmados como "conservar" NO son filtrados:
      `Expte. 0089-S-2020`, `Expte. 0366-D-2020`, `Exp. 498-D-21`,
      `Exp. 581-D-2009`, `Exp. 2183-D-09`, `Exp. 7835-D-00` (pliegos)
- [ ] El dataset resultante `df_modelado` se guarda como archivo separado
      (`data/df_modelado.csv`) sin sobrescribir `df_consolidado`
- [ ] Se imprime un resumen: cuántos títulos únicos se descartaron, cuántas filas
      se eliminaron, cuántas quedaron
- [ ] Cumple la Constitución: no hay leakage (el filtro no usa información de
      votaciones futuras), reproducible (los patrones de filtrado son deterministas)

## Fuera de alcance

- No se modifica el texto de ningún título (eso es otra feature)
- No se hace normalización adicional de texto ni ingeniería de features en este paso
- No se decide qué hacer con títulos ambiguos nuevos que aparezcan en el futuro

## Riesgos conocidos

- **Falsos negativos**: puede haber títulos sin valor semántico que no matcheen los
  patrones definidos y queden en el dataset. Mitigación: la celda de revisión previa
  permite al equipo inspeccionar y corregir antes de aplicar.
- **Evolución del dataset**: si se agregan votaciones nuevas con formatos distintos,
  los patrones deberán revisarse. Esto no es un problema para la versión actual.
