# Plan 006 — Mover la búsqueda de autor al STG 3 y exportar tabla de autoría

## Enfoque técnico

El trabajo se divide en dos partes independientes:

**Parte A — Ajustar STG 2**: dos cambios:
1. Eliminar las celdas que cargan el catálogo de proyectos y calculan el autor (las que
   contienen la carga de `proyectos_parlamentarios2.1.csv`, el loop de match exacto y fuzzy,
   y los exports a `titulos_autor.xlsx` y `autores_manuales.xlsx`).
2. En la consolidación (`groupby` + `agg`), agregar `id_votacion` a `cols_contexto` con
   la función `'first'`, para que ese id sobreviva la consolidación y llegue a STG 3.
   El `id_votacion` es el número de la votación en la HCDN (ej: `5902`); actualmente se
   pierde porque el `agg` solo lleva `bloque`, `provincia` y `fecha_votacion`.

**Parte B — Ampliar STG 3**: al final del notebook existente (después del filtrado de
títulos y la exportación de `df_modelado.csv`), se agregan nuevas celdas que:
1. Cargan el catálogo de proyectos.
2. Extraen los títulos únicos presentes en `df_modelado` (ya filtrado).
3. Aplican la búsqueda de autor en cascada: primero match exacto, luego match por
   similitud (TF-IDF + coseno), igual que está en STG 2 hoy.
4. Pegan las columnas de autor (`autor_final`, `camara_origen`, `fuente_autor`,
   `score_fuzzy`) de vuelta en `df_modelado`.
5. Guardan `df_modelado.csv` con las nuevas columnas (reemplaza la exportación que ya
   estaba al final de STG 3).
6. Exportan `titulos_autor.xlsx` con una fila por título único y las seis columnas de
   auditoría.

Una diferencia importante respecto a STG 2: en STG 2 la búsqueda se hacía sobre
`df_consolidado` (todos los títulos, incluyendo los que después se filtraban). En STG 3,
la búsqueda se hace **después** del filtrado, sobre `df_modelado`. Esto es correcto: no
tiene sentido buscar el autor de títulos que ya sabemos que son ruido.

## Librerías y herramientas

| Librería | Por qué |
|---|---|
| `pandas` | ya en uso; para carga, merge y export a Excel |
| `scikit-learn` (`TfidfVectorizer`, `cosine_similarity`) | ya en uso en STG 2 para el fuzzy matching |
| `unicodedata` | normalización de texto para el match; ya en STG 2 |
| `openpyxl` | backend de pandas para escribir `.xlsx`; ya en requirements |

No se agrega ninguna librería nueva.

## Diseño anti-leakage / validación

Esta feature **no toca el modelado ni el entrenamiento**, así que los principios de
validación temporal y leakage del modelo no aplican directamente. Sin embargo, hay un
punto relevante:

- El autor es un atributo **estático** del proyecto (quién lo presentó), no depende de
  cómo votaron los diputados ni de cuándo ocurrió la votación. Asignarlo no introduce
  ninguna información futura.
- La búsqueda de autor opera sobre títulos únicos: para cada título se consulta el catálogo
  de proyectos, que es una fuente externa. No se usan otros votos del dataset para inferir
  el autor.

**Conclusión**: no hay riesgo de leakage en esta feature. ✓

## Pasos de implementación

1. **Guardar una copia de referencia**: antes de tocar STG 2, leer el `df_consolidado.csv`
   existente y guardar sus métricas de control: número de filas, distribución de `voto`,
   número de diputados únicos, número de títulos únicos. Estas métricas son el "antes".
2. **En STG 2**, agregar `id_votacion` a `cols_contexto` (la lista que alimenta el `agg`)
   con la función `'first'`.
3. **Validar que el cambio no rompió nada**: correr STG 2 y comparar el nuevo
   `df_consolidado` contra las métricas del "antes". Verificar que:
   - El número de filas es idéntico.
   - La distribución de `voto` (conteo por valor) es idéntica.
   - Los valores de `diputado`, `titulo_base`, `bloque`, `provincia`, `voto`,
     `fecha_votacion` son iguales fila a fila (ordenando ambos datasets de la misma forma).
   - La única diferencia es la columna nueva `id_votacion`.
   Si alguna comparación falla, **no continuar** hasta entender la causa.
4. **Eliminar de STG 2** las celdas de autor (carga de `proyectos_parlamentarios2.1.csv`,
   match exacto, fuzzy, exports a `.xlsx`). Verificar que STG 2 corre limpio de punta a punta.
5. **En STG 3**, agregar inmediatamente después de la celda de aplicación del filtro
   (la que guarda `df_modelado.csv`) una sección nueva con estas celdas:
   - Celda de parámetros: `URL_PROYECTOS`, `THRESHOLD_FUZZY`, `BATCH_SIZE`.
   - Celda de carga del catálogo.
   - Celda de match exacto + fuzzy (copiada y adaptada de STG 2).
   - Celda de merge de columnas de autor en `df_modelado`.
   - Celda de export de `df_modelado.csv` (reemplaza la que ya estaba, ahora incluye
     las columnas de autor).
   - Celda de export de `titulos_autor.xlsx` con columnas:
    `titulo_votacion` (= `titulo_base`), `fecha_votacion`, `id_votacion`
    (= `exp_extraido`, el expediente extraído del título), `autor_final`,
    `fuente_autor`, `score_fuzzy`.
6. Verificar que STG 3 corre de punta a punta sin errores.
7. Verificar que `df_modelado.csv` tiene las cuatro columnas de autor.
8. Verificar que `titulos_autor.xlsx` tiene las seis columnas correctas
   (`titulo_votacion`, `fecha_votacion`, `id_votacion`, `autor_final`, `fuente_autor`,
   `score_fuzzy`) y que las filas sin autor están presentes.

## Reproducibilidad

- TF-IDF es determinista dado el mismo corpus de entrada: no requiere `random_state`.
- Parámetros (`THRESHOLD_FUZZY = 0.70`, `BATCH_SIZE = 200`, `URL_PROYECTOS`) se declaran
  en una celda de parámetros al inicio de la sección, no hardcodeados en la lógica.
- **Entrada**: `data/df_consolidado.csv` (con `id_votacion`, a partir de este cambio) +
  `data/proyectos_parlamentarios2.1.csv`.
- **Salida**: `data/df_modelado.csv` (actualizado con columnas de autor) +
  `data/titulos_autor.xlsx` (nueva).
- Los datos crudos (`df_consolidado.csv`, `proyectos_parlamentarios2.1.csv`) no se
  modifican.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| `proyectos_parlamentarios2.1.csv` no está en `data/` | La carga con `pd.read_csv` lanza `FileNotFoundError` con mensaje claro. Se documenta en el notebook con un comentario de aviso. |
| El filtrado de STG 3 redujo los títulos únicos (de ~todos a 1022), por lo que la cobertura del author match puede cambiar respecto a STG 2 | Es esperado y positivo: se busca autor solo para títulos que van al modelo. Se imprime la cobertura al final de la celda de match para que el equipo la vea. |
| Columnas de autor ya presentes en `df_consolidado.csv` (si STG 2 viejo todavía las tiene) | El merge sobreescribe con un `drop` previo de las columnas si existen. Se evita duplicación. |
| El fuzzy matching tarda varios minutos con 1022 títulos | El procesamiento en lotes (`BATCH_SIZE = 200`) ya estaba en STG 2; se mantiene. Se imprime progreso por lote. |

---

## Constitution Check

| Principio | ¿Cumple? | Detalle |
|---|---|---|
| 1 — Sin spec, no hay código | ✓ | La spec 006 fue aprobada. |
| 2 — Validación temporal obligatoria | ✓ (N/A) | No es una etapa de modelado. No se parte ningún dataset en train/test. |
| 3 — Cero leakage | ✓ | El autor es un atributo estático del proyecto; no depende de votos futuros ni del dataset de votaciones. |
| 4 — Métrica honesta | ✓ (N/A) | No hay evaluación de modelo en esta etapa. |
| 5 — Reproducibilidad | ✓ | TF-IDF es determinista; parámetros parametrizados; datos crudos intactos. |
| 6 — Trazabilidad | ✓ | Se registra en `memoria/DECISIONES.md`; el Excel de auditoría documenta el método de asignación por fila. |
| 7 — Simple antes que sofisticado | ✓ | Se reutiliza el código exacto de STG 2, sin agregar complejidad. |
| 8 — El equipo entiende lo que entrega | ✓ | La lógica es la misma que ya estaba en STG 2; solo cambia de lugar. |

**Resultado: el plan pasa el Constitution Check. No hay violaciones.**
