# Spec 010 — API FastAPI para servir datos y predicciones

## Objetivo
Construir una API con FastAPI que exponga el historial de diputados y la predicción de
votos por HTTP, para que la app Streamlit deje de leer los CSV directamente y pase a
pedirle los datos a esta API. Esto separa el "backend de datos" del "frontend", tal como
lo exige el checklist de MVP de la cátedra.

## Problema que resuelve
Hoy `app/app.py` lee los CSV directamente desde disco cada vez que un usuario interactúa
con la app. Esto acopla el frontend a los archivos de datos, no separa responsabilidades
(todo vive en un único script Streamlit) y no cumple con la arquitectura modular que pide
el checklist evaluado por la cátedra (routers, esquemas de validación, capa de acceso a
datos separada).

## Qué construir (en lenguaje funcional)
Un backend FastAPI organizado en archivos separados:
- **Rutas** (routers): un archivo por grupo de endpoints.
- **Esquemas** (schemas): definiciones Pydantic de qué forma tienen las entradas y salidas
  de cada endpoint, para que la API rechace pedidos mal formados con un error claro.
- **Acceso a datos** (database): un módulo que centraliza la lectura de los datos. Por
  ahora sigue leyendo los archivos ya generados (CSV y artefactos del modelo) — no se migra
  a una base de datos real en esta spec (ver "Fuera de alcance").

Dos endpoints:
- **`GET /diputados/{id}`** — devuelve el historial de un diputado: bloque, provincia,
  conteo de votos y últimas 10 votaciones. Es la misma información que hoy calcula
  `app/app.py`, pero servida por HTTP en vez de calculada dentro del script de Streamlit.
- **`POST /predecir`** — recibe el título de un proyecto de ley (texto) y devuelve la
  predicción de voto (AFIRMATIVO / NEGATIVO / ABSTENCIÓN) para cada uno de los 257
  diputados actuales, usando el modelo LGBM ya entrenado en la spec 009. No se reentrena
  ningún modelo: la API solo carga el artefacto ya guardado y predice.

La app Streamlit se modifica para llamar a estos dos endpoints por HTTP en vez de leer los
CSV directamente, para las dos funcionalidades que ya existen hoy (consulta de diputado y
placeholder de predicción).

## Datos involucrados
- `data/df_consolidado.csv` — historial de votos por diputado, para `/diputados/{id}`.
- `data/df_entrenamiento.csv` y los artefactos de la spec 009 (modelo LGBM serializado
  `.pkl`/`.joblib`, `encoder_bloque_provincia.joblib`, `le_voto.joblib`) — para `/predecir`.
- Para predecir sobre un título **nuevo** (no visto en el dataset de entrenamiento) hace
  falta generar su embedding semántico y su tema (cluster) en el momento del pedido — ver
  "Riesgos conocidos".

## Criterios de aceptación
- [ ] La API corre localmente (`uvicorn`) y expone `/diputados/{id}` y `/predecir`,
      documentados automáticamente en `/docs` (Swagger de FastAPI).
- [ ] El código está organizado en al menos: `main.py`, un módulo de rutas (routers),
      un módulo de esquemas (Pydantic) y un módulo de acceso a datos (`database.py`) — no
      todo en un solo archivo.
- [ ] `/diputados/{id}` devuelve los mismos datos que hoy muestra la app (bloque,
      provincia, conteo de votos, últimas 10 votaciones) para un diputado válido, y un
      error controlado (404) para un id inexistente.
- [ ] `/predecir` recibe un título de ley y devuelve la predicción para los 257 diputados
      actuales, reutilizando el modelo ya entrenado en la spec 009 sin volver a entrenarlo.
- [ ] Pydantic valida los datos de entrada (ej. que el título no esté vacío) y devuelve un
      error claro si no cumplen el formato esperado.
- [ ] La app Streamlit deja de leer los CSV directamente para estas dos funcionalidades y
      pasa a llamar a la API por HTTP (`requests`).
- [ ] Cumple la Constitución: no se reentrena el modelo (se reutiliza el de la spec 009,
      ya validado con F1-macro y validación temporal), la API no introduce fuga de
      información nueva, y las semillas/artefactos usados son reproducibles.

## Fuera de alcance
- Migración de CSV a base de datos persistente (Postgres/SQLite + SQLAlchemy) — spec futura.
- Login, JWT y encriptación de contraseñas (passlib/bcrypt) — spec futura.
- Deploy de la API en Render y del frontend en Streamlit Cloud — spec futura.
- Navegación multisección con `st.sidebar`/`st.navigation` y `st.session_state` en
  Streamlit, y gráficos avanzados (Plotly/Altair) — mejoras de frontend, spec futura.

## Riesgos conocidos
- **Embedding en tiempo real**: para un título nuevo hay que cargar el modelo
  `sentence-transformers` (`paraphrase-multilingual-MiniLM-L12-v2`) en memoria para generar
  su embedding de 384 dimensiones. Es un modelo pesado — hay que decidir en `/planificar`
  si se carga una sola vez al iniciar la API (recomendado) o en cada request.
- **Tema (cluster) de un título nuevo**: el K-Means de la spec 003 se entrenó sobre los
  1022 títulos existentes. Un título nuevo no tiene `tema_id` asignado de antemano — hay
  que definir cómo asignarle el cluster más cercano usando el modelo K-Means ya entrenado,
  sin volver a entrenarlo (evita fuga de información y cumple Principio 5).
- **Features históricas actualizadas**: las features de historial por diputado
  (`historial_afinidad`, etc.) deben reflejar el estado "hasta hoy" de cada diputado al
  momento de predecir, no quedarse congeladas en la fecha de corte del dataset de
  entrenamiento. Hay que verificar en `/planificar` cómo se recalculan para una predicción
  en vivo sin violar el principio de cero data leakage (usar solo información disponible
  hasta la fecha actual, nunca del futuro respecto del título que se predice).
