# Spec 003 — Features semánticas de títulos de proyectos

## Objetivo

Convertir el texto de cada `titulo_base` en variables numéricas que capturen el **tema**
de la ley, de forma que el modelo de predicción pueda aprender que ciertos diputados
votan diferente según el área temática (economía, educación, seguridad, etc.).

## Problema que resuelve

Hoy el dataset `df_modelado` tiene el título como texto crudo. Un modelo de ML no puede
leer texto directamente: necesita números. Además, queremos que esos números sean
**interpretables** — que se pueda decir "este proyecto trata de salud" o "este proyecto
trata de economía", no solo tener un vector incomprensible.

## Qué construir (en lenguaje funcional)

Se construyen dos cosas a partir de `titulo_base`:

### 1. Representación semántica (embeddings)
Cada título se transforma en un vector de números que captura su significado. Dos títulos
sobre el mismo tema van a tener vectores parecidos, aunque usen palabras distintas. Por
ejemplo: "Ley de financiamiento universitario" y "Presupuesto para universidades nacionales"
quedarían cercanos en ese espacio numérico.

Se usa un modelo de lenguaje preentrenado en español para generar estos vectores
(sentence-transformers).

### 2. Temas interpretables (clustering semántico)
A partir de los vectores, se agrupan los títulos en **N temas** (a definir en el plan,
aproximadamente 10–20). Cada tema recibe una etiqueta descriptiva generada automáticamente
a partir de las palabras más frecuentes de los títulos del grupo. Ejemplos esperados:
"economía / impuestos", "seguridad / delitos", "educación / universidades",
"salud / emergencia sanitaria", etc.

**Entrada**: `data/df_modelado.csv` (columna `titulo_base`).  
**Salida**: `data/df_features_titulo.csv` — una fila por `titulo_base` único, con:
- El vector de embedding (columnas `emb_0`, `emb_1`, ..., `emb_N`)
- El número de tema asignado (`tema_id`)
- La etiqueta descriptiva del tema (`tema_label`)

Esta salida se une luego a `df_modelado` por `titulo_base` para armar el dataset
de entrenamiento (eso será una spec separada).

## Datos involucrados

- **Entrada**: `data/df_modelado.csv`, columna `titulo_base`
- Se trabaja sobre los **títulos únicos** (no se repite el cálculo por cada fila con el
  mismo título)
- No se usan `voto`, `fecha_votacion`, `diputado`, `bloque` ni `provincia` en este paso

## Criterios de aceptación

- [ ] Cada `titulo_base` único tiene un vector de embedding calculado
- [ ] Los títulos están agrupados en temas con etiquetas legibles en español
- [ ] Se puede ver una muestra de títulos por tema y verificar que tienen coherencia temática
- [ ] La salida se guarda como `data/df_features_titulo.csv` sin modificar `df_modelado.csv`
- [ ] El proceso es reproducible: misma semilla, mismo resultado
- [ ] Cumple la Constitución: sin leakage (el texto del título es información pública
  disponible antes de cualquier votación), reproducible

## Fuera de alcance

- No se incluyen features del diputado (bloque, historial) — eso es otra spec
- No se entrena ningún modelo predictivo en este paso
- No se define cuántos temas son "correctos" de antemano: se explora y el equipo elige

## Riesgos conocidos

- **Calidad del modelo de lenguaje**: los modelos preentrenados en español son mejores
  que los de inglés para este dominio, pero pueden no capturar jerga legislativa argentina.
  Mitigación: revisar manualmente una muestra de los agrupamientos.
- **Cantidad de temas**: pocos temas pierden detalle; muchos temas fragmentan demasiado.
  Mitigación: probar con varios valores y que el equipo elija el que resulte más útil.
- **Librería nueva**: sentence-transformers requiere instalación y puede ser pesada
  (~500 MB el modelo). Mitigación: usar un modelo pequeño multilingüe como primera opción.
- **Sin leakage**: confirmado — el texto del título no contiene información sobre el voto.
