from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Preformatted
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUTPUT = r"C:\Users\TALIGENT\Documents\GitHub\legistrack-predictor\specs\005-documentacion-presentacion\guia-presentacion.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2.5*cm,
    rightMargin=2.5*cm,
    topMargin=2.5*cm,
    bottomMargin=2.5*cm,
)

styles = getSampleStyleSheet()

titulo_doc = ParagraphStyle(
    "titulo_doc",
    parent=styles["Title"],
    fontSize=18,
    leading=22,
    spaceAfter=4,
    textColor=colors.HexColor("#1a1a2e"),
    alignment=TA_CENTER,
)
subtitulo_doc = ParagraphStyle(
    "subtitulo_doc",
    parent=styles["Normal"],
    fontSize=10,
    leading=14,
    spaceAfter=2,
    textColor=colors.HexColor("#444444"),
    alignment=TA_CENTER,
)
h2 = ParagraphStyle(
    "h2",
    parent=styles["Heading2"],
    fontSize=12,
    leading=16,
    spaceBefore=16,
    spaceAfter=4,
    textColor=colors.HexColor("#1a1a2e"),
    borderPad=0,
)
body = ParagraphStyle(
    "body",
    parent=styles["Normal"],
    fontSize=9.5,
    leading=14,
    spaceAfter=6,
    textColor=colors.HexColor("#222222"),
)
label = ParagraphStyle(
    "label",
    parent=body,
    fontSize=9.5,
    leading=14,
    spaceAfter=3,
)
code_style = ParagraphStyle(
    "code_style",
    parent=styles["Code"],
    fontSize=8,
    leading=12,
    backColor=colors.HexColor("#f4f4f4"),
    borderColor=colors.HexColor("#cccccc"),
    borderWidth=0.5,
    borderPad=6,
    spaceAfter=8,
    fontName="Courier",
)
pie = ParagraphStyle(
    "pie",
    parent=styles["Normal"],
    fontSize=8,
    textColor=colors.HexColor("#888888"),
    alignment=TA_CENTER,
    spaceBefore=12,
)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4, spaceBefore=4)

def bold_label(etiqueta, texto):
    return Paragraph(f"<b>{etiqueta}</b> {texto}", label)

story = []

story.append(Paragraph("LegisTrack — Guía de presentación", titulo_doc))
story.append(Paragraph("Cámara de Diputados de Argentina: predictor de votaciones", subtitulo_doc))
story.append(Paragraph("Estefanía Zangaro · Martina Pusso · Milagros Cosentino · Juan Manuel Maiorano", subtitulo_doc))
story.append(Spacer(1, 10))
story.append(hr())

# El proyecto
story.append(Paragraph("El proyecto", h2))
story.append(Paragraph(
    "LegisTrack predice cómo votaría cada diputado activo de la Cámara ante un proyecto de ley hipotético. "
    "El usuario ingresa el título de una ley y el sistema devuelve una predicción por diputado "
    "(AFIRMATIVO, NEGATIVO o ABSTENCIÓN), con una estimación de si el proyecto lograría la mayoría simple. "
    "El modelo se entrena sobre el historial real de votaciones nominales de la cámara.",
    body
))
story.append(hr())

# Encadenamiento
story.append(Paragraph("Cómo se encadenan los notebooks", h2))
story.append(Paragraph(
    "Cada etapa lee un archivo, lo transforma y guarda el resultado para que la siguiente lo use. "
    "Los datos originales nunca se modifican.",
    body
))
codigo_pipeline = (
    "Scraping.ipynb         →  hcdn_votaciones_historico.csv  (~578.500 filas)\n"
    "STG_1_Filtrado.ipynb   →  votaciones_filtrado.csv         (solo 257 diputados activos)\n"
    "STG_2_transformacion   →  df_consolidado.csv              (1 voto por diputado por ley)\n"
    "STG_3_filtro_titulos   →  df_modelado.csv                 (~28.700 filas útiles)\n"
    "STG_4_features_titulo  →  df_features_titulo.csv          (1.022 títulos con tema)"
)
story.append(Preformatted(codigo_pipeline, code_style))
story.append(hr())

# Scraping
story.append(Paragraph("Scraping — cómo conseguimos los datos", h2))
story.append(bold_label("Qué hace:",
    "consulta la API pública de la HCDN votación por votación, descarga el resultado de cada diputado "
    "en cada sesión y acumula todo en una sola tabla. El archivo resultante tiene una fila por voto "
    "individual: nombre del diputado, bloque, provincia, título del proyecto y resultado "
    "(AFIRMATIVO, NEGATIVO, ABSTENCIÓN)."
))
story.append(bold_label("Por qué fue necesario:",
    "los datos de la cámara son públicos pero no están disponibles en un solo archivo descargable. "
    "El scraping automatiza lo que de otra forma habría requerido copiar miles de registros a mano."
))
story.append(bold_label("Guarda para la siguiente etapa:",
    "hcdn_votaciones_historico.csv — el historial completo, sin ningún filtro."
))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Por qué no usaron un Excel que ya existía?</i> No existe un dataset oficial consolidado. "
    "La única fuente completa es la API de la HCDN."
))
story.append(hr())

# STG 1
story.append(Paragraph("STG 1 — Filtrado al padrón actual", h2))
story.append(bold_label("Qué hace:",
    "compara el historial completo contra la lista de los 257 diputados que integran la cámara hoy "
    "y descarta todos los registros de personas que ya no tienen mandato. Para poder hacer esa "
    "comparación, normaliza los nombres (minúsculas, sin tildes, sin espacios extra), porque el "
    "mismo diputado puede aparecer escrito de formas distintas en distintas fuentes. Con esa "
    "normalización se logró identificar los 257 diputados actuales sin correcciones manuales."
))
story.append(bold_label("Por qué fue necesario:",
    "el historial abarca varios períodos. Un modelo que predice a los diputados actuales no debería "
    "entrenarse con los votos de quienes ya no están."
))
story.append(bold_label("Guarda para la siguiente etapa:",
    "votaciones_filtrado.csv — solo los votos de los 257 diputados activos."
))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Los votos de ex diputados se pierden?</i> No, siguen en el archivo crudo. "
    "Solo se excluyen del entrenamiento porque no los vamos a predecir."
))
story.append(hr())

# STG 2
story.append(Paragraph("STG 2 — Transformación y consolidación", h2))
story.append(bold_label("Qué hace:",
    "resuelve dos problemas del historial crudo."
))
story.append(Paragraph(
    "El primero: cuando una ley se vota artículo por artículo, el dataset tiene una fila por artículo. "
    "Un diputado puede tener 20 filas para la misma ley. El notebook detecta cuándo hubo un «voto en "
    "general» (postura sobre el proyecto completo) y le da prioridad. Si solo hay votos por artículo, "
    "toma el más frecuente. En caso de empate, asigna ABSTENCIÓN. El resultado es una sola postura "
    "por diputado por ley.",
    body
))
story.append(Paragraph(
    "El segundo: el mismo proyecto aparece bajo títulos distintos («Ley de Educación — Art. 1», "
    "«Ley de Educación — Dictamen de Mayoría», etc.). El notebook extrae el «título base» de cada "
    "proyecto, eliminando esos sufijos, para que todas las variantes del mismo proyecto queden "
    "unificadas bajo un solo nombre.",
    body
))
story.append(bold_label("Por qué fue necesario:",
    "sin consolidación, el modelo vería decenas de filas repetidas por ley y diputado. Sin unificación "
    "de títulos, trataría cada variante como una ley distinta."
))
story.append(bold_label("Guarda para la siguiente etapa:",
    "df_consolidado.csv — una fila por diputado por proyecto, con bloque, provincia, voto y fecha."
))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Por qué no se promedia el voto?</i> El voto es una categoría (AFIRMATIVO, NEGATIVO, "
    "ABSTENCIÓN), no un número. No se puede promediar; se toma el valor más frecuente."
))
story.append(hr())

# STG 3
story.append(Paragraph("STG 3 — Filtro de títulos sin valor temático", h2))
story.append(bold_label("Qué hace:",
    "identifica y elimina las votaciones que no corresponden a proyectos de ley con contenido. "
    "En la cámara también se votan mociones de orden, habilitaciones de sesión, solicitudes de "
    "licencia y otros trámites internos. Para cada título del dataset, el notebook evalúa si "
    "describe el contenido de una ley o si es un trámite procedimental. Los que no describen "
    "ninguna ley se eliminan. El proceso se verifica con 36 casos de prueba automáticos para "
    "asegurar que el filtro no borre leyes reales."
))
story.append(bold_label("Por qué fue necesario:",
    "entrenar el modelo con registros procedimentales sería como enseñarle a predecir votos "
    "mirando cómo se organiza la sesión, no qué se discute."
))
story.append(bold_label("Guarda para la siguiente etapa:",
    "df_modelado.csv — 28.700 filas y 1.022 títulos únicos de leyes con contenido real. "
    "Este es el archivo base para el modelo."
))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Cómo saben que el filtro no borra leyes reales?</i> Con los 36 casos de prueba: "
    "si alguno falla, el notebook avisa antes de guardar."
))
story.append(hr())

# STG 4
story.append(Paragraph("STG 4 — Features semánticas de los títulos", h2))
story.append(bold_label("Qué hace:",
    "le da al modelo una forma de entender de qué trata cada ley. Toma los 1.022 títulos únicos "
    "y los convierte en representaciones numéricas usando un modelo de lenguaje entrenado en español. "
    "Esas representaciones capturan el significado del texto: dos títulos que hablan del mismo tema "
    "quedan «cerca» aunque usen palabras distintas («régimen jubilatorio» y «sistema previsional» "
    "son distintos en texto pero similares en significado). Con esas representaciones, agrupa los "
    "1.022 títulos en 20 categorías temáticas (salud, educación, infraestructura, legislación "
    "laboral, etc.)."
))
story.append(bold_label("Por qué fue necesario:",
    "sin información temática, el modelo no podría detectar que un diputado vota sistemáticamente "
    "en contra de ciertos temas y a favor de otros. El tema de la ley es una de las variables más "
    "importantes para predecir el voto."
))
story.append(bold_label("Guarda para la siguiente etapa:",
    "df_features_titulo.csv — cada título con su categoría temática asignada. Este archivo se "
    "combinará con los datos del diputado para armar el dataset de entrenamiento."
))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Por qué 20 grupos?</i> Se probaron 10, 15 y 20. Con 10 los grupos mezclaban temas muy "
    "distintos; con 20 cada grupo era coherente y describible."
))
story.append(hr())

# App
story.append(Paragraph("App Streamlit — lo que puede hacer hoy", h2))
story.append(bold_label("Qué hace:",
    "permite consultar el historial de votaciones de cualquier diputado activo. El usuario elige "
    "un nombre en un selector, presiona «Consultar» y ve: el bloque al que pertenece, la provincia "
    "que representa, el conteo total de votos por tipo (AFIRMATIVO, NEGATIVO, ABSTENCIÓN) y las "
    "últimas 10 votaciones con título, fecha y resultado. La funcionalidad de predicción aparecerá "
    "cuando el modelo esté entrenado."
))
story.append(bold_label("Lee:", "df_consolidado.csv."))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Por qué no tiene predicción todavía?</i> La predicción requiere el modelo, que es la "
    "etapa que sigue. Se construyó la app primero para tener algo funcional para mostrar."
))
story.append(hr())

# Deploy
story.append(Paragraph("Deploy en Streamlit Cloud", h2))
story.append(bold_label("Qué es:",
    "Streamlit Community Cloud es un servicio gratuito que publica la app en internet a partir "
    "del repositorio de GitHub. Cada vez que se sube un cambio al repositorio, la app se actualiza "
    "automáticamente."
))
story.append(bold_label("Cómo se hizo:",
    "se conectó el repositorio de GitHub con una cuenta de Streamlit Cloud y se indicó cuál archivo "
    "es la app (app/app.py). Streamlit Cloud lee el requirements.txt (la lista de librerías que "
    "necesita la app), las instala y pone la app en línea."
))
story.append(bold_label("Problema que tuvimos:",
    "las versiones fijas de las librerías no eran compatibles con la versión de Python de Streamlit "
    "Cloud. Se resolvió sacando los números de versión del requirements.txt para que el servicio "
    "elija las versiones más recientes disponibles."
))
story.append(bold_label("Link:",
    "votos-diputados-gxuaqsn2fp3jdntelqxfgy.streamlit.app"
))
story.append(bold_label("Pregunta frecuente:",
    "<i>¿Hay que pagar?</i> No. Streamlit Community Cloud es gratuito para proyectos públicos "
    "conectados a GitHub."
))
story.append(hr())

story.append(Paragraph("Guía de uso interno — LegisTrack, 2025/2026", pie))

doc.build(story)
print("PDF generado en:", OUTPUT)
