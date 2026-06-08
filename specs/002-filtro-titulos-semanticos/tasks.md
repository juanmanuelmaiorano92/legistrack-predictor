# Tareas 002 — Filtro de títulos sin valor semántico

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

- [x] T1 — Crear notebook `notebooks/STG_3_filtro_titulos.ipynb` con celda de carga de `data/df_consolidado.csv` y verificación de columnas y shape
- [x] T2 — Definir la función `es_sin_valor(titulo)` con todos los patrones regex documentados por categoría (depende de: T1)
- [x] T3 — Celda de inspección: calcular `titulos_a_filtrar`, mostrar lista completa con conteo de filas por título, verificar que los 6 casos borderline NO aparecen en la lista (depende de: T2)
- [x] T4 — Celda de aplicación: filtrar `df_consolidado` excluyendo `titulos_a_filtrar` e imprimir resumen (títulos únicos eliminados, filas eliminadas, filas restantes) (depende de: T3)
- [x] T5 — Guardar el resultado como `data/df_modelado.csv` y verificar que `data/df_consolidado.csv` no fue modificado (depende de: T4)
- [ ] T6 — Validar contra todos los criterios de aceptación de la spec 002 (depende de: T5)
- [ ] T7 — Registrar resultado y decisiones en `memoria/DECISIONES.md` (depende de: T6)
