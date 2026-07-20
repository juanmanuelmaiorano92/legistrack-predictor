# Spec 015 — Base de datos, login y autenticación (usuarios + historial de predicciones)

## Objetivo
Que LegisTrack tenga **usuarios reales**: cada persona se crea una cuenta, inicia sesión, y
solo puede usar la app estando autenticada. Cada predicción que hace queda **guardada a su
nombre** en una base de datos persistente en la nube. Con esto el proyecto pasa de ser una
app abierta a un sistema con cuentas, seguridad y memoria de lo que hizo cada usuario.

## Problema que resuelve
Hoy la app y la API son **completamente abiertas**: cualquiera que tenga la URL puede
consultar y predecir sin identificarse, y no queda registro de quién hizo qué. Además, no
existe ninguna base de datos: todo son archivos CSV y artefactos `.joblib` que se leen en
memoria. Esto incumple varios ítems del checklist de la cátedra (base de datos persistente,
login, protección de endpoints, encriptación de contraseñas).

Esta feature cubre los ítems **#3, #4, #5, #6 y #7** del checklist MVP.

## Qué construir (en lenguaje funcional)

**1. Una base de datos persistente en la nube.**
Una base de datos (PostgreSQL, en un servicio gratuito tipo Supabase o Neon) que **no se
borra al reiniciar** el servidor. Guarda **solo dos cosas**:
- **Usuarios**: quién tiene cuenta (nombre de usuario, contraseña encriptada, fecha de alta).
- **Historial de predicciones**: cada vez que un usuario hace una predicción, se guarda quién
  la hizo, cuándo, qué título de ley y qué autor consultó, y un resumen del resultado (tema
  detectado y cómo quedó repartida la votación: cuántos AFIRMATIVO / NEGATIVO / ABSTENCIÓN).

**2. Registro e inicio de sesión.**
- Cualquier persona puede **crearse una cuenta** desde la app (usuario + contraseña).
- Con esa cuenta **inicia sesión**. Si el usuario o la contraseña son incorrectos, la app lo
  avisa y no lo deja entrar.
- El equipo deja creado un **usuario de prueba fijo** (con credenciales conocidas) para que el
  profesor pueda entrar sin registrarse.

**3. Contraseñas seguras.**
Las contraseñas **nunca** se guardan tal cual. Se guardan encriptadas (con `bcrypt` vía
`passlib`), de forma que ni el equipo pueda leer la contraseña real de un usuario mirando la
base de datos.

**4. Todo detrás del login.**
- **En la app**: si no iniciaste sesión, solo ves la pantalla de login/registro. Nada más
  (ni consulta de diputados ni predicción) está disponible sin sesión activa.
- **En la API**: todos los endpoints que hoy son abiertos (`/diputados`, `/diputados/{id}`,
  `/predecir`) pasan a **exigir un token válido**. Un pedido sin token o con token inválido
  es rechazado (error 401, "no autorizado"). El token se obtiene al iniciar sesión (JWT) y la
  app lo manda en cada pedido.

**5. Guardado automático de cada predicción.**
Cuando un usuario logueado hace una predicción, el resultado se guarda automáticamente en la
base de datos asociado a su cuenta. El usuario puede **ver la lista de sus propias
predicciones anteriores** (una tabla simple: fecha, título, autor, resultado resumido). Un
usuario solo ve **sus** predicciones, no las de los demás.

## Datos involucrados
- **No se toca el modelo ni los datos de ML.** El modelo (`modelo_lgbm_autor.joblib`), los
  snapshots, la nómina de 257 diputados y toda la lógica de predicción de la spec 014 quedan
  **exactamente igual**. Esta spec agrega una capa de usuarios y persistencia *alrededor*, no
  cambia qué predice ni cómo.
- **Datos nuevos** (en la base PostgreSQL, no en CSV):
  - Tabla `usuarios`: identificador, nombre de usuario (único), contraseña encriptada, fecha
    de alta.
  - Tabla `predicciones`: identificador, referencia al usuario que la hizo, fecha/hora,
    título de ley consultado, autor consultado, y el resumen del resultado (tema + conteo de
    votos predichos).
- El historial de votos de diputados y las predicciones en sí siguen calculándose desde los
  CSV/artefactos como hoy; la base de datos **solo** almacena usuarios y el registro de
  predicciones, tal como se acordó.

## Criterios de aceptación
- [x] Existe una base de datos PostgreSQL en la nube, conectada a la API, que conserva los
      datos entre reinicios del servidor. **Evidencia**: T4 (conexión real a Supabase, `SELECT
      1`), T5 (tablas creadas y visibles en el panel de Supabase), T15 (idempotencia probada
      llamando el sembrado dos veces — un reinicio real no duplica ni pierde datos).
- [x] Un usuario nuevo puede registrarse desde la app con usuario y contraseña. **Evidencia**:
      T16 (registro vía `AppTest`, mensaje de éxito), T19 paso 2 (flujo completo).
- [x] Un usuario registrado puede iniciar sesión; con credenciales incorrectas, la app lo
      rechaza con un mensaje claro. **Evidencia**: T11 (backend: 401 genérico), T16 (frontend:
      mensaje "Usuario o contraseña incorrectos" mostrado en pantalla).
- [x] Existe un usuario de prueba fijo, documentado, para que el profesor entre sin
      registrarse. **Evidencia**: T15 (sembrado idempotente al iniciar la API, credenciales en
      `.env`). **Caveat**: hoy solo está "documentado" para el equipo (`.env.example` +
      `memoria/DECISIONES.md`); una nota en el README con las credenciales reales para que el
      profesor las vea recién tiene sentido **junto con el deploy** (spec 017 — el checklist
      MVP pide justamente README + credenciales de prueba como parte de la documentación de
      producción, ítem #18). Mecanismo construido y probado; documentación pública pendiente
      de spec 017 por decisión de alcance, no por omisión.
- [x] Las contraseñas en la base de datos están encriptadas con `bcrypt`/`passlib` (verificable:
      mirando la tabla no se lee ninguna contraseña en texto plano). **Evidencia**: T6 (hash no
      contiene la clave), T10 (verificado en la fila real de Supabase tras un registro).
- [x] Sin sesión iniciada, la app solo muestra la pantalla de login/registro; nada más es
      accesible. **Evidencia**: T16 (`AppTest`: 0 selectbox de diputado sin sesión), T19 paso 1.
- [x] Los endpoints `/diputados`, `/diputados/{id}` y `/predecir` rechazan (401) cualquier
      pedido sin un token JWT válido, y funcionan igual que antes con un token válido.
      **Evidencia**: T13 (401 sin token en los 3; con token, 257 diputados / historial real /
      257 predicciones, igual que antes de la spec).
- [x] Cada predicción que hace un usuario logueado queda guardada en la base asociada a su
      cuenta, y el usuario puede ver la lista de sus predicciones anteriores (solo las suyas).
      **Evidencia**: T12 (aislamiento probado con 2 usuarios reales), T14 (conteo guardado
      coincide con la respuesta), T18 (aparece en "Mis predicciones" tras predecir).
- [x] La predicción devuelve **exactamente el mismo resultado** que en la spec 014 para el
      mismo título y autor (la autenticación no cambia el modelo). **Evidencia**: T19 —
      comparación directa `modelo.predecir_votos()` vs. `POST /predecir` autenticado: las 257
      predicciones, el tema y el bloque_autor son **bit a bit idénticos**.
- [x] Los secretos (URL/contraseña de la base, clave secreta del JWT) se leen de variables de
      entorno, no están escritos en el código, y `.env` sigue ignorado por Git. **Evidencia**:
      T3 (creación), reverificado ahora con `git status` tras todos los cambios de la spec —
      `.env` no aparece, `.env.example` sí.
- [x] Cumple la CONSTITUCIÓN. Nota: los principios de validación temporal, anti-leakage y
      F1-macro (P2, P3, P4) **no aplican** porque esta spec no entrena ni modifica ningún
      modelo. Sí aplican reproducibilidad, simplicidad (P7) y que el equipo entienda lo que
      entrega (P8).

## Fuera de alcance
- **Deploy en la nube** (API en Render, app en Streamlit Cloud, gestión de secretos en el
  panel de la nube) — ítems #13, #14, #15 → **spec futura** (017). Esta spec deja todo
  funcionando **en local** contra la base PostgreSQL en la nube.
- **Navegación multisección con `st.sidebar`/`st.navigation` y gráficos interactivos**
  (Plotly/Altair) — ítems #10 y #12 → **spec futura** (016). Acá el frontend suma solo lo
  mínimo: pantalla de login/registro, mantener la sesión iniciada, y una tabla simple del
  historial de predicciones propio.
- Roles y permisos (admin vs. usuario común), recuperación de contraseña por email,
  verificación de email, límites de uso — nada de eso entra.
- Guardar en la base de datos el historial de votos de diputados o migrar los CSV a la base:
  se confirmó que la base **solo** guarda usuarios y predicciones.
- Reentrenar o modificar el modelo de ML.

## Riesgos conocidos
- **Consistencia de la predicción tras agregar autenticación**: al envolver `/predecir` con
  el guardián de JWT y el guardado en base, hay que garantizar que el resultado del modelo no
  cambie ni un voto. Se verifica comparando contra la salida de la spec 014 para el mismo
  título+autor.
- **Secretos filtrados**: la clave secreta del JWT y la contraseña de PostgreSQL son
  sensibles. El mayor riesgo es commitearlas por error. Mitigación: variables de entorno +
  `.env` en `.gitignore` (ya configurado) + un `.env.example` sin valores reales.
- **Dependencia de un servicio externo gratuito**: Supabase/Neon pueden tener límites o
  suspender bases inactivas en el plan gratuito. Hay que elegir uno estable y documentar cómo
  reconectarlo.
- **Bloqueo total por login mal implementado**: si el guardián de sesión falla, la app queda
  inusable (nadie puede entrar). Mitigación: probar el flujo completo registro → login →
  predicción → ver historial → cerrar sesión antes de dar por cerrada la spec.
- **No es una feature de ML**: el riesgo clásico del proyecto (leakage, validación temporal)
  no aplica acá, pero conviene dejarlo dicho explícitamente para no “buscar” un problema que
  esta spec no tiene.
