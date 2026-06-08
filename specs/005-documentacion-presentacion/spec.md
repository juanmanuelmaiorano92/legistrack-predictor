# Spec 005 — Documentación y guía de presentación

## Objetivo

Producir dos documentos que permitan al equipo mostrar el proyecto con claridad: un README
actualizado que refleje el estado real del repositorio, y una guía de presentación que explique
qué hace cada parte del sistema (notebooks y app) en lenguaje accesible para una clase.

## Problema que resuelve

Hoy el repositorio no tiene un README que refleje el estado actual del proyecto (scraping,
limpieza, filtrado de títulos, features semánticas, app publicada). El equipo tampoco tiene un
documento de apoyo para presentar los avances en clase: hay que poder explicar cada decisión sin
improvisar.

## Qué construir (en lenguaje funcional)

### Documento 1: README.md (raíz del repositorio)

Reescribir el README existente con:
- Descripción breve del proyecto: qué predice, para quién, con qué datos.
- Estado actual: qué etapas están terminadas y cuáles están en progreso.
- Estructura del repositorio: qué hace cada carpeta y archivo principal.
- Cómo correr el proyecto localmente (instalar dependencias, ejecutar notebooks en orden, levantar la app).
- Link a la app publicada en Streamlit Cloud.
- Redacción en español, sin exceso de emojis, con un tono directo que no suene a texto generado automáticamente.

### Documento 2: guia-presentacion.pdf

Guía narrativa que el equipo puede leer antes de presentar en clase. Cubre:
- **Notebook de scraping**: qué datos se bajan, de dónde, cómo se estructuran.
- **STG 1 (filtrado)**: qué hace el filtro de diputados actuales y por qué.
- **STG 2 (transformación y consolidación)**: cómo se normaliza el voto por proyecto, qué problema resuelve el agrupamiento de artículos.
- **STG 3 (filtro de títulos)**: por qué se eliminan mociones y habilitaciones, qué queda.
- **STG 4 (features semánticas)**: qué son los embeddings y el clustering, explicado sin matemáticas.
- **App Streamlit**: qué puede hacer un usuario hoy, qué muestra.
- **Deploy en Streamlit Cloud**: cómo se conectó el repositorio a Streamlit, qué es `requirements.txt` y por qué importa.

Cada sección incluye: qué entra, qué sale, por qué fue necesario ese paso, y una o dos preguntas
frecuentes que un profesor o compañero podría hacer.

## Datos involucrados

No hay transformaciones de datos. Los documentos describen el pipeline existente:
`hcdn_votaciones_historico.csv` → STGs → `df_consolidado.csv` → `df_modelado.csv` →
`df_features_titulo.csv`.

## Criterios de aceptación

- [ ] El README describe correctamente las etapas terminadas (STG 1–4 + app) y las pendientes (modelado).
- [ ] El README tiene instrucciones funcionales para correr el proyecto localmente.
- [ ] La guía cubre los seis elementos del pipeline (scraping, STG 1, STG 2, STG 3, STG 4, app + deploy).
- [ ] Ambos documentos están escritos en español claro, sin jerga innecesaria, sin lista de emojis al inicio de cada ítem.
- [ ] Un integrante del equipo puede leer la guía y responder preguntas básicas de la presentación sin haber escrito el código.
- [ ] La guía no asume conocimiento de programación: los conceptos técnicos (embeddings, clustering, TF-IDF, etc.) se explican con analogías o ejemplos concretos antes de usarlos.

## Fuera de alcance

- No se documenta el modelado (aún no existe).
- No se crea documentación técnica tipo docstring o comentarios en el código.
- No se modifica ningún notebook ni archivo de datos.
- El PDF de la guía no se sube al repositorio (se comparte por mail/WhatsApp).

## Riesgos conocidos

- La guía puede volverse demasiado extensa si se intenta cubrir cada detalle técnico. Hay que
  mantener el foco en "qué hace y por qué", no en "cómo funciona el código línea a línea".
- El README debe estar sincronizado con el estado real del repositorio; si cambian notebooks o
  rutas, hay que actualizarlo.
