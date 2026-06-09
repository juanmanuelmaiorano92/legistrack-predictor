# Plan 007 — Datos del pipeline disponibles en GitHub

## Enfoque técnico

El repositorio ya tiene Git LFS configurado (`.gitattributes` con `*.csv filter=lfs`):
todos los archivos `.csv` que se agreguen al repo quedarán automáticamente en LFS, sin
importar su tamaño. Eso incluye el archivo de 140 MB.

El único cambio estructural es en `.gitignore`: hoy bloquea `data/*` y solo deja pasar
`df_consolidado.csv`. Hay que abrir ese bloqueo para que Git vea todos los archivos de `data/`.

Pasos conceptuales:
1. Verificar que Git LFS está instalado y funcionando.
2. Actualizar `.gitignore` para dejar de bloquear `data/`.
3. Crear `data/README.md` con la tabla de archivos.
4. Agregar todos los archivos nuevos al staging y hacer un commit.
5. Hacer push (incluye el push a LFS).

## Librerías y herramientas

- **Git LFS** — ya instalado y configurado en el repo. No requiere instalación adicional.
  Extensión: `*.csv filter=lfs diff=lfs merge=lfs -text` (ya está en `.gitattributes`).
- **Git** — operaciones estándar (`git add`, `git commit`, `git push`).
- No se usa ninguna librería de Python ni se modifica ningún notebook.

## Diseño anti-leakage / validación

Esta feature no toca el modelo ni los datos en sí — solo cambia qué archivos se versionan
en el repositorio. **No aplica el principio de leakage ni de validación temporal.**

Los datos no se modifican, no se reordenan ni se filtran. Los archivos que se suben son
exactamente los que ya existen en `data/` en la computadora local.

## Pasos de implementación

1. **Verificar Git LFS**: correr `git lfs version` para confirmar que está instalado.
   Confirmar con `cat .gitattributes` que `*.csv` está rastreado por LFS.

2. **Actualizar `.gitignore`**: reemplazar las líneas actuales del bloque `data/` por una
   sola excepción que permita todos los archivos (o simplemente eliminar el bloqueo):
   ```
   # Antes:
   data/*
   !data/df_consolidado.csv

   # Después:
   # (sin bloqueo de data/)
   ```
   Mantener la excepción para el `.xlsx` si hace falta (`.gitattributes` solo cubre `.csv`).

3. **Crear `data/README.md`** con tabla de archivos, su origen y qué notebook los genera.

4. **Staging**: `git add data/` — Git detecta los nuevos archivos; los `.csv` van a LFS
   automáticamente por el `.gitattributes` ya configurado.

5. **Commit**: `git commit -m "chore: agrega archivos de datos al repo vía Git LFS"`

6. **Push**: `git push origin main` — Git LFS sube los binarios al servidor de LFS de
   GitHub y el commit con los punteros va al repo normal.

## Reproducibilidad

- No hay semillas ni modelos involucrados.
- Los archivos subidos son outputs deterministas del pipeline (STG_1 → STG_4). Cualquiera
  que corra los notebooks desde el CSV crudo llega al mismo resultado.
- Entrada: archivos existentes en `data/` en la máquina local.
- Salida: los mismos archivos disponibles en GitHub para clonar.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|--------|-----------|
| **Cuota LFS**: 1 GB gratis; el CSV de 140 MB usa el 14% por clon | Con equipo de 3-5 personas no se supera. Monitorear en GitHub → Settings → Billing. |
| **Git LFS no instalado** en otra máquina | Documentar en `data/README.md` y en el `README.md` principal que se necesita `git lfs install` antes de clonar. |
| **`.xlsx` no cubierto por LFS** | `titulos_autor.xlsx` pesa 90 KB — entra sin LFS sin problema. |
| **Archivos ya en LFS history** (votaciones_filtrado.csv aparece en `git lfs ls-files`) | Algunos archivos ya tienen historia LFS de commits anteriores. No es un problema — Git los maneja correctamente. |
| **Streamlit Cloud** descarga el repo al hacer deploy | Streamlit Cloud no tiene LFS. Solo necesita `df_consolidado.csv` (ya está) y `df_features_titulo.csv` si la app los usa. Verificar que la app no intente leer el CSV de 140 MB. |

---

## Constitution Check

| Principio | ¿Aplica? | Resultado |
|-----------|----------|-----------|
| 1 — Sin spec, no hay código | ✅ | Spec 007 aprobada |
| 2 — Validación temporal | ➖ No aplica | No se tocan modelos ni splits |
| 3 — Cero data leakage | ➖ No aplica | No se crean features ni se calculan estadísticas |
| 4 — Métrica honesta (F1-macro) | ➖ No aplica | No hay evaluación de modelo |
| 5 — Reproducibilidad | ✅ | Los archivos son outputs deterministas del pipeline |
| 6 — Trazabilidad y memoria | ✅ | Se registra en `memoria/DECISIONES.md` |
| 7 — Simple antes que sofisticado | ✅ | Se usa la config LFS ya existente; sin herramientas nuevas |
| 8 — El equipo entiende lo que entrega | ✅ | Operación de Git; explicable en una oración |

**Resultado del Constitution Check: APROBADO ✅**
