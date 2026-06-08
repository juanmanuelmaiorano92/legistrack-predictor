import pandas as pd, re

df = pd.read_excel('titulos_consolidado.xlsx')
titulos = sorted(df['titulo_base'].dropna().unique())
print(f'Total titulos unicos: {len(titulos)}')

# Regla: filtrar si el título es SOLO una referencia procedimental/administrativa
# sin texto descriptivo del tema de la ley.

# Patrones que indican "sin valor semántico":
patrones_sin_valor = [
    # Expediente solo (sin descripción después)
    r'^EXPTE?\.\s+[\dA-Z\-\/\.\s]+$',
    r'^EXPTES?\.\s+[\dA-Z\-\/\.\s]+$',
    r'^EXP\.\s+PE-\d+-\d+\s*$',
    r'^EXP\.\s+\d+-[A-Z]+-?\d+\s*$',
    # Expediente con sufijo puramente procedimental (no temático)
    r'^Exp\.\s+[\dA-Z\-\s\/]+\s*$',                      # solo número
    r'^Exp\.\s+\d+[^\-]*-\w+-\d+\s*$',                   # número de expte solo
    # Habilitaciones de tratamiento (procedimentales)
    r'^HABILITACI[OÓ]N DEL TRATAMIENTO',
    r'^HABILITACION DEL TRATAMIENTO',
    r'^HABILITACI[OÓ]N DE TRATAMIENTO[\s\-]*EXP',
    r'^HABILITACI[OÓ]N DE TRATAMIENTO - EXP',
    r'^HABILITACI[OÓ]N PROYECTOS DE RESOLUCI[OÓ]N',
    # Insistencias sin descripción
    r'^INSISTENCIA PROYECTO DE LEY\s+[\d\.]+\s*$',
    # Mociones (procedimentales)
    r'^MOCI[OÓ]N DE EMPLAZAMIENTO',
    r'^MOCION DE EMPLAZAMIENTO',
    r'^MOCION DE RECONSIDERACI[OÓ]N',
    r'^MOCI[OÓ]N DE RECONSIDERACI[OÓ]N',
    r'^MOCION SOLICITADA',
    r'^Moci[oó]n de reconsideraci[oó]n',
    # Apartamientos del reglamento
    r'^APARTAMIENTO DEL REGLAMENTO',
    # Plan de labor
    r'^PLAN DE LABOR$',
    # Votación en general sin descripción propia
    r'^VOTACI[OÓ]N EN GRAL\.',
    # Lista de ODs sin descripción (múltiples números)
    r'^OD\s+\d+\s*[-–]\s*\d+',      # "OD 86 - 89 - ..."
    r'^od\s+\d+\s*[-–]\s*od\s+\d+', # "od 386 - od 385 - ..."
    # Habilitaciones con solo nombre de expediente (sin descripción)
    r'^HABILITACI[OÓ]N DE TRATAMIENTO EXPEDIENTES\s+\w+$',
    # Expedientes históricos solo con número de orden del día, sin descripción temática
    r'^Exp\.\s+\d+-[A-Z]+-\d+\s*$',
    r'^Exp\.\s+\d+-\w+-\d+\s*$',
    # Pliegos de la Corte Suprema (no temáticos para predicción)
    r'^Exp\. 7835-D-00',
]

def tiene_descripcion_tematica(titulo):
    """True si el título tiene palabras descriptivas más allá del número de expediente."""
    # Si es solo un número de expediente (ej: "Exp. 1234-D-05")
    limpio = re.sub(r'^(Exp(te)?s?\.?\s+|EXP(TE)?S?\.?\s+)', '', titulo.strip(), flags=re.IGNORECASE)
    limpio = re.sub(r'^\d+[-\s][A-Z]+-?\d+\s*', '', limpio.strip())
    limpio = re.sub(r'^[\d\-\/\s]+', '', limpio.strip())
    return len(limpio.strip()) > 5

def es_sin_valor(titulo):
    t = titulo.strip()
    for p in patrones_sin_valor:
        if re.search(p, t, re.IGNORECASE):
            return True
    # Casos especiales: Exp. con número solo (sin descripción)
    if re.match(r'^Exp\.?\s+', t, re.IGNORECASE):
        if not tiene_descripcion_tematica(t):
            return True
    return False

a_filtrar = [t for t in titulos if es_sin_valor(t)]
a_conservar = [t for t in titulos if not es_sin_valor(t)]

print(f'\nSe filtrarían: {len(a_filtrar)}')
print(f'Se conservarían: {len(a_conservar)}')
print()
print('--- TÍTULOS QUE SE FILTRARÍAN ---')
for t in a_filtrar:
    print(t)
