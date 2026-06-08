# Tareas 003 — Features semánticas de títulos de proyectos

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

- [x] T1 — Crear notebook `notebooks/STG_4_features_titulo.ipynb`, instalar `sentence-transformers` en `requirements.txt`, cargar títulos únicos de `data/df_modelado.csv` e imprimir cantidad
- [ ] T2 — Calcular embeddings con `paraphrase-multilingual-MiniLM-L12-v2` e imprimir shape de la matriz resultante (depende de: T1)
- [ ] T3 — Correr K-Means con K=10, K=15 y K=20 (`random_state=42`); para cada K mostrar tamaño de grupos y los 5 títulos más cercanos al centro de cada grupo (depende de: T2)
- [ ] T4 — Generar etiquetas automáticas por grupo: 5 palabras más frecuentes de los títulos del grupo, excluyendo stopwords en español + palabras legislativas vacías ("ley", "nacional", "artículo", "modificación") (depende de: T3)
- [ ] T5 — Celda de elección de K: fijar `K_ELEGIDO` con el valor que elija el equipo y recalcular clustering final con ese K (depende de: T4)
- [ ] T6 — Armar `df_features_titulo` con columnas `titulo_base`, `emb_0`...`emb_383`, `tema_id`, `tema_label`; guardar como `data/df_features_titulo.csv` y verificar que `df_modelado.csv` no fue modificado (depende de: T5)
- [ ] T7 — Mostrar tabla de validación: 5 títulos al azar por tema para que el equipo confirme coherencia temática (depende de: T6)
- [ ] T8 — Validar contra todos los criterios de aceptación de la spec 003 (depende de: T7)
- [ ] T9 — Registrar `K_ELEGIDO` y decisiones en `memoria/DECISIONES.md` (depende de: T8)
