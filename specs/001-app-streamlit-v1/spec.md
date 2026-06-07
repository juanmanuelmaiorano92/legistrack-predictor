# Spec 001 — App Streamlit v1 (demo para presentación)

## Objetivo
Construir una primera versión de la aplicación web con Streamlit que permita explorar
el historial de votaciones de un diputado y muestre el espacio reservado para la
predicción futura. El objetivo es tener algo concreto y funcional para presentar antes
de que el modelo predictivo esté terminado.

## Problema que resuelve
Hoy el proyecto solo existe como notebooks de análisis. Para presentarlo a una audiencia
no técnica (o para la entrega académica) se necesita una interfaz donde cualquier persona
pueda interactuar con los datos sin abrir código. Esta versión establece la estructura
visual y funcional de la app, de modo que cuando el modelo esté listo solo haya que
"enchufarlo".

## Qué construir (en lenguaje funcional)

La app tiene una sola pantalla, sin estilos personalizados ni gráficos elaborados.
Se usan solo los componentes estándar de Streamlit (sin CSS extra, sin librerías de
visualización externas).

**1. Panel de búsqueda (entrada del usuario)**
- Selector desplegable para elegir un diputado.
- Selector desplegable para elegir un proyecto de ley (lista de títulos únicos).
- Un botón "Consultar".

**2. Historial del diputado (datos reales)**
Texto plano y una tabla simple de Streamlit (`st.dataframe`):
- Bloque y provincia (dos líneas de texto).
- Conteo de votos: AFIRMATIVO X, NEGATIVO Y, ABSTENCIÓN Z (texto, sin gráfico).
- Tabla con las últimas 10 votaciones: título, fecha, voto.

**3. Predicción (placeholder)**
Una línea de texto, sin recuadros ni diseño especial:
> "Modelo en desarrollo — la predicción estará disponible próximamente."

## Datos involucrados
- `df_consolidado` con columnas: `diputado`, `titulo_base`, `bloque`, `provincia`,
  `voto`, `fecha_votacion`.
- El CSV se carga desde `data/` al iniciar la app (no se conecta a ninguna base de datos).

## Criterios de aceptación
- [ ] La app corre localmente con `streamlit run app/app.py` sin errores.
- [ ] El selector de diputados lista los 257 diputados actuales.
- [ ] Al elegir un diputado, se muestran su bloque, provincia y estadísticas de votos reales.
- [ ] Se muestra la tabla con las últimas 10 votaciones del diputado.
- [ ] El recuadro de predicción es visible y deja claro que el modelo no está listo aún.
- [ ] La app se puede subir a Streamlit Cloud (el CSV se carga desde el repo o desde
  un archivo en `data/` que no esté en `.gitignore`).
- [ ] Cumple la CONSTITUCIÓN: no se calcula ninguna feature ni modelo en esta etapa;
  solo se muestran datos ya procesados.

## Fuera de alcance
- Integración con el modelo predictivo (eso va en una spec futura).
- Búsqueda de proyectos de ley por texto libre o por año.
- Comparación entre diputados.
- Autenticación o login.
- Filtros por fecha o bloque.

## Riesgos conocidos
- El CSV de `df_consolidado` puede ser grande para cargar en Streamlit Cloud; revisar
  si hace falta reducir columnas o filtrar antes de subir.
- Los títulos de proyectos (`titulo_base`) pueden ser muy largos para mostrar en una
  lista desplegable; puede necesitarse truncar o buscar por texto.
