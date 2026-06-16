# Plan 008 — Fondo visual difuminado en la app

## Enfoque técnico

El trabajo se divide en dos etapas separadas:

**Etapa A — Generar la imagen de fondo (se corre una sola vez en tu computadora):**
Un script Python toma las tres fotos del Congreso, las pone juntas en una franja horizontal,
suaviza las uniones entre ellas con un degradado, aplica el difuminado (blur) y oscurece
levemente el resultado para que el texto siempre se lea bien. La imagen combinada se guarda
en `app/assets/fondo_combinado.jpg` y queda en el repositorio.

**Etapa B — Usar la imagen en la app:**
Se agrega al `app.py` un bloque de CSS que pone esa imagen como fondo de pantalla completa.
Nada más cambia: ni la lógica, ni los datos, ni los widgets.

## Librerías y herramientas

| Librería | Para qué | ¿Ya está? |
|----------|----------|-----------|
| `Pillow` | Abrir, redimensionar, combinar y difuminar las imágenes | No → agregar a `requirements.txt` |
| `base64` | Convertir la imagen a texto para incrustarla en el CSS | Sí (viene con Python) |
| `pathlib` | Manejar rutas de archivos de forma segura | Sí (viene con Python) |

No se agrega ninguna otra dependencia.

## Diseño anti-leakage / validación

**No aplica.** Esta feature es puramente visual y no toca ningún dato de votaciones,
features de entrenamiento ni modelo. No hay riesgo de fuga de información.

## Pasos de implementación

1. **Agregar Pillow a `requirements.txt`.**

2. **Crear el script `app/generar_fondo.py`** que hace lo siguiente en orden:
   - Convierte el archivo `.avif` a `.png` usando Pillow (soporte nativo desde Pillow 9.1).
   - Abre las tres imágenes (`.jpg` × 2 + el `.png` recién convertido).
   - Redimensiona cada imagen a la misma altura (800 px), conservando proporciones.
   - Las pega en un canvas ancho (ancho total = suma de los tres anchos).
   - En las zonas de unión (franjas de ~200 px a cada lado del borde), aplica un
     degradado de transparencia para que las imágenes se fundan suavemente.
   - Aplica un difuminado gaussiano (`ImageFilter.GaussianBlur(radius=10)`).
   - Reduce el brillo al 55 % con `ImageEnhance.Brightness` para garantizar legibilidad.
   - Guarda el resultado como `app/assets/fondo_combinado.jpg` (calidad 88).

3. **Correr el script una vez** (`python app/generar_fondo.py`) para generar
   `fondo_combinado.jpg`.

4. **Modificar `app/app.py`** para:
   - Leer `app/assets/fondo_combinado.jpg` y codificarlo en base64.
   - Inyectar un bloque `<style>` con `st.markdown(..., unsafe_allow_html=True)` que aplica
     la imagen al selector `.stApp` con `background-size: cover` y `background-attachment: fixed`.
   - Este bloque de CSS se ejecuta al inicio del script, antes de cualquier widget.

5. **Verificar localmente** que el texto es legible y el fondo se ve bien.

6. **Agregar `fondo_combinado.jpg` al repo** (es un asset estático generado, no datos crudos).
   El script `generar_fondo.py` también queda en el repo para que cualquiera pueda
   regenerar el fondo si cambia las imágenes.

## Reproducibilidad

- El script `generar_fondo.py` siempre produce el mismo resultado a partir de las mismas
  imágenes fuente (no tiene componentes aleatorios).
- Las imágenes fuente viven en `app/assets/` dentro del repo.
- `fondo_combinado.jpg` también queda en el repo: Streamlit Cloud no necesita correr el
  script, solo sirve el archivo.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|--------|------------|
| Pillow no puede abrir el `.avif` en versiones viejas | Se exige `Pillow>=10.0` en `requirements.txt`, que tiene soporte AVIF estable |
| La imagen combinada es muy pesada (>3 MB) | Se guarda como JPEG calidad 88; si sigue pesada, se reduce la altura a 600 px |
| El texto queda ilegible sobre el fondo | Brillo al 55 % + revisión visual antes de commitear; si hace falta, se baja más |
| El selector `.stApp` cambia en versiones futuras de Streamlit | Es el selector público documentado; si cambia, el fix es una línea de CSS |
| Streamlit Cloud no puede leer base64 muy largo | Si el archivo supera ~2 MB codificado, se usa `st.image` oculto con CSS en vez de base64 |
