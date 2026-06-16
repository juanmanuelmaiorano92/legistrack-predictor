# Tareas 008 — Fondo visual difuminado en la app

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

- [x] T1 — Agregar `Pillow>=10.0` a `requirements.txt`

- [x] T2 — Crear `app/generar_fondo.py`: script que abre las tres imágenes de `app/assets/`, convierte el `.avif` a PNG, redimensiona las tres a 800 px de alto, las pega en una franja horizontal con degradado de fusión en las uniones (~200 px de overlap), aplica `GaussianBlur(radius=10)`, reduce el brillo al 55 % y guarda el resultado en `app/assets/fondo_combinado.jpg` (calidad 88) (depende de: T1)

- [x] T3 — Correr `python app/generar_fondo.py` y verificar que se genera `app/assets/fondo_combinado.jpg` sin errores (depende de: T2)

- [x] T4 — Verificar el peso de `fondo_combinado.jpg`: si supera 2 MB, reducir la altura a 600 px en el script y regenerar (depende de: T3)

- [x] T5 — Modificar `app/app.py`: agregar al inicio una función que lee `app/assets/fondo_combinado.jpg`, lo codifica en base64 e inyecta el CSS en `.stApp` con `background-size: cover` y `background-attachment: fixed`, usando `st.markdown(..., unsafe_allow_html=True)` (depende de: T3)

- [x] T6 — Correr la app localmente (`streamlit run app/app.py`) y verificar visualmente que: el fondo se ve, las tres imágenes se distinguen fusionadas, el texto y los widgets son legibles (depende de: T5)

- [x] T7 — Validar contra todos los criterios de aceptación de la spec 008:
  - [x] Las tres imágenes aparecen fusionadas como fondo de pantalla completa
  - [x] El fondo tiene difuminado visible y capa de oscurecimiento que garantiza legibilidad
  - [x] El texto e interactivos se leen claramente
  - [x] `fondo_combinado.jpg` existe en `app/assets/` y fue generado una sola vez
  - [x] El `.avif` fue convertido antes de procesar (convertido manualmente a congreso3.jpg)
  - [x] La funcionalidad existente (historial, tabla de votos) no se rompió
  (depende de: T6)

- [x] T8 — Registrar resultado final en `memoria/DECISIONES.md` (depende de: T7)
