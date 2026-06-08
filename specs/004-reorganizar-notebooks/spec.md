# Spec 004 — Reorganización de notebooks y rutas de datos

## Objetivo
Mover los tres notebooks iniciales del proyecto (`Scraping`, `STG_1`, `STG_2`) a la
carpeta `notebooks/` y corregir sus rutas de lectura y escritura de archivos para que
todos los CSVs se lean y guarden en `data/`. Así el repositorio queda ordenado y
cualquier miembro del equipo puede correr las notebooks desde cero sin tocar nada a mano.

## Problema que resuelve
Hoy los tres notebooks viven sueltos en la raíz del repositorio (junto con el código de
la app, los archivos de configuración, etc.). Además, `STG_1` y `STG_2` no guardan su
resultado en ningún archivo: si alguien corre `STG_1`, el dataframe filtrado queda solo
en memoria y se pierde al cerrar el notebook. `Scraping` sí guarda, pero lo hace en la
raíz en lugar de en `data/`.

## Qué construir (en lenguaje funcional)

**Paso 1 — Mover notebooks a `notebooks/`**
Los tres archivos pasan de la raíz a la carpeta `notebooks/`. A partir de ahí, todos
los notebooks del proyecto viven en el mismo lugar.

**Paso 2 — Corregir `Scraping.ipynb`**
Solo corregir las rutas de escritura para que los CSVs que genera se guarden en
`data/` en vez de en la carpeta desde donde se corre el notebook.
*No se vuelve a correr* porque tarda demasiado; la corrección es para futuras ejecuciones.

**Paso 3 — Corregir `STG_1_Filtrado.ipynb`**
- Que lea sus archivos de entrada desde `data/` (los CSVs que genera Scraping).
- Que al terminar guarde su resultado (`votaciones_filtrado.csv`) en `data/`.

**Paso 4 — Corregir `STG_2_transformacion.ipynb`**
- Que lea sus archivos de entrada desde `data/`.
- Que al terminar guarde su resultado (`df_consolidado.csv`) en `data/`.

Después de las correcciones, el usuario va a correr `STG_1` y `STG_2` de nuevo para
regenerar los CSVs en la ubicación correcta.

## Datos involucrados

| Archivo | Rol | Ubicación correcta |
|---|---|---|
| `hcdn_votaciones_historico.csv` | output de Scraping, input de STG_1 | `data/` |
| `diputados_actuales.csv` | input de STG_1 | `data/` |
| `votaciones_filtrado.csv` | output de STG_1, input de STG_2 | `data/` |
| `df_consolidado.csv` | output de STG_2, input de STG_3 | `data/` ✅ (ya existe) |

## Criterios de aceptación
- [ ] `Scraping.ipynb`, `STG_1_Filtrado.ipynb` y `STG_2_transformacion.ipynb` están en `notebooks/`
- [ ] `Scraping.ipynb` guarda sus CSVs en `data/` (para futuras ejecuciones)
- [ ] `STG_1_Filtrado.ipynb` lee desde `data/` y guarda `votaciones_filtrado.csv` en `data/`
- [ ] `STG_2_transformacion.ipynb` lee desde `data/` y guarda `df_consolidado.csv` en `data/`
- [ ] Después de correr STG_1 y STG_2, `data/votaciones_filtrado.csv` y `data/df_consolidado.csv` existen y tienen datos
- [ ] No queda ningún notebook en la raíz del repositorio

## Fuera de alcance
- Re-correr `Scraping.ipynb` (tarda demasiado; solo se corrigen las rutas)
- Re-correr STG_3 y STG_4 (sus rutas ya son correctas)
- Cambiar la lógica interna de ningún notebook (solo rutas)
- Renombrar columnas ni modificar el esquema de ningún CSV

## Riesgos conocidos
- `STG_2` lee un archivo llamado `votaciones_filtrado.csv` que es el output de `STG_1`.
  Si STG_1 guarda con un nombre diferente hay que asegurarse de que coincidan.
- Si el CSV de Scraping (`hcdn_votaciones_historico.csv`) no está en `data/` antes de
  correr STG_1, el notebook va a fallar. Hay que moverlo manualmente antes de correr.
