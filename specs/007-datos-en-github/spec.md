# Spec 007 — Datos del pipeline disponibles en GitHub

## Objetivo
Que cualquier integrante del equipo pueda clonar el repositorio y tener todos los archivos
de datos necesarios para correr los notebooks, sin tener que pedirlos por separado ni
regenerarlos desde cero.

## Problema que resuelve
Hoy el `.gitignore` excluye toda la carpeta `data/` excepto `df_consolidado.csv`.
Los demás archivos solo existen en la computadora de quien los generó. Si otro integrante
clona el repo, los notebooks STG_1 al STG_4 no pueden correr porque les faltan los CSV de
entrada y salida intermedios.

## Qué construir (en lenguaje funcional)
Modificar la configuración del repositorio para que **todos los archivos de `data/` queden
disponibles en GitHub**, usando dos mecanismos:

1. **Archivos medianos/pequeños → Git normal** (GitHub los acepta hasta 100 MB sin problema):
   - `diputados_actuales.csv` (22 KB)
   - `votaciones_filtrado.csv` (17.6 MB)
   - `df_consolidado.csv` (7 MB) — ya está
   - `df_modelado.csv` (6 MB)
   - `df_features_titulo.csv` (4.7 MB)
   - `proyectos_parlamentarios2.1.csv` (33 MB)
   - `titulos_autor.xlsx` (90 KB)

2. **Archivo grande → Git LFS** (Git Large File Storage, la extensión oficial de GitHub para
   archivos pesados). Git LFS guarda el contenido del archivo en un servidor especial de
   GitHub y pone un puntero liviano en el repositorio. Para quien clona, funciona exactamente
   igual que un archivo normal:
   - `hcdn_votaciones_historico.csv` (140 MB)

3. Se actualiza el `.gitignore` para permitir todos los archivos de `data/`.

4. Se configura Git LFS en el repositorio para que rastrée el CSV de 140 MB.

5. Se agrega un `data/README.md` breve explicando qué archivo genera cada notebook.

## Datos involucrados
Todos los archivos de la carpeta `data/`. No se toca ninguna columna ni estructura de datos.

## Criterios de aceptación
- [ ] Al clonar el repo en una computadora nueva, `data/` contiene los 8 archivos listados.
- [ ] `hcdn_votaciones_historico.csv` está gestionado por Git LFS (verificable con
      `git lfs ls-files`).
- [ ] El `.gitignore` permite todos los archivos de `data/`.
- [ ] Existe `data/README.md` explicando la procedencia de cada archivo.
- [ ] Los notebooks STG_1 al STG_4 pueden abrirse sin buscar archivos adicionales.
- [ ] Cumple la CONSTITUCIÓN: los datos crudos originales no se modifican; solo se cambia
      qué se versiona.

## Fuera de alcance
- No se cambia ningún notebook ni columna de datos.
- No se automatiza el scraping.

## Riesgos conocidos
- **Cuota de Git LFS**: GitHub da 1 GB de almacenamiento LFS y 1 GB de transferencia por mes
  gratis. El CSV de 140 MB consume ~14% del almacenamiento y ~14% de la cuota de descarga
  por cada clon completo. Con un equipo pequeño no debería ser problema.
- **Git LFS debe estar instalado localmente** para que quien clone pueda descargar el archivo
  grande. Si no lo tiene instalado, descarga solo el puntero (un archivo de texto de ~130 bytes).
  Hay que avisar al equipo.
- Si el repo ya configuró LFS anteriormente (hay registro en `memoria/DECISIONES.md`), hay
  que verificar que la configuración esté activa antes de agregar archivos.
