# Tareas 007 — Datos del pipeline disponibles en GitHub

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

- [x] T1 — Verificar que Git LFS está instalado y activo: correr `git lfs version` y `cat .gitattributes` para confirmar que `*.csv filter=lfs` está presente
- [x] T2 — Actualizar `.gitignore`: reemplazar `data/*` + `!data/df_consolidado.csv` por una política que permita todos los archivos de `data/` (depende de: T1)
- [x] T3 — Crear `data/README.md` con tabla de archivos, su tamaño, origen (qué notebook lo genera) y nota sobre Git LFS (depende de: T2)
- [x] T4 — Hacer `git add data/` y verificar con `git status` que los 7 archivos nuevos aparecen como staged y que los `.csv` figuran como objetos LFS (depende de: T3)
- [x] T5 — Commit: `git commit -m "chore: agrega archivos de datos al repo vía Git LFS"` (depende de: T4)
- [x] T6 — Push a `main`: `git push origin main` y verificar en GitHub que los archivos aparecen en `data/` con el badge "Stored with Git LFS" (depende de: T5)
- [x] T7 — Validar contra criterios de aceptación de la spec: confirmar que los 8 archivos están visibles en GitHub, que `hcdn_votaciones_historico.csv` muestra badge LFS, y que `data/README.md` existe
- [x] T8 — Registrar resultado en `memoria/DECISIONES.md` (depende de: T7)
