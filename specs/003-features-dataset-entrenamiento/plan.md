# Plan 003 — Features semánticas de títulos de proyectos

## Enfoque técnico

El proceso tiene tres etapas conceptuales:

**Etapa 1 — Embeddings**: cada título se pasa por un modelo de lenguaje preentrenado
que lo convierte en un vector de ~384 números. Este vector es como una "coordenada" en
un mapa semántico: títulos sobre el mismo tema quedan cerca, títulos sobre temas
distintos quedan lejos. No hace falta entender los números individualmente — solo importa
la distancia relativa entre títulos.

El modelo elegido es `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers).
Es multilingüe, funciona bien en español, pesa ~120 MB (mucho más liviano que alternativas)
y es uno de los más usados para esta tarea en la comunidad.

**Etapa 2 — Clustering**: con los vectores calculados, se agrupan los títulos usando
el algoritmo **K-Means**. K-Means divide los títulos en K grupos de forma que los títulos
dentro de cada grupo se parezcan entre sí. Se prueban tres valores de K: 10, 15 y 20.
Para cada uno se muestra una muestra de títulos por grupo, y el equipo elige el K que
produce grupos más coherentes temáticamente.

**Etapa 3 — Etiquetas automáticas**: para cada grupo, se extraen las 5 palabras más
frecuentes entre los títulos del grupo (excluyendo palabras vacías como "de", "la", "el").
Esas palabras forman la etiqueta del tema. Ejemplo: si los títulos más frecuentes hablan
de "impuesto", "ganancias", "exención", "fiscal", "tributo", la etiqueta sería
`"impuesto / ganancias / fiscal"`.

## Librerías y herramientas

| Librería | Uso | Justificación |
|----------|-----|---------------|
| `sentence-transformers` | Generar los embeddings | Única librería que da acceso a modelos preentrenados multilingües de alta calidad con una sola línea de código |
| `scikit-learn` | K-Means + preprocesamiento | Ya está en el stack; incluye K-Means |
| `pandas` | Manejo del dataset | Ya está en el stack |
| `numpy` | Operaciones con vectores | Ya está en el stack |

Se agrega **una sola librería nueva**: `sentence-transformers`. Se suma a `requirements.txt`.

## Diseño anti-leakage / validación

Este paso **no genera features de historial ni entrena modelos predictivos**, por lo que
no existe riesgo de fuga de información temporal.

Análisis explícito:
- Los embeddings se calculan a partir del **texto del título**, que es información pública
  disponible antes de cualquier votación. No hay fuga.
- El clustering agrupa títulos por similitud semántica, sin usar `voto`, `fecha_votacion`,
  `diputado`, `bloque` ni `provincia`.
- No hay validación temporal porque no hay modelo que evaluar en este paso.

**Conclusión**: este paso es seguro respecto a leakage. La validación temporal aplica
recién cuando se entrene el modelo predictivo (spec futura).

## Pasos de implementación

Se implementa en `notebooks/STG_4_features_titulo.ipynb`.

1. **Cargar títulos únicos** desde `data/df_modelado.csv`. Trabajar solo con
   `titulo_base` único (no repetir el cálculo por cada fila del dataset completo).

2. **Calcular embeddings** con `paraphrase-multilingual-MiniLM-L12-v2`.
   Resultado: una matriz de shape `(N_titulos, 384)`.

3. **Exploración de K**: correr K-Means con K = 10, 15 y 20. Para cada K, mostrar:
   - Los 5 títulos más cercanos al centro de cada grupo
   - La etiqueta automática (5 palabras más frecuentes, sin stopwords)
   - El tamaño de cada grupo

4. **Celda de elección de K**: el equipo elige el K que produce grupos más coherentes
   y lo fija en una variable `K_ELEGIDO`. A partir de acá se usa ese K.

5. **Generar etiquetas finales** con el K elegido. Cada grupo recibe `tema_id`
   (número 0 a K-1) y `tema_label` (string con las palabras clave).

6. **Armar `df_features_titulo`**: una fila por título único con columnas:
   - `titulo_base`
   - `emb_0` ... `emb_383` (el vector de 384 dimensiones)
   - `tema_id`
   - `tema_label`

7. **Guardar** como `data/df_features_titulo.csv`. Verificar que `df_modelado.csv`
   no fue modificado.

8. **Muestra de validación**: mostrar una tabla con 5 títulos al azar por tema para
   que el equipo pueda confirmar que los agrupamientos son razonables.

## Reproducibilidad

- K-Means usa `random_state=42` en todas las corridas.
- El modelo de embeddings es determinista (no tiene azar).
- **Entrada**: `data/df_modelado.csv` (no se toca).
- **Salida**: `data/df_features_titulo.csv` (archivo nuevo).
- **Notebook**: `STG_4_features_titulo.ipynb`.
- El valor de `K_ELEGIDO` queda fijo en el notebook y se registra en `memoria/DECISIONES.md`.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|--------|-----------|
| El modelo tarda mucho en calcular embeddings (~1.400 títulos) | A esa escala tarda menos de 1 minuto. No es un problema. |
| Los grupos no son temáticamente coherentes | La celda de exploración con K=10/15/20 permite elegir antes de fijar el resultado. |
| Stopwords en español incompletas | Usar la lista de stopwords de scikit-learn en español + agregar manualmente palabras legislativas frecuentes sin valor semántico ("ley", "nacional", "artículo", "modificación"). |
| `sentence-transformers` no está en el entorno | Se agrega a `requirements.txt` sin versión fija (igual que `pandas` y `streamlit`) para compatibilidad con Python 3.14. |
| Grupos de tamaño muy desigual (un tema gigante, otros chicos) | Se muestra el tamaño de cada grupo en la exploración. Si hay desbalance extremo, se prueba un K distinto. |
