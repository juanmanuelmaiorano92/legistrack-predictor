# Tareas 015 — Base de datos, login y autenticación (usuarios + historial de predicciones)

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.
> Recordatorio de diseño: ningún módulo nuevo de auth/DB importa `api/modelo.py`
> (ver sección "Independencia del modelo de predicción" del plan).

## Preparación: base de datos y dependencias

- [x] **T1 — Crear el proyecto Supabase y obtener la cadena de conexión.** El usuario crea un
      proyecto PostgreSQL gratuito en Supabase y copia la connection string (formato
      `postgresql://...`). *Esta tarea la hace el usuario; Claude lo guía paso a paso y espera
      la cadena para el `.env`.* Verificable: se tiene una `DATABASE_URL` válida.

- [x] **T2 — Agregar las 5 librerías a `requirements.txt`** con versión fija: `SQLAlchemy`,
      `psycopg2-binary`, `passlib[bcrypt]`, `bcrypt==4.0.1` (pin por compatibilidad con
      passlib), `python-jose[cryptography]`, `python-dotenv`. Instalarlas en el entorno
      anaconda3. Verificable: `pip show` de cada una responde sin error.

- [x] **T3 — Crear `.env` (local) y `.env.example` (versionado).** `.env` con valores reales:
      `DATABASE_URL`, `JWT_SECRET_KEY` (texto largo aleatorio), `USUARIO_PRUEBA`,
      `CLAVE_PRUEBA`. `.env.example` con las mismas claves pero valores de ejemplo vacíos.
      Verificable: `.env` NO aparece en `git status` (ya está en `.gitignore`); `.env.example`
      sí se puede commitear. (depende de: T1)

## Backend: conexión, tablas y seguridad

- [x] **T4 — `api/db.py`: conexión SQLAlchemy a PostgreSQL.** Motor que lee `DATABASE_URL`
      desde el entorno, `SessionLocal`, `Base` declarativa, y la dependencia `get_db` (abre y
      cierra una sesión por pedido). Verificable: un script corto conecta a Supabase y hace un
      `SELECT 1` sin error. (depende de: T3)

- [x] **T5 — `api/tablas.py`: modelos ORM `Usuario` y `Prediccion`.** `Usuario` (id, username
      único, password_hash, fecha_alta). `Prediccion` (id, usuario_id → usuarios.id, fecha,
      titulo, autor, tema, n_afirmativo, n_negativo, n_abstencion). Verificable: `create_all`
      crea ambas tablas en Supabase y se ven en el panel. (depende de: T4)

- [x] **T6 — `api/seguridad.py`: contraseñas con bcrypt.** Funciones `hashear_clave(clave)` y
      `verificar_clave(clave, hash)` usando passlib-bcrypt. Verificable: hashear una clave y
      verificarla da True; verificar una clave incorrecta da False; el hash no contiene la
      clave en texto plano. (depende de: T2)

- [x] **T7 — `api/seguridad.py`: tokens JWT.** Funciones `crear_token(usuario)` (firma con
      `JWT_SECRET_KEY`, incluye el username y un vencimiento) y `validar_token(token)` (devuelve
      el username o lanza error si es inválido/vencido). Verificable: un token creado se valida
      OK; un token manipulado o vencido es rechazado. (depende de: T2, T3)

- [x] **T8 — `api/seguridad.py`: dependencia `usuario_actual`.** Lee el token del encabezado
      `Authorization: Bearer` (con `HTTPBearer`), lo valida, busca el usuario en la base y lo
      devuelve; si falta o es inválido, responde 401. Verificable: probada con un token válido
      (devuelve el usuario) y sin token / token falso (401). (depende de: T5, T7)

## Backend: endpoints de autenticación e historial

- [x] **T9 — `api/schemas.py`: esquemas nuevos.** `RegistroRequest` (username, password con
      validación de no vacío y largo mínimo), `LoginRequest`, `TokenResponse` (token),
      `PrediccionGuardada` (los campos del historial). Verificable: los esquemas validan y
      rechazan entradas vacías (Pydantic). (depende de: —)

- [x] **T10 — `api/routers/auth.py`: `POST /registro`.** Crea un usuario con la clave
      hasheada; 400 si el username ya existe. Verificable: registrar un usuario nuevo devuelve
      OK y aparece en la tabla `usuarios` con la clave encriptada; registrar el mismo username
      otra vez da 400. (depende de: T5, T6, T9)

- [x] **T11 — `api/routers/auth.py`: `POST /login`.** Valida usuario+clave y devuelve un token
      JWT; 401 si son incorrectos. Verificable: login con credenciales correctas devuelve un
      token; con clave incorrecta da 401. (depende de: T6, T7, T9, T10)

- [x] **T12 — `api/routers/historial.py`: `GET /mis-predicciones`.** Endpoint protegido que
      devuelve solo las predicciones del `usuario_actual`, más recientes primero. Verificable:
      con el token de un usuario, devuelve sus predicciones y no las de otro usuario. (depende
      de: T5, T8)

## Backend: proteger lo existente y guardar el historial

- [x] **T13 — Proteger los endpoints existentes con `usuario_actual`.** Agregar la dependencia
      a `/diputados`, `/diputados/{id}` y `/predecir`. Verificable: los tres dan 401 sin token
      y funcionan igual que antes con token válido. (depende de: T8)

- [x] **T14 — Guardar cada predicción en `/predecir`.** Tras calcular el resultado (sin tocar
      `modelo.py`), insertar una fila en `predicciones` con el `usuario_id` y el resumen (tema
      + conteo de AFIRMATIVO/NEGATIVO/ABSTENCIÓN de la lista devuelta). Verificable: hacer una
      predicción crea una fila; el conteo guardado coincide con la respuesta. Confirmar que el
      router NO importa nada interno del modelo más allá de `predecir_votos`. (depende de: T5,
      T13)

- [x] **T15 — `api/main.py`: cableado e inicio.** Registrar los routers `auth` e `historial`;
      en el `lifespan`, ejecutar `create_all` (crea tablas si no existen) y sembrar el usuario
      de prueba de forma idempotente (lo crea solo si no existe, con las credenciales del
      `.env`). Verificable: al arrancar la API por primera vez, las tablas existen y el usuario
      de prueba puede loguearse; al reiniciar, no se duplica. (depende de: T10, T11, T12, T13,
      T14)

## Frontend mínimo

- [x] **T16 — `app/app.py`: guardián de sesión + login/registro.** Al inicio, si no hay token
      en `st.session_state`, mostrar solo el formulario de login/registro y frenar el resto con
      `st.stop()`. Al loguearse, guardar el token en `st.session_state`. Verificable: sin
      sesión no se ve nada más; con login correcto se entra a la app. (depende de: T11)

- [x] **T17 — `app/app.py`: mandar el token y botón de cerrar sesión.** Enviar el encabezado
      `Authorization: Bearer` en cada request a la API; agregar un botón "Cerrar sesión" que
      borra el token de `st.session_state`. Verificable: consulta y predicción funcionan
      logueado; cerrar sesión vuelve a la pantalla de login. (depende de: T16, T13)

- [x] **T18 — `app/app.py`: tabla "Mis predicciones".** Sección que llama a
      `GET /mis-predicciones` y muestra una tabla simple (fecha, título, autor, resumen).
      Verificable: tras predecir, la nueva predicción aparece en la tabla del usuario. (depende
      de: T12, T17)

## Cierre

- [x] **T19 — Prueba de punta a punta.** Flujo completo con `uvicorn` + Streamlit reales:
      registrar → login → consultar diputado → predecir → ver "Mis predicciones" → cerrar
      sesión → confirmar 401 sin token. Verificar que `/predecir` devuelve **idéntico** a la
      spec 014 para un título+autor fijo (independencia del modelo). (depende de: T15, T18)

- [x] **T20 — Validar contra los criterios de aceptación de `spec.md`.** Marcar los 11
      criterios con evidencia concreta (tarea + prueba que lo verificó). (depende de: T19)

- [x] **T21 — Registrar resultado y decisiones en `memoria/DECISIONES.md`.** Cierre de la spec
      015: qué se construyó, bugs encontrados con causa raíz, y estado final. (depende de: T20)
