# Spec 012 — Integración de autores completados a mano (títulos 2019 en adelante)

## Objetivo

Incorporar al pipeline de features de autoría (spec 011) los 220 registros que el equipo
completó a mano en `data/titulos_autor_manual.xlsx` — títulos votados desde 2019 que no
tenían autor conocido — y regenerar las cuatro features de autoría (`bloque_autor`,
`es_poder_ejecutivo`, `es_oficialista`, `coincide_bloque_autor`) para que esos títulos
dejen de figurar como "sin dato" en el dataset de entrenamiento.

## Problema que resuelve

Hoy, de los 1022 títulos del dataset de modelado, 710 no tienen autor conocido y sus
features de autoría valen "sin dato" (-1). El equipo investigó a mano 218 de esos títulos
(los más recientes, de 2019 en adelante — justamente el período que más pesa para predecir
la Cámara actual) y les asignó autor y bloque. Esa información existe en un Excel pero el
pipeline no la conoce: si no se integra, el trabajo manual no se aprovecha y el modelo
sigue "ciego" sobre la autoría de esos títulos.

Con esta spec, los títulos sin autor bajan de **710 a 492**, y la cobertura de autoría
sube de 312 a **530 títulos** (más de la mitad del total).

## Qué construir (en lenguaje funcional)

1. **Leer la tabla manual** (`data/titulos_autor_manual.xlsx`, 220 filas) y prepararla:
   - Deduplicar las 2 filas repetidas (mismo `id_votacion` con datos idénticos).
   - Cruzarla contra el dataset de modelado usando **`id_votacion`** como llave — no el
     texto del título. Esto evita por completo el problema de caracteres rotos (encoding)
     que tiene el Excel: el número de votación identifica el título sin ambigüedad.
     Verificado: los 218 ids matchean 1 a 1 con un `titulo_base`, y todos son hoy SIN_DATO.
   - Normalizar los nombres de bloque escritos a mano contra los nombres canónicos que ya
     usa el dataset (ej.: "Ucr", "Union Civica Radical" y "Ucr - Union Civica Radical"
     deben quedar como el mismo bloque que figura en `df_modelado_autor.csv`, si no la
     feature `coincide_bloque_autor` nunca daría positivo para esos votantes).

2. **Integrar los autores al pipeline de la spec 011** (`STG_5.2_features_autor.ipynb`),
   como una fuente nueva de la cascada de resolución, con estas reglas:
   - **Autores legisladores** (ej. "ROSSI, AGUSTIN"): el bloque asignado a mano es el
     `bloque_autor` del título. Fuente registrada: manual.
   - **Autores "PEN"** (104 filas): el proyecto fue enviado por el Poder Ejecutivo
     Nacional → `es_poder_ejecutivo = 1` y `es_oficialista = 1`, con `bloque_autor` = la
     coalición oficialista vigente a la fecha de la votación (misma semántica que la regla
     del Ejecutivo de la spec 011). El bloque cargado a mano sirve como verificación
     cruzada contra `tabla_periodos_presidenciales.csv`; si difieren, se reporta la
     discrepancia y manda la tabla de períodos (que el equipo ya validó fila por fila).
   - Las otras dos features (`es_oficialista` para legisladores, `coincide_bloque_autor`)
     se derivan con la misma lógica ya existente de la spec 011, incluyendo las variantes
     de escenario B (duda PRO/LLA).

3. **Regenerar las salidas** del pipeline: `df_modelado_autor.csv` (con las features
   actualizadas), `tabla_autor_bloque.csv` y `autores_pendientes.csv`. Los chequeos
   automáticos permanentes de la spec 011 (consistencia PE⇒oficialista, anti-leakage,
   sin vacíos silenciosos, etc.) deben seguir pasando sobre el resultado nuevo.

## Datos involucrados

- **Entrada nueva**: `data/titulos_autor_manual.xlsx` — columnas `titulo_votacion`,
  `fecha_votacion`, `id_votacion`, `autor_final`, `bloque_autor` (la columna
  `fuente_autor` viene vacía y no se usa). Sin celdas vacías (verificado).
- **Se cruza con**: `df_modelado_autor.csv` / `df_modelado.csv` vía `id_votacion`.
- **Se reutiliza**: `tabla_periodos_presidenciales.csv` (coalición vigente para los PEN),
  `tabla_autor_bloque_manual.csv` y el resto de la cascada de la spec 011.
- **Salidas regeneradas**: `df_modelado_autor.csv`, `tabla_autor_bloque.csv`,
  `autores_pendientes.csv`.

## Criterios de aceptación

- [x] Los 218 títulos de la tabla manual quedan con `bloque_autor` distinto de SIN_DATO
      en `df_modelado_autor.csv` (los sin-autor bajan de 710 a 492).
      **Verificado**: sin_dato 492 / con autor 530 (confirmado directo sobre el CSV en
      disco, T9).
- [x] Las votaciones con autor "PEN" quedan con `es_poder_ejecutivo = 1`,
      `es_oficialista = 1` y `bloque_autor` = coalición oficialista vigente a la fecha.
      **Verificado**: 103 títulos PEN (uno de los 104 originales se dedupe con otro en
      T3), todos con `es_poder_ejecutivo=1`/`es_oficialista=1`. `bloque_autor` inspeccionado
      título por título ordenado por fecha (T10): FRENTE DE TODOS para todo 2020-2023,
      LA LIBERTAD AVANZA desde 2024 en adelante — el corte coincide exactamente con el
      cambio de gobierno, no es un valor fijo.
- [x] Ningún `bloque_autor` nuevo introduce un nombre de bloque que no exista ya en el
      dataset (normalización verificada contra los bloques canónicos), salvo bloques
      reales que genuinamente no tengan votantes en la Cámara actual, documentados.
      **Verificado** (T4): de 17 bloques distintos (autores no-PEN), 13 matchean
      verbatim contra votantes actuales; 4 (Identidad Bonaerense, Republicanos Unidos,
      Socialista, Frente De La Concordia Misionero) son bloques reales confirmados
      contra el histórico completo, sin votantes actuales — documentado, no es error.
      Assert permanente agregado.
- [x] Los 312 títulos que ya tenían autor por la spec 011 conservan exactamente el mismo
      resultado que antes (la fuente nueva solo suma, no pisa lo existente).
      **Verificado** (T8): las 7.191 filas de los 312 títulos originales son idénticas
      byte a byte en todas las columnas, comparado contra la copia de referencia
      guardada antes de tocar el notebook (T1).
- [x] Los 5 chequeos automáticos permanentes de la spec 011 siguen pasando tras la
      re-ejecución completa de `STG_5.2_features_autor.ipynb`.
      **Verificado** (T8): (a) PE⇒oficialista, (b) legisladores oficialistas existen,
      (c) anti-leakage histórico, (d) sin vacíos silenciosos (adaptado a total dinámico
      530, ya no hardcodeado en 312), (e) ejemplos de coincide_bloque_autor — los 5 OK.
- [x] El proceso es re-ejecutable: si el equipo agrega más filas al Excel en el futuro,
      re-correr la notebook las incorpora sin cambios de código.
      **Verificado por diseño**: T2 (formato), T3 (dedupe + match por id + no-pisado) y
      T4 (bloque verificado o marcado NO_VERIFICADO) son asserts permanentes que corren
      en cada ejecución, no casos particulares hardcodeados — protegen filas futuras
      igual que las de hoy. Reproducibilidad confirmada además con dos corridas
      idénticas byte a byte (T10).
- [x] Cumple la CONSTITUCIÓN: sin leakage (el bloque asignado es el del autor al momento
      de la votación, información disponible antes del voto), reproducible (mismo input →
      mismo output byte a byte), y sin sobrescribir datos crudos (el Excel manual no se
      modifica desde código).
      **Verificado**: bloque_autor de PEN usa la coalición vigente a la fecha del voto
      (no el futuro); dos corridas dieron salidas idénticas (T10); `titulos_autor_manual.xlsx`
      se lee con `pd.read_excel` (solo lectura) en todo el proceso.

## Fuera de alcance

- **Reentrenar el modelo** con las features actualizadas y comparar escenarios A/B
  (PRO dentro/fuera de LLA): pasa a la spec siguiente (013), que era la 012 planificada
  antes de que apareciera esta tabla. Conviene reentrenar una sola vez, con la autoría lo
  más completa posible.
- Completar los 492 títulos que siguen sin autor (mayormente anteriores a 2019).
- Corregir los errores del matching fuzzy de la spec 006 (deuda ya registrada).
- Cambios en la API o en la app Streamlit.

## Riesgos conocidos

- **Nombres de bloque a mano**: la normalización contra los bloques canónicos es el punto
  más delicado. Un bloque mal mapeado hace que `coincide_bloque_autor` mienta en silencio
  para todos los votantes de ese bloque. Mitigación: reporte explícito del mapeo
  variante → canónico para revisión del equipo antes de dar por cerrada la spec.
- **Posible desacuerdo PEN vs. tabla de períodos**: si el bloque cargado a mano para un
  PEN no coincide con la coalición vigente según `tabla_periodos_presidenciales.csv`
  (ej. "Union Por La Patria" cargado donde la tabla dice "Frente de Todos"), hay que
  decidir caso por caso — la spec propone que mande la tabla de períodos, pero cada
  discrepancia se lista para que el equipo la vea.
- **Encoding roto del Excel**: mitigado de raíz cruzando por `id_votacion`; el texto del
  título del Excel no se usa como llave en ningún paso.
- **Sin leakage nuevo**: el bloque del autor a la fecha de la votación es un hecho
  histórico conocido antes del voto — no usa información futura. La regla PEN usa la
  coalición vigente a la fecha de la votación, igual que la spec 011.
