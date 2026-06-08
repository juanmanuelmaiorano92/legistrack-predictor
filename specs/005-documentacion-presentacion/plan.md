# Plan 005 — Documentación y guía de presentación

## Constitution Check

Esta spec produce únicamente documentación. No toca datos, no entrena modelos, no calcula
features. Los principios de validación temporal (P2), leakage (P3) y métrica (P4) no aplican.
Los demás principios se cumplen: hay spec aprobada (P1), se registra en DECISIONES.md (P6),
el enfoque es simple (P7) y el objetivo central es que el equipo pueda explicar lo que entrega (P8).

**Resultado: APROBADO sin observaciones.**

---

## Enfoque técnico

Se producen dos documentos de forma secuencial:

1. Primero el **README.md**, porque es más corto y su redacción ayuda a ordenar las ideas antes
   de escribir la guía más extensa.

2. Después la **guía de presentación en PDF**. Se escribe primero como un archivo Markdown
   (`guia-presentacion.md`) dentro de la carpeta de la spec, y luego se convierte a PDF usando
   la extensión de PDF disponible en el entorno. El MD intermedio no se sube al repositorio; solo
   se guarda el PDF final para compartir.

Ambos documentos se basan exclusivamente en información que ya existe: el historial de
`DECISIONES.md`, el código de los notebooks, el código de `app/app.py` y el README actual.
No se inventan detalles.

---

## Librerías y herramientas

- **Skill `/pdf`**: para convertir el Markdown de la guía a PDF con formato limpio. Es la
  herramienta ya disponible en el entorno; no se instala nada adicional.
- **Sin dependencias nuevas**: el README es un archivo de texto plano (Markdown). No requiere
  ninguna librería.

---

## Diseño anti-leakage / validación

No aplica. Este plan no procesa datos ni entrena modelos.

Lo que sí se cuida: el README debe describir el estado **real** del repositorio, no el estado
ideal o futuro. Antes de escribirlo se verifica la estructura de carpetas y el código existente
para no afirmar cosas que no son ciertas (ej: no decir que la app predice si aún no predice).

---

## Pasos de implementación

1. Verificar la estructura actual del repositorio (notebooks, app, data) para tener datos exactos.
2. Escribir el nuevo `README.md` en la raíz del repositorio.
3. Verificar que el README refleja el estado real (etapas, archivos, instrucciones funcionales).
4. Escribir la guía de presentación como `specs/005-documentacion-presentacion/guia-presentacion.md`.
5. Convertir ese Markdown a PDF con la skill `/pdf`.
6. Registrar el cierre de la spec en `memoria/DECISIONES.md`.

---

## Reproducibilidad

- El README queda versionado en Git junto con el repositorio.
- El archivo `guia-presentacion.md` (fuente del PDF) queda en `specs/005-documentacion-presentacion/`
  para poder regenerar el PDF si hay correcciones.
- El PDF se entrega al usuario para compartir; no se sube al repositorio.

---

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| El README describe archivos o etapas que no existen | Antes de escribir, se verifica la estructura real del repo con Glob |
| La guía queda muy técnica y el equipo no puede explicarla | Cada sección termina con preguntas frecuentes respondidas en lenguaje llano; sin código en el cuerpo del texto |
| El PDF pierde formato al convertir desde Markdown | Se usa la skill `/pdf` que maneja la conversión; si hay problemas de formato se ajusta el MD antes de re-convertir |
| El link a la app en Streamlit Cloud no está disponible | Se pregunta al equipo el link antes de finalizar el README, o se deja un placeholder claro |
