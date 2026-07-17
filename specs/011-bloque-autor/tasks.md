# Tareas 011 — Features de autoría: `bloque_autor`, `es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

## Parte A — Tablas manuales (definición politológica, valida el equipo)

- [x] T1 — Crear `data/tabla_periodos_presidenciales.csv` con los períodos Menem → Milei:
      columnas `presidente`, `fecha_inicio`, `fecha_fin`, `coalicion`,
      `firmantes_ejecutivo` (presidente + jefes de gabinete separados por `;`),
      `bloques_integrantes` (vacía por ahora, se completa en T2). Propuesta de Claude.
- [x] T2 — Listar los bloques que aparecen en `df_modelado.csv` dentro de cada período
      presidencial y proponer el contenido de `bloques_integrantes` para cada coalición.
      **PAUSA OBLIGATORIA: el equipo valida la tabla completa fila por fila antes de
      seguir** — es una definición de Ciencia Política, no técnica. (depende de: T1)
      ✔ Validada por el equipo el 2026-07-17. Duda del PRO bajo Milei → se resuelve
      empíricamente con el escenario B (ver T8).
- [x] T3 — Crear `data/tabla_autor_bloque_manual.csv` como plantilla vacía con columnas
      `autor`, `bloque_asignado`, `es_poder_ejecutivo`, `comentario` (se pre-carga con
      pendientes en T10). (depende de: T1)

## Parte B — Notebook STG_5.2: cascada de resolución

- [x] T4 — Crear `notebooks/STG_5.2_features_autor.ipynb` con: función `normalizar_nombre`
      (mayúsculas, sin tildes, espacios colapsados — mismo criterio del proyecto — más
      Ñ→N y limpieza de caracteres de encoding roto), carga de los 5 insumos
      (`df_modelado.csv`, `hcdn_votaciones_historico.csv`, `titulos_autor.xlsx` y las dos
      tablas manuales) y validación de formato de las tablas (fechas parseables, períodos
      sin huecos ni solapamientos, columnas esperadas). Verificar que el cruce
      autor-histórico normalizado reproduce el diagnóstico: ~274/312 títulos resolubles.
      (depende de: T2, T3)
- [x] T5 — Construir la tabla de lookup histórico: una fila por (diputado_norm, fecha) con
      su bloque, ordenada por fecha, desde `hcdn_votaciones_historico.csv`. Test: verificar
      el bloque de un diputado conocido que cambió de bloque, en una fecha anterior y una
      posterior al cambio. (depende de: T4)
- [x] T6 — Implementar el paso 1 de la cascada (Ejecutivo): autor ∈ `firmantes_ejecutivo`
      de algún período **y** la coalición gobernante a la fecha de la votación coincide
      con la coalición de ese período → `bloque_autor` = coalición gobernante en la fecha,
      `es_poder_ejecutivo` = 1, fuente = `ejecutivo` (semántica corregida en T1: importa
      qué gobierno impulsa el proyecto al votarse, no el cargo puntual del firmante).
      Tests: los 48 títulos de CFK votados 2009-2015 dan ejecutivo; un título de Macri
      votado en 2026 (bajo LLA) NO; el "FERNANDEZ, ALBERTO" votado en 2013 (bajo CFK,
      misma coalición FpV que su propio período como JGM) SÍ; un título de Massa (firmante
      solo del período CFK/FpV) votado en 2016 (bajo Cambiemos) NO. (depende de: T4)
- [x] T7 — Implementar los pasos 2-4 de la cascada: tabla manual (pisa a lo automático) →
      lookup histórico con `merge_asof` backward (solo registros con fecha ≤ votación) →
      `PENDIENTE_MANUAL`. Títulos sin autor → `SIN_DATO`. Cada asignación guarda su
      `fuente_bloque_autor` (`ejecutivo`/`manual`/`historico`/`pendiente`/`sin_dato`).
      Mostrar conteo de títulos y filas por fuente. (depende de: T5, T6)
- [x] T8 — Derivar las tres features binarias: `es_poder_ejecutivo` (1 por paso ejecutivo
      o marca manual; 0 resto; -1 sin dato), `es_oficialista` (1 si PE=1 o si
      `bloque_autor` ∈ `bloques_integrantes` de la coalición gobernante a la fecha; 0 si
      hay autor y no cumple; -1 sin dato), `coincide_bloque_autor` (igualdad normalizada
      de bloques para autor legislador; pertenencia a `bloques_integrantes` para autor
      Ejecutivo; -1 sin dato). Calcular además el **escenario B** (PRO dentro de la
      coalición de Milei, definido en una celda claramente marcada): columnas
      `es_oficialista_b` y `coincide_bloque_autor_b`. `bloque_autor` y
      `es_poder_ejecutivo` no cambian entre escenarios. (depende de: T7)

## Parte C — Chequeos, salidas y cierre

- [x] T9 — Chequeos automáticos (asserts en el notebook): (a) toda fila con
      `es_poder_ejecutivo`=1 tiene `es_oficialista`=1; (b) existen filas con
      `es_oficialista`=1 y `es_poder_ejecutivo`=0; (c) ninguna asignación `historico` usó
      un registro posterior a la votación; (d) los 312 títulos con autor no tienen vacíos
      silenciosos (todos con fuente asignada); (e) ejemplos concretos de
      `coincide_bloque_autor` = 1 y = 0 verificados a mano. (depende de: T8)
- [x] T10 — Exportar salidas: `data/df_modelado_autor.csv` (mismas filas y orden que
      `df_modelado.csv` + 7 columnas nuevas: las 4 features, la fuente y las 2 del
      escenario B),
      `data/tabla_autor_bloque.csv` (autor → bloque + fuente, para la app futura),
      `data/autores_pendientes.csv` (con títulos, fechas y motivo), y pre-carga de los
      pendientes en `tabla_autor_bloque_manual.csv` para el completado manual del equipo.
      (depende de: T9)
- [ ] T11 — Corrida de reproducibilidad: re-ejecutar el notebook completo y verificar que
      las tres salidas son idénticas a la corrida anterior (comparación de contenido).
      (depende de: T10)
- [ ] T12 — Validar contra los criterios de aceptación de `spec.md` uno por uno y marcar
      el checklist con evidencia de cada verificación. (depende de: T11)
- [ ] T13 — Registrar en `memoria/DECISIONES.md`: resultado final, conteos por fuente,
      decisiones tomadas durante la implementación y qué queda pendiente de completado
      manual. (depende de: T12)
