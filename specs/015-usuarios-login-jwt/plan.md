# Plan 015 — Base de datos, login y autenticación (usuarios + historial de predicciones)

## Enfoque técnico

La idea es agregar una **capa de cuentas y seguridad alrededor** de la API y la app que ya
existen, **sin tocar el modelo ni la predicción**. Pensalo como ponerle una puerta con llave a
un edificio que ya funciona: el edificio (predicción, historial de diputados) queda igual;
sumamos una recepción donde te registrás, te dan una llave (token) y sin esa llave no entrás a
ninguna sala.

Tres piezas nuevas:

1. **Una base de datos relacional** (PostgreSQL en la nube, gratis, tipo Supabase o Neon) con
   dos tablas: `usuarios` y `predicciones`. La API se conecta a ella con **SQLAlchemy**, una
   librería que deja escribir/leer la base con objetos de Python en vez de SQL a mano.

2. **Un sistema de login con token (JWT)**. Cuando un usuario inicia sesión correctamente, la
   API le devuelve un **token**: un texto firmado que prueba "soy este usuario y ya me
   autentiqué". La app guarda ese token y lo manda en cada pedido. Cada endpoint mira el token
   antes de responder; si falta o es inválido, contesta "401 No autorizado" y no hace nada.

3. **Un frontend mínimo de acceso**: si no iniciaste sesión, la app solo muestra la pantalla
   de registro/login. Una vez adentro, ves lo de siempre (consulta y predicción) más una tabla
   con **tus** predicciones anteriores y un botón de cerrar sesión.

**Qué NO cambia**: `api/modelo.py` (la lógica de predicción), los artefactos `.joblib`, los
snapshots, la nómina de 257 diputados. `/predecir` sigue devolviendo exactamente lo mismo;
solo que ahora, antes de responder, verifica el token, y después de responder, **guarda un
resumen** de esa predicción en la base asociado al usuario.

### Estructura de archivos nuevos (encajando con la API actual)

La API ya es modular (`main.py`, `database.py` para CSV, `modelo.py` para ML, `schemas.py`,
`routers/`). Sumamos, sin renombrar lo existente:

- `api/db.py` — conexión a PostgreSQL con SQLAlchemy (motor, sesión, y la dependencia
  `get_db` que le da a cada endpoint una sesión de base). *Nombre distinto de `database.py`
  (que sigue siendo el de los CSV) para no confundir las dos fuentes de datos.*
- `api/tablas.py` — las dos tablas como clases SQLAlchemy: `Usuario` y `Prediccion`.
- `api/seguridad.py` — encriptar/verificar contraseñas (bcrypt) y crear/validar el token JWT.
  Acá vive también la dependencia `usuario_actual` que protege los endpoints.
- `api/routers/auth.py` — endpoints `POST /registro` y `POST /login`.
- `api/routers/historial.py` — endpoint `GET /mis-predicciones` (solo las del usuario logueado).
- `api/schemas.py` — se le agregan los esquemas Pydantic nuevos (`RegistroRequest`,
  `LoginRequest`, `TokenResponse`, `PrediccionGuardada`).

### Las dos tablas

**`usuarios`**: `id` (clave primaria), `username` (texto único, obligatorio),
`password_hash` (texto: la contraseña **encriptada**, nunca la real), `fecha_alta` (fecha/hora).

**`predicciones`**: `id` (clave primaria), `usuario_id` (referencia al usuario que la hizo),
`fecha` (fecha/hora), `titulo` (texto), `autor` (texto), `tema` (texto), y el resumen del
resultado: `n_afirmativo`, `n_negativo`, `n_abstencion` (enteros). **Se guarda el resumen, no
las 257 filas** — es lo aprobado en la spec: alcanza para "ver mi historial" y mantiene la
base liviana.

### Flujo completo

1. Usuario abre la app → no hay token en sesión → ve solo login/registro.
2. Se registra (`POST /registro`) o inicia sesión (`POST /login`) → la API valida y devuelve
   un token JWT.
3. La app guarda el token en `st.session_state` y lo manda en el encabezado `Authorization`
   de cada pedido siguiente.
4. Usuario consulta un diputado o predice → la API valida el token en cada endpoint; si es
   válido responde, si no, 401.
5. Al predecir, la API guarda el resumen en la tabla `predicciones` con el `usuario_id`.
6. Usuario abre "Mis predicciones" → `GET /mis-predicciones` devuelve solo las suyas.
7. Cerrar sesión → la app borra el token de `st.session_state`.

### Usuario de prueba para el profesor

La API, al iniciar, se asegura de que exista un **usuario de prueba fijo** (lo crea solo si no
existe todavía — operación idempotente, no lo duplica en cada arranque). El usuario y la
contraseña de prueba se leen de variables de entorno (`USUARIO_PRUEBA`, `CLAVE_PRUEBA`), no
van escritos en el código. Documentar esas credenciales para el profesor es parte del deploy
(spec 017), pero el mecanismo que garantiza que el usuario exista se construye acá.

## Independencia del modelo de predicción (principio de diseño, vale de acá en adelante)

**Regla**: todo lo que construimos desde esta spec (base de datos, login, historial, y las
specs futuras 016/017) debe seguir funcionando **sin ningún cambio** si en el futuro se ajusta
o reentrena el modelo — por ejemplo, para que reconozca mejor los votos NEGATIVOS. El modelo y
la capa de aplicación quedan **desacoplados**.

**Dónde está la frontera**: la única puerta entre "la app/API" y "el modelo" es la función

```
modelo.predecir_votos(titulo, autor) → (predicciones, tema_id, tema_label, bloque_autor)
```

donde `predicciones` es la lista de los 257 diputados con su `voto_predicho` (uno de
AFIRMATIVO / NEGATIVO / ABSTENCIÓN). **El contrato es**: mismas entradas (título + autor),
misma forma de salida, mismas tres clases de voto.

**Cómo lo garantizamos, de forma verificable**:
1. Los módulos nuevos (`api/db.py`, `api/tablas.py`, `api/seguridad.py`,
   `api/routers/auth.py`, `api/routers/historial.py`) **no importan `api/modelo.py`**: no
   saben nada del modelo. Se puede verificar con una simple búsqueda de imports.
2. El guardado del historial (en el router `/predecir`) opera sobre el **resultado ya
   devuelto** por `predecir_votos`, tratándolo como datos genéricos. Cuenta los votos de la
   lista sin asumir cómo se generaron.
3. La tabla `predicciones` guarda conceptos del **dominio político** (título, autor, tema,
   cuántos votos de cada tipo), no artefactos internos del modelo (nada de features, pesos,
   nombres de columnas, ni versiones de librería). Si mañana el modelo predice distinto, la
   tabla sigue siendo válida: cada fila es "lo que el modelo dijo ese día".
4. Optimizar el modelo para negativos = reemplazar el `.joblib` y su lógica en `modelo.py`.
   **Ningún** archivo de esta spec necesita cambiar mientras el contrato de arriba se respete.

**Qué sí requeriría tocar la app**: solo un cambio que **rompa el contrato** — por ejemplo, si
el modelo pasara a devolver una cuarta clase de voto, o a necesitar un tercer dato de entrada
además de título y autor. En ese caso se adaptarían únicamente `modelo.py` y el router
`/predecir`, nunca la capa de usuarios/base de datos. Ese contrato queda documentado acá como
el punto a respetar en cualquier ajuste futuro del modelo.

## Librerías y herramientas

Todas son el stack estándar y documentado de FastAPI para autenticación; ninguna es exótica.

| Librería | Para qué | Por qué esta |
|----------|----------|--------------|
| `SQLAlchemy` | Mapear las tablas y consultar la base (ORM) | Es lo que pide el checklist (#4) y el estándar de Python. |
| `psycopg2-binary` | Driver para que Python hable con PostgreSQL | Necesario para conectarse a Postgres; `-binary` no requiere compilar. |
| `passlib[bcrypt]` | Encriptar contraseñas con bcrypt (#7) | Estándar; expone `bcrypt` de forma simple y segura. |
| `python-jose[cryptography]` | Crear y validar los tokens JWT (#6) | La librería que usa la doc oficial de FastAPI para JWT. |
| `python-dotenv` | Leer el archivo `.env` en local | Para cargar los secretos (URL de la base, clave del JWT) sin escribirlos en el código. |

Para leer el token del encabezado se usa `HTTPBearer` (ya viene en FastAPI, sin dependencia
extra). **No** se agrega Alembic (migraciones): las tablas se crean con una sola instrucción
al iniciar (`create_all`), suficiente para dos tablas simples — Principio 7 (simple antes que
sofisticado).

## Diseño anti-leakage / validación

**No aplica.** Esta feature **no entrena, no evalúa ni modifica ningún modelo**, y no crea
ninguna feature de Machine Learning. Por lo tanto:
- **Validación temporal (P2)**: no corresponde — no hay partición de datos ni entrenamiento.
- **Fuga de información (P3)**: no corresponde — no se calcula ninguna feature a partir del
  historial de votos.
- **F1-macro (P4)**: no corresponde — no se mide ningún modelo.

El único cuidado equivalente en espíritu es de **consistencia**: al envolver `/predecir` con
autenticación y guardado, el resultado del modelo tiene que quedar **idéntico** al de la spec
014. Se garantiza porque no se toca `api/modelo.py`: la autenticación es un chequeo *previo* a
llamar al modelo, y el guardado es un paso *posterior* que lee el resultado ya calculado, sin
alterarlo. Se verifica comparando la salida de `/predecir` para un título+autor fijo contra la
respuesta de la 014.

## Pasos de implementación

1. **Base de datos externa**: crear un proyecto PostgreSQL gratuito (Supabase o Neon), obtener
   la cadena de conexión (`DATABASE_URL`) y ponerla en `.env` (local). Elegir el proveedor y
   dejarlo documentado.
2. **`.env` y `.env.example`**: definir `DATABASE_URL`, `JWT_SECRET_KEY`, `USUARIO_PRUEBA`,
   `CLAVE_PRUEBA`. Committear solo `.env.example` (sin valores reales); `.env` ya está en
   `.gitignore`.
3. **`api/db.py`**: motor SQLAlchemy leyendo `DATABASE_URL`, `SessionLocal`, `Base`, y la
   dependencia `get_db`.
4. **`api/tablas.py`**: clases `Usuario` y `Prediccion` con las columnas definidas arriba.
5. **`api/seguridad.py`**: funciones `hashear_clave` / `verificar_clave` (passlib-bcrypt),
   `crear_token` / `validar_token` (python-jose), y la dependencia `usuario_actual` que lee el
   token, lo valida y devuelve el usuario (401 si falla).
6. **`api/schemas.py`**: agregar `RegistroRequest`, `LoginRequest`, `TokenResponse`,
   `PrediccionGuardada` (Pydantic, con validación de campos no vacíos — #2).
7. **`api/routers/auth.py`**: `POST /registro` (crea usuario, 400 si el username ya existe) y
   `POST /login` (valida credenciales, devuelve token; 401 si son incorrectas).
8. **`api/routers/historial.py`**: `GET /mis-predicciones` (protegido; lista solo las del
   `usuario_actual`, más recientes primero).
9. **Proteger endpoints existentes**: agregar la dependencia `usuario_actual` a `/diputados`,
   `/diputados/{id}` y `/predecir`.
10. **Guardar la predicción**: en `/predecir`, tras calcular el resultado, insertar una fila
    en `predicciones` con el `usuario_id` y el resumen (tema + conteo de votos predichos).
11. **`api/main.py`**: en el `lifespan`, crear las tablas si no existen (`create_all`) y
    sembrar el usuario de prueba si no existe. Registrar los routers `auth` e `historial`.
12. **Frontend `app/app.py`**: guardián de sesión al inicio (sin token → solo login/registro,
    con `st.stop()`); guardar el token en `st.session_state`; mandar `Authorization` en cada
    request; botón de cerrar sesión; tabla "Mis predicciones" con `GET /mis-predicciones`.
13. **`requirements.txt`**: agregar las 5 librerías con versión fija.
14. **Prueba de punta a punta**: registrar → login → consultar diputado → predecir → ver "Mis
    predicciones" → cerrar sesión → confirmar que sin token todo da 401. Verificar que
    `/predecir` devuelve lo mismo que la 014.

## Reproducibilidad

- **Sin azar**: no hay ningún componente aleatorio nuevo. El token JWT se firma con una clave
  fija (`JWT_SECRET_KEY`), no con algo aleatorio por corrida. La predicción sigue siendo
  determinista (no se toca el modelo).
- **Dependencias congeladas**: las 5 librerías nuevas van con versión fija en
  `requirements.txt` (Principio 5).
- **Entrada / salida**: la API lee su configuración de `.env` (nunca del código). La base de
  datos es la fuente persistente de usuarios y predicciones. Los CSV/artefactos de ML se leen
  igual que hoy, sin modificarse.
- **Datos crudos intocables (P5)**: no se sobrescribe ningún CSV ni artefacto existente; solo
  se agregan archivos nuevos y filas en la base.

## Riesgos y cómo se mitigan

- **La predicción cambia sin querer**: mitigado por no tocar `api/modelo.py`; verificación
  explícita comparando `/predecir` contra la salida de la spec 014 (paso 14).
- **Secretos filtrados a Git**: `JWT_SECRET_KEY` y la contraseña de Postgres son sensibles.
  Mitigación: van solo en `.env` (ya ignorado por Git); se committea un `.env.example` sin
  valores reales; revisar `git status` antes de commitear.
- **Incompatibilidad passlib + bcrypt**: versiones recientes de `bcrypt` (≥4.1) rompen con
  `passlib` 1.7.4 (error al leer la versión de bcrypt). Mitigación: fijar `bcrypt==4.0.1` en
  `requirements.txt` junto con `passlib`, combinación conocida como estable.
- **La base gratuita se suspende o cambia la URL**: los planes gratuitos de Supabase/Neon
  pueden pausar bases inactivas. Mitigación: elegir un proveedor estable, documentar cómo
  reconectar, y que la app muestre un mensaje claro si la base no responde (en vez de romperse).
- **Quedar bloqueados fuera de la app** por un guardián de sesión mal hecho: mitigado
  probando el flujo completo (paso 14) antes de cerrar la spec, incluido el caso de token
  ausente/inválido.
- **Contraseña en texto plano por error**: mitigado usando siempre `hashear_clave` antes de
  guardar y verificando en la prueba que la columna `password_hash` no contiene la clave real.

---

## Constitution Check

| Principio | ¿Aplica? | Estado |
|-----------|----------|--------|
| **P1 — Sin spec, no hay código** | Sí | ✅ `spec.md` aprobada antes de este plan. |
| **P2 — Validación temporal** | No | N/A — no se entrena ni se parten datos. |
| **P3 — Cero fuga de información** | No | N/A — no se crea ninguna feature de ML. |
| **P4 — Métrica honesta (F1-macro)** | No | N/A — no se mide ningún modelo. |
| **P5 — Reproducibilidad total** | Sí | ✅ Dependencias fijas; sin azar; datos crudos intactos; config por `.env`. |
| **P6 — Trazabilidad y memoria** | Sí | ✅ Se registra la decisión técnica en `memoria/DECISIONES.md`. |
| **P7 — Simple antes que sofisticado** | Sí | ✅ `create_all` en vez de Alembic; `HTTPBearer` nativo; sin roles ni recuperación de clave; solo librerías justificadas. |
| **P8 — El equipo entiende lo que entrega** | Sí | ✅ Plan explicado en lenguaje claro; sin cajas negras. |

**Resultado: PASA los 8 principios.** Los tres específicos de ML (P2, P3, P4) no aplican
porque esta spec es de infraestructura (base de datos + autenticación), no de modelado, y así
queda dicho explícitamente para no inventarles un problema que no tienen.
