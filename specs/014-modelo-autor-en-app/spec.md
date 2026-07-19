# Spec 014 — Modelo con autoría servido en la API y selector de autor en la app

## Objetivo

Que la API y la app Streamlit dejen de usar el modelo viejo (spec 009, F1-macro 0.453) y pasen
a usar el modelo ganador de la spec 013 (LightGBM por defecto, Escenario A, F1-macro 0.581),
que incorpora las features de autoría. Para eso la app debe permitir indicar **quién es el
autor** del proyecto hipotético, porque el modelo nuevo necesita ese dato para predecir.

## Problema que resuelve

Hoy conviven dos mundos desconectados:

- La spec 013 produjo un modelo mejor (+28% de F1-macro de referencia), pero quedó solo en
  notebooks: la API sigue sirviendo el modelo de la spec 009, sin features de autoría.
- La app solo pide el título del proyecto. No hay forma de decirle "este proyecto lo manda el
  Poder Ejecutivo" o "lo firma tal diputado", que es justamente la señal nueva que el modelo
  aprendió a usar.
- Además, la nómina de predicción arrastra una deuda conocida: muestra **259 diputados en vez
  de 257**, porque dos personas aparecen duplicadas con distinta escritura del nombre
  (OSUNA, Blanca Inés y PICHETTO, Miguel Angel — cada uno con una fila de datos viejos y otra
  con los actuales). Esta spec la cierra de raíz.

## Qué construir (en lenguaje funcional)

### Parte A — Serializar el modelo nuevo (equivalente al STG_8 de la spec 010)

Un notebook nuevo que tome el dataset de entrenamiento de la spec 013 y deje guardados,
listos para que la API los cargue:

1. **El modelo ganador reentrenado**: LightGBM con hiperparámetros por defecto, Escenario A
   (PRO fuera de la coalición de Milei — definición oficial ya confirmada), entrenado con
   todas las filas disponibles (entrenamiento + holdout combinados), igual que se hizo en
   STG_8. La métrica oficial para citar sigue siendo **0.581** (holdout genuino de STG_6.2);
   cualquier número medido sobre datos que el modelo ya vio es solo un chequeo de sanidad.
2. **Las tablas snapshot actualizadas**: las tasas históricas de cada diputado (afinidad,
   alineación con su bloque, etc.) acumuladas hasta hoy, calculadas igual que las features del
   dataset de la 013 para que el vector de predicción sea consistente con el de entrenamiento.
3. **Los codificadores** necesarios para traducir bloque del autor, bloque/provincia del
   votante y clases de voto entre texto y números.

Todos los artefactos se guardan con **nombres nuevos** (ej. con sufijo `_autor`), sin pisar
los de la spec 010, para poder volver atrás si algo falla.

### Parte B — Nómina única de 257 diputados

Las dos personas duplicadas se unifican: queda **una sola fila por diputado**, con su nombre,
bloque y provincia **actuales**, y con **todo su historial de votos combinado** (los votos que
quedaron registrados bajo las dos escrituras del nombre cuentan juntos para sus tasas
históricas). El selector de diputados, el selector de autor y la tabla de predicciones pasan
a mostrar exactamente 257 personas.

### Parte C — La API recibe el autor y predice con el modelo nuevo

El pedido de predicción pasa de "título" a "título + autor". El autor es **obligatorio** y
puede ser:

- **Un diputado de la Cámara actual** (cualquiera de los 257): el bloque del autor es el
  bloque al que ese diputado **pertenece hoy** (no el que tuvo en el pasado).
- **El Poder Ejecutivo Nacional**: el bloque del autor es la coalición gobernante hoy —
  **La Libertad Avanza** — y el proyecto se marca como enviado por el Ejecutivo.

Con ese dato, la API arma las features de autoría del proyecto hipotético igual que en el
entrenamiento (Escenario A):

- *bloque del autor*: el que corresponda según lo anterior.
- *es del Poder Ejecutivo*: sí solo si se eligió esa opción.
- *es oficialista*: sí si el bloque del autor es el de la coalición gobernante hoy (con la
  definición oficial: el PRO NO cuenta como oficialismo).
- *coincide bloque*: se calcula **para cada uno de los 257 diputados votantes** — sí cuando el
  bloque actual del votante es el mismo que el del autor.

La respuesta sigue siendo la predicción de voto para los 257 diputados, ahora con el modelo
nuevo.

Decisión de diseño ya registrada en la memoria (2026-07-18) que esta spec respeta: el
selector de autor **no** se construye desde `tabla_autor_bloque.csv` (esa tabla es histórica,
incompleta y con bloques desactualizados) sino desde la nómina actual de diputados.

### Parte D — La app ofrece el selector de autor

En el formulario de predicción, junto al campo de título, aparece un selector de autor con
258 opciones: **"Poder Ejecutivo Nacional"** + los **257 diputados actuales** (identificados
con nombre y bloque actual para que sea fácil encontrarlos). No se puede predecir sin elegir
autor. El resultado muestra, además de lo que ya mostraba, quién fue el autor elegido y qué
bloque se le asignó.

## Datos involucrados

- `data/df_entrenamiento_autor.csv` (spec 013): dataset con el que se reentrena y del que se
  toma la definición exacta de cada feature.
- `data/df_modelado_autor.csv` (specs 011/012): historial completo para recalcular las tablas
  snapshot (incluye los votos pre-2019, que alimentan el historial aunque no sean filas de
  entrenamiento).
- `data/diputados_actuales.csv` y/o el propio historial: nómina y bloque **vigente** de los
  257 diputados (fuente exacta a definir en el plan; debe ser el bloque de hoy, no el más
  frecuente ni el primero registrado).
- `data/tabla_periodos_presidenciales.csv`: para derivar la coalición gobernante vigente (hoy
  La Libertad Avanza) en vez de dejarla escrita a mano en el código.
- `data/df_features_titulo.csv` + el modelo de embeddings + KMeans ya serializado: para el
  vector semántico del título nuevo (igual que hoy).
- Artefactos de la spec 013: `encoder_bloque_autor.joblib`,
  `encoder_bloque_provincia_autor.joblib`, `le_voto_autor.joblib`.

## Criterios de aceptación

- [x] Existe un notebook nuevo (numeración decimal, estilo `STG_8.2`) que genera todos los
      artefactos nuevos en `data/` con nombres propios, **sin modificar ninguno** de los
      artefactos de las specs 009/010.
      **Evidencia**: `notebooks/STG_8.2_serializar_artefactos_autor.ipynb` (T1-T8). Genera
      6 artefactos con sufijo `_autor`; ninguno de los archivos de las specs 009/010 fue
      tocado. Reproducibilidad verificada: dos corridas completas dieron los mismos 5
      artefactos regenerables con hash SHA-256 idéntico (T8).
- [x] El modelo serializado es LightGBM con hiperparámetros por defecto, Escenario A, y un
      chequeo de sanidad confirma que predice coherentemente sobre filas conocidas (dejando
      documentado que la métrica oficial sigue siendo 0.581, la del holdout de STG_6.2).
      **Evidencia**: T6 (`LGBMClassifier(class_weight='balanced', random_state=42)`, 398
      features del Escenario A, 20.608 filas). T7: sanity check sobre el holdout de
      STG_6.2 dio 0.928 (≥ 0.581, esperado al ver esas filas), documentado explícitamente
      que 0.581 sigue siendo la métrica oficial.
- [x] `GET /diputados` devuelve exactamente **257** nombres, sin los duplicados de Osuna y
      Pichetto; la fila unificada de cada uno tiene su bloque y provincia actuales y su
      historial de votos completo (la suma de lo que estaba repartido entre las dos grafías).
      **Evidencia**: T9 (`TestClient`: 257 elementos, Osuna/Pichetto una sola vez, historial
      de Pichetto = 207 votos = suma de sus 2 grafías) y T15 (mismo resultado confirmado en
      el navegador con servidores reales: Bloque=Encuentro Federal, Provincia=Buenos Aires,
      155+50+2=207).
- [x] `POST /predecir` exige título **y autor**; si falta el autor o no es una opción válida
      (los 257 nombres o "Poder Ejecutivo Nacional"), responde con un error claro.
      **Evidencia**: T10 (Pydantic rechaza autor vacío/faltante) + T12 (`TestClient`: sin
      autor → 422; autor inválido → 422 con mensaje `"Autor invalido: '...'. Debe ser..."`).
- [x] `POST /predecir` devuelve exactamente **257** predicciones, generadas por el modelo
      nuevo.
      **Evidencia**: T12 (`TestClient`, autor=PEN → 257 predicciones, modelo
      `modelo_lgbm_autor.joblib`).
- [x] Con autor = Poder Ejecutivo Nacional: el bloque del autor es La Libertad Avanza,
      *es del Poder Ejecutivo* = sí, *es oficialista* = sí.
      **Evidencia**: T11/T13 (`_resolver_autor('Poder Ejecutivo Nacional')` →
      `bloque_autor='LA LIBERTAD AVANZA'`, `es_poder_ejecutivo=1`, `es_oficialista=1`) y
      T15 (confirmado en la app real).
- [x] Con autor = un diputado: el bloque del autor es su bloque **actual**; *es del Poder
      Ejecutivo* = no; *es oficialista* = sí solo si su bloque actual es el de la coalición
      gobernante (PRO excluido, según la definición oficial del Escenario A).
      **Evidencia**: T11/T13 — autor de LLA (Ajmechet) → `es_oficialista=1`; autor del PRO
      (Ardohain) → `es_oficialista=0`. Confirmado también en T15 vía la app real.
- [x] *Coincide bloque* vale sí exactamente para los votantes cuyo bloque actual es igual al
      del autor (verificable con un caso concreto: autor de un bloque X → los diputados del
      bloque X tienen coincide=sí y el resto no).
      **Evidencia**: T11/T13 — con autor de La Libertad Avanza, 95/95 votantes de LLA
      tienen `coincide_bloque_autor=1` y 0 fuera de LLA lo tienen.
- [x] La app muestra el selector de autor (257 diputados + Poder Ejecutivo Nacional), no
      permite predecir sin autor, y muestra en el resultado el autor y bloque asignado.
      **Evidencia**: T14 (implementación) y T15 (verificado en el navegador: 258 opciones
      visibles con bloque, warning si falta título, el selector siempre trae un valor por
      defecto por lo que nunca se puede enviar sin autor, resultado muestra
      `Autor: ... — Bloque asignado: ...`).
- [x] Misma entrada (título + autor) → misma predicción en llamadas repetidas (determinismo).
      **Evidencia**: T13 (`TestClient`, dos llamadas idénticas → mismas 257 predicciones).
- [x] Cumple la CONSTITUCION: sin leakage (los snapshots acumulan todo el historial hasta hoy
      — no hay ningún "voto actual" que excluir al predecir una ley futura, mismo criterio
      documentado en STG_8), reproducible (semillas fijas, corridas repetidas dan artefactos
      idénticos), y el equipo puede explicar cada feature que la API arma.
      **Evidencia**: celda de resumen "T8 — Resumen: por qué esta notebook cumple la
      Constitución" en `STG_8.2`, principio por principio; reproducibilidad verificada por
      hash (T8); cada feature de autoría documentada con comentarios en
      `api/modelo.py::construir_features`.

## Fuera de alcance

- Completar los 492 títulos que siguen sin autor: **no es necesario** — corresponden casi en
  su totalidad a votaciones previas a 2019, que no son filas de entrenamiento del modelo
  actual (en el subconjunto 2019+ solo quedan 342 filas sin autor, ~1,7%, que el modelo ya
  maneja con la categoría SIN_DATO). Deja de considerarse una deuda pendiente.
- Mejorar el matching fuzzy de la spec 006.
- Opción "sin autor" en el selector (decidido: el autor es obligatorio). Si en el futuro se
  quisiera, el modelo lo soporta (fue entrenado con la categoría SIN_DATO).
- Deploy en Render/Streamlit Cloud, base de datos persistente, login/autenticación,
  navegación multisección y gráficos Plotly/Altair (checklist de la cátedra pendiente).
- Reentrenar o re-tunear el modelo: se sirve tal cual quedó en la spec 013.
- Corregir `tabla_autor_bloque.csv` (deuda de datos conocida de la spec 011; no se usa aquí).

## Riesgos conocidos

1. **Bloque actual que el codificador no conoce**: el codificador de `bloque_autor` de la
   spec 013 solo vio los bloques que aparecieron como autores en el entrenamiento. Si algún
   diputado actual pertenece a un bloque que nunca firmó un proyecto en esos datos, el
   codificador no sabe traducirlo. El plan debe definir qué pasa en ese caso (y verificarse
   con la nómina real cuántos diputados caen ahí).
2. **Fuente del "bloque actual"**: el bloque vigente de cada diputado debe salir de una
   fuente confiable y única. Usar "el bloque de su último voto registrado" puede quedar
   desactualizado si hubo cambios de bloque después de la última votación del dataset. El
   plan debe elegir la fuente y justificarla.
3. **Cambio incompatible de la API**: el pedido de `/predecir` cambia de forma (ahora exige
   autor). App y API tienen que actualizarse juntas; una app vieja contra la API nueva
   recibiría errores.
4. **Unificación de duplicados**: al fusionar Osuna y Pichetto hay que recalcular sus tasas
   históricas sobre el historial combinado, no elegir una de las dos filas. Si solo se
   borrara una fila, se perdería parte de su historial y las features mentirían.
5. **Consistencia entrenamiento–predicción**: el vector de features que arma la API debe
   tener exactamente las mismas columnas, en el mismo orden y con las mismas convenciones
   (normalización de bloques, relleno de faltantes, dtype de embeddings — recordar el bug
   float32/float64 de la spec 010) que `df_entrenamiento_autor.csv`. Un desvío acá no tira
   error: predice mal en silencio. Mantener la regla de la spec 010: toda la lógica de armado
   del vector aislada en una sola función.
6. **"Coalición gobernante hoy" cambia con el tiempo**: si se hardcodea "La Libertad Avanza",
   la app queda mal el día que cambie el gobierno. Derivarla de
   `tabla_periodos_presidenciales.csv` con la fecha actual lo evita.
