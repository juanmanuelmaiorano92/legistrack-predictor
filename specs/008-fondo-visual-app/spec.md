# Spec 008 — Fondo visual difuminado en la app

## Objetivo
Mejorar la apariencia de la app de LegisTrack reemplazando el fondo blanco por un diseño
visual con las tres fotografías del Congreso, difuminadas para que no interfieran con el
contenido. El resultado debe verse profesional y contextualizar visualmente que la app
pertenece al ámbito legislativo argentino.

## Problema que resuelve
La app actual tiene un aspecto muy básico (fondo blanco, sin identidad visual). Para una
presentación o demo, un diseño con imágenes institucionales le da más presencia y claridad
sobre el tema que aborda.

## Qué construir (en lenguaje funcional)

Se usan las tres imágenes ya disponibles en `app/assets/`:
- `congreso (1).jpg` — vista exterior del Congreso Nacional
- `N732QHZEXRDKNADNAI7V2VHXEI (1).jpg` — interior del recinto en sesión
- `en-el-futuro-congreso-...avif` — tercera imagen del Congreso

El fondo de la app mostrará las tres imágenes **combinadas en una sola franja horizontal**,
dispuestas de izquierda a derecha y fusionadas con una transición suave entre ellas
(degradado). Sobre el fondo se aplica un **difuminado** (blur) y una **capa semitransparente
oscura** para que el texto blanco de la app sea siempre legible.

El contenido de la app (selectbox, botones, tabla) queda **sin cambios de funcionalidad**.
Solo cambia el aspecto visual del fondo.

## Datos involucrados
Ninguno (es cambio visual, no toca los datos ni el modelo).

## Criterios de aceptación
- [ ] Las tres imágenes aparecen fusionadas como fondo de pantalla completa
- [ ] El fondo tiene difuminado visible (blur) y capa de opacidad que garantiza legibilidad
- [ ] El texto e interactivos de la app se leen claramente sobre el fondo
- [ ] La imagen de fondo combinada se genera una sola vez (no en cada carga) y se guarda en `app/assets/`
- [ ] El AVIF se convierte a JPG/PNG antes de combinar (compatibilidad con Pillow y Streamlit Cloud)
- [ ] La app funciona igual en local y en Streamlit Cloud
- [ ] No se rompe ninguna funcionalidad existente (historial, tabla de votos)

## Fuera de alcance
- Cambios en la paleta de colores de los widgets de Streamlit
- Animaciones o fondos que cambian con el tiempo
- Diseño responsivo para mobile
- Cambios en los textos o lógica de la app

## Riesgos conocidos
- El formato `.avif` no es soportado por todas las versiones de Pillow; se convierte a PNG como primer paso
- Streamlit Cloud usa CSS con clases que pueden cambiar entre versiones; hay que apuntar a `.stApp` que es el contenedor estable
- La imagen combinada pesa más si se carga como base64; se preferirá archivo en disco dentro del repo
