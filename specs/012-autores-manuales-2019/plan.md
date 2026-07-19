# Plan 012 — Integración de autores completados a mano (títulos 2019 en adelante)

## Enfoque técnico

No se crea un notebook nuevo: se **extiende `STG_5.2_features_autor.ipynb`** (el pipeline
de la spec 011), agregando la tabla manual como una fuente más de autores y como un paso
más de la cascada de resolución de bloque. Toda la lógica ya existente (regla del
Ejecutivo, tabla manual por autor, lookup histórico, derivación de las features binarias
y del escenario B) se reutiliza sin cambios: una vez que un título tiene `autor_final` y
`bloque_autor`, el resto del pipeline lo trata igual que a los 312 que ya venían de antes.

En términos conceptuales:

1. **Cargar y preparar la tabla nueva.** Se lee `titulos_autor_manual.xlsx`, se
   deduplican las 2 filas repetidas (mismo `id_votacion`, mismos datos) y se cruza por
   `id_votacion` contra `df_modelado` para obtener el `titulo_base` de cada registro.
   El texto del título del Excel no se usa como llave en ningún paso — el número de
   votación identifica al título sin ambigüedad, esquivando cualquier problema de
   caracteres mal codificados.

2. **Normalizar los bloques tipeados a mano.** Cada `bloque_autor` del Excel se mapea al
   nombre canónico que usa el dataset. Primera pasada automática: comparación normalizada
   (mayúsculas, sin tildes, espacios colapsados — la misma función `normalizar_nombre`
   del proyecto). Lo que no resuelva la pasada automática (ej. "Ucr" vs "Unión Cívica
   Radical", que son strings distintos incluso normalizados) se resuelve con un
   **diccionario de mapeo explícito** escrito en una celda visible del notebook, para que
   el equipo pueda auditarlo. El notebook imprime la tabla completa variante → canónico.
   Chequeo de sanidad clave: para cada título de legislador, el bloque asignado
   (normalizado) debe existir entre los bloques de los votantes de esa misma época en
   `df_modelado`; si no existe, se lista para revisión (puede ser un bloque real sin
   votantes en ese período — se documenta — o un error de mapeo — se corrige).

3. **Sumar los autores nuevos a la lista de autores por título** (celda T4 del notebook).
   Los 218 títulos entran con `fuente_autor = 'manual_2019'`. Un assert verifica que
   ninguno pise un título que ya tenía autor (hoy los 218 son SIN_DATO; el assert protege
   las corridas futuras).

4. **Resolver el bloque de los títulos nuevos** con dos reglas, antes del lookup
   histórico:
   - **Autores "PEN"** (104 registros): `es_poder_ejecutivo = 1`, `es_oficialista = 1`,
     y `bloque_autor` = coalición oficialista vigente a la fecha de la votación según
     `tabla_periodos_presidenciales.csv` (fuente: `ejecutivo`). Es la misma semántica de
     la regla del Ejecutivo de la spec 011 — acá ni siquiera hay que adivinar el firmante:
     el equipo ya confirmó que el proyecto lo mandó el Ejecutivo. El bloque cargado a
     mano en el Excel se usa como **verificación cruzada**: el notebook compara ambos y
     lista toda discrepancia; ante conflicto manda la tabla de períodos (validada fila
     por fila por el equipo en la spec 011).
   - **Autores legisladores** (los demás): el bloque asignado a mano (ya normalizado) es
     el `bloque_autor` del título, con fuente `manual_titulo`. Como la asignación es por
     título (no por autor), no interfiere con la tabla manual por-autor existente
     (`tabla_autor_bloque_manual.csv`); si un mismo autor aparece en ambas fuentes con
     bloques distintos, el notebook lo reporta para revisión pero cada título conserva
     su asignación específica.
   Ninguno de los 218 títulos llega al paso histórico ni a pendiente: la tabla manual
   los cubre a todos.

5. **Dejar que el resto del pipeline corra igual.** `es_oficialista` para legisladores
   (¿el bloque integra la coalición gobernante a la fecha?), el escenario B (PRO/LLA) y
   `coincide_bloque_autor` por fila se derivan con el código ya existente de T8 — no se
   toca. Los chequeos automáticos de T9 corren sobre el resultado completo.

6. **Chequeo de no-regresión de los 312.** Antes de sobrescribir las salidas, se compara
   el resultado nuevo contra el `df_modelado_autor.csv` actual: las filas de los 312
   títulos que ya tenían autor deben quedar **idénticas** (la fuente nueva solo suma).

7. **Regenerar las salidas**: `df_modelado_autor.csv`, `tabla_autor_bloque.csv` y
   `autores_pendientes.csv`, con los mismos nombres y rutas de siempre.

## Librerías y herramientas

Ninguna nueva. `pandas` (lectura del Excel vía `openpyxl`, ya instalada — el notebook ya
lee `titulos_autor.xlsx` con ella), `unicodedata` (normalización, ya en uso). Sin azar,
sin modelos: no hace falta `random_state`.

## Diseño anti-leakage / validación

- **Las features nuevas no usan información futura.** El bloque asignado a mano es el
  bloque del autor al momento de la votación — un hecho histórico conocido **antes** del
  voto que se quiere predecir. La regla PEN usa la coalición gobernante a la fecha de la
  votación, también conocida de antemano. No se calcula nada "mirando el futuro".
- **El paso histórico de la cascada no se modifica**, y su assert anti-leakage explícito
  (`fecha_registro_historico <= fecha_votacion`, agregado en T9c de la spec 011) sigue
  corriendo en cada ejecución.
- **Validación temporal**: no aplica en esta spec — acá no se entrena ni evalúa ningún
  modelo. El reentrenamiento con validación temporal es la spec 013.

## Pasos de implementación

1. Agregar la carga de `titulos_autor_manual.xlsx` a la celda de insumos (T4), con
   validación de formato (columnas esperadas, sin nulos en `autor_final`/`bloque_autor`/
   `id_votacion`).
2. Deduplicar por `id_votacion` y cruzar contra `df_modelado` para obtener
   `titulo_base` + `fecha_votacion`; assert: todos los ids matchean y cada uno mapea a
   exactamente un título.
3. Construir la normalización de bloques: pasada automática + diccionario explícito para
   las variantes que no resuelvan solas; imprimir la tabla variante → canónico y el
   chequeo "el bloque existe entre los votantes de esa época".
4. Sumar los títulos nuevos a `autores_titulo` con `fuente_autor = 'manual_2019'`;
   assert de que no pisan títulos con autor previo.
5. Agregar el paso de cascada para los títulos nuevos: regla PEN (con verificación
   cruzada contra la tabla de períodos e informe de discrepancias) y bloque manual por
   título para legisladores.
6. Re-ejecutar el notebook completo de punta a punta; verificar que T8 y T9 corren sin
   cambios de código y que los 5 chequeos automáticos pasan.
7. Chequeo de no-regresión: comparar las filas de los 312 títulos previos contra el
   `df_modelado_autor.csv` vigente — deben ser idénticas.
8. Regenerar las tres salidas y validar los criterios de aceptación de la spec (conteos:
   sin-autor 710 → 492, cobertura 312 → 530).
9. Registrar el cierre en `memoria/DECISIONES.md`.

## Reproducibilidad

- **Entradas**: `data/titulos_autor_manual.xlsx` (nueva, solo lectura — nunca se modifica
  desde código), más las cinco de la spec 011 (`df_modelado.csv`,
  `hcdn_votaciones_historico.csv`, `titulos_autor.xlsx`,
  `tabla_periodos_presidenciales.csv`, `tabla_autor_bloque_manual.csv`).
- **Salidas**: `df_modelado_autor.csv`, `tabla_autor_bloque.csv`,
  `autores_pendientes.csv` (mismos nombres; los crudos no se tocan).
- **Determinismo**: no hay ninguna fuente de azar; dos corridas con los mismos insumos
  producen salidas idénticas byte a byte (se re-verifica como en T11 de la spec 011).
- **Re-ejecutabilidad**: si el equipo agrega filas al Excel, re-correr el notebook las
  incorpora sin cambios de código (los asserts de formato y de no-pisado protegen esas
  corridas futuras).

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Bloque tipeado a mano mal mapeado → `coincide_bloque_autor` miente en silencio | Diccionario de mapeo explícito y auditable + chequeo "el bloque existe entre los votantes de esa época" + tabla variante → canónico impresa para revisión del equipo |
| Bloque PEN cargado a mano ≠ coalición de la tabla de períodos | Verificación cruzada automática; manda la tabla de períodos (ya validada); cada discrepancia se lista |
| Encoding roto del Excel contamina el cruce | El cruce es por `id_votacion` (numérico); el texto del Excel no se usa como llave en ningún paso |
| La fuente nueva pisa resultados de la spec 011 | Assert de no-pisado en T4 + chequeo de no-regresión de los 312 títulos antes de exportar |
| Un mismo autor con bloque distinto en la tabla por-título vs. la tabla por-autor | Se reporta la inconsistencia para revisión; cada título conserva su asignación específica (la por-título es más precisa en fecha) |
| Corridas futuras con más filas en el Excel rompen supuestos de hoy | Asserts de formato, de match de ids y de unicidad corren en cada ejecución |

---

## Constitution Check

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| 1 — Sin spec no hay código | ✅ | `spec.md` aprobada por el usuario antes de este plan |
| 2 — Validación temporal | ✅ (N/A) | No se entrena ni evalúa ningún modelo en esta spec; el reentrenamiento (spec 013) usará la validación temporal ya establecida |
| 3 — Cero leakage | ✅ | El bloque del autor a la fecha del voto es información previa al voto; regla PEN usa la coalición vigente a esa fecha; el assert anti-leakage del paso histórico sigue corriendo |
| 4 — Métrica honesta | ✅ (N/A) | No se reportan métricas en esta spec |
| 5 — Reproducibilidad | ✅ | Sin azar; crudos intocables (el Excel es solo lectura); mismas salidas con nombre propio; verificación byte a byte |
| 6 — Trazabilidad | ✅ | Spec registrada en `memoria/DECISIONES.md`; el plan y el cierre también se registran |
| 7 — Simple antes que sofisticado | ✅ | Cero librerías nuevas; se extiende el notebook existente en vez de crear infraestructura nueva |
| 8 — El equipo entiende lo que entrega | ✅ | El mapeo de bloques y las discrepancias PEN se imprimen para auditoría humana; cada regla está explicada en lenguaje claro en el notebook |
