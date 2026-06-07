# CLAUDE.md — LegisTrack

Este archivo guía a Claude Code cuando trabaja en este proyecto.
**Leelo completo antes de empezar cualquier tarea.**

---

## Qué es este proyecto

**LegisTrack** — sistema de predicción de votaciones de la Cámara de Diputados de Argentina.
Dado el título de un proyecto de ley y un diputado, predice cómo va a votar (AFIRMATIVO /
NEGATIVO / ABSTENCIÓN) usando NLP y Machine Learning sobre el historial de votaciones.

**Quién lo construye**: estudiantes de Ciencia Política. No son desarrolladores. Explicá
siempre en lenguaje claro, sin jerga innecesaria, y cuando uses un término técnico aclaralo
en una línea.

**Stack** (no agregar nada sin justificar):
- **Lenguaje**: Python 3
- **Datos**: Pandas, NumPy
- **NLP**: scikit-learn (TF-IDF)
- **Modelado**: scikit-learn, XGBoost, LightGBM
- **App web**: Streamlit (deploy en Streamlit Cloud, conectado a GitHub)
- **Control de versiones**: Git + GitHub

**Framework de trabajo**: versión simplificada del Framework IA de Taligent, adaptada a
ciencia de datos. No usa herramientas externas (ni Engram ni spec-kit CLI): todo vive como
archivos `.md` dentro del repo.

---

## Estado actual del proyecto

- ✅ STG 1 (scraping) y STG 2 (limpieza/transformación) terminados en Pandas
- ✅ Consolidación de votos por diputado-proyecto (votación en general vs. por artículo)
- ✅ Filtrado a la nómina ACTUAL de diputados (match por nombre normalizado)
- 🔜 **Próximo**: ingeniería de features + modelado
- 🔜 Después: app Streamlit

El DataFrame de trabajo es `df_consolidado` con columnas:
`diputado`, `titulo_base`, `bloque`, `provincia`, `voto`, `fecha_votacion`.

---

## Ciclo de trabajo: Especificar → Planificar → Implementar → Revisar

**Regla de oro: sin especificación aprobada, no se escribe código.**

```
1. ESPECIFICAR   /especificar   → specs/NNN-nombre/spec.md   (QUÉ se quiere y por qué)
2. PLANIFICAR    /planificar    → specs/NNN-nombre/plan.md   (CÓMO, con qué librerías, qué riesgos)
3. TAREAS        /tareas        → specs/NNN-nombre/tasks.md  (lista ordenada de pasos)
4. IMPLEMENTAR   /implementar   → código, paso por paso
5. REVISAR       /revisar       → chequeo de calidad y consistencia
```

En cada paso, **mostrale el archivo generado al usuario y esperá su aprobación** antes de
avanzar al siguiente. No encadenes los cinco pasos solos.

Los comandos `/especificar`, `/planificar`, etc. están definidos en `.claude/commands/`.
Si el usuario describe lo que quiere sin usar el comando, igual seguí este ciclo.

---

## La Constitución manda

Antes de aprobar cualquier `plan.md`, verificá que cumpla **todos** los principios de
`CONSTITUCION.md`. Si un plan viola un principio (ej: propone split aleatorio en vez de
validación temporal), **frená y avisá** en vez de seguir. Esto se llama *Constitution Check*.

---

## Memoria del proyecto: `memoria/DECISIONES.md`

Este proyecto no tiene memoria automática entre sesiones. La memoria es un archivo:
`memoria/DECISIONES.md`.

**Al empezar cada sesión**: leé `memoria/DECISIONES.md` para recuperar el contexto de lo
que ya se decidió y los bugs ya resueltos.

**Durante el trabajo**, agregá una entrada (con el comando `/recordar` o directamente)
cuando:
- Se toma una decisión técnica o metodológica (ej: "usamos F1-macro porque hay desbalance")
- Se corrige un bug (anotá la **causa raíz**, no solo el síntoma)
- Se establece una convención (ej: "los notebooks se numeran STG_N")
- El usuario acepta o rechaza una propuesta

**Al cerrar la sesión**: agregá al final un breve resumen (objetivo, qué se logró, qué
quedó pendiente, archivos tocados) para que la próxima sesión arranque con contexto.

---

## Reglas de oro de ciencia de datos (críticas para este proyecto)

Estas reglas evitan los errores más graves y difíciles de detectar en ML. Respetalas siempre.

1. **Validación temporal, nunca aleatoria.** Los datos tienen fecha. El modelo se entrena
   con el pasado y se evalúa con el futuro. Partir los datos al azar (`train_test_split`
   sin orden temporal) hace trampa: el modelo "ve el futuro" y las métricas mienten.

2. **Cero data leakage (fuga de información).** Una feature solo puede usar información
   disponible **antes** de la votación que se quiere predecir. Ejemplo crítico:
   `historial_afinidad` debe calcularse solo con votos anteriores a la fecha de cada voto,
   nunca con todo el dataset.

3. **Métrica honesta: F1-macro.** Las clases están desbalanceadas (mayoría AFIRMATIVO).
   `accuracy` engaña (un modelo que dice siempre "AFIRMATIVO" tendría accuracy alto y sería
   inútil). Usar **F1-macro**, que pesa las tres clases por igual.

4. **Reproducibilidad.** Fijar siempre `random_state` (semilla). Congelar dependencias en
   `requirements.txt`. Que cualquiera pueda correr el proyecto y obtener lo mismo.

5. **Datos crudos intocables.** Nunca sobrescribir el dataset original. Cada etapa lee una
   entrada y escribe una salida nueva (`STG_1_...` → `STG_2_...` → ...).

6. **Explicar antes de codear.** Para features y modelos, explicá en una o dos oraciones la
   lógica antes de mostrar el código. El equipo tiene que poder defender cada decisión.

---

## Convenciones del proyecto

- **Notebooks**: numerados por etapa — `STG_1_...`, `STG_2_...`, etc.
- **Idioma**: código y comentarios en español; nombres de columnas como ya están en `df_consolidado`.
- **Commits** (conventional commits): `feat:` (feature nueva), `fix:` (corrección),
  `docs:` (documentación), `chore:` (mantenimiento). Mensajes en español.
- **Archivos de datos**: no se commitean los `.csv`/`.sav` grandes (van en `.gitignore`).
- **Secretos**: nunca commitear claves. Si hace falta, usar `.env` + `.env.example`.

---

## Estructura del repositorio

```
legistrack/
├── CLAUDE.md                  ← este archivo (Claude lo lee al iniciar)
├── CONSTITUCION.md            ← principios no negociables del proyecto
├── GUIA_USO_CLAUDE_CODE.md    ← cómo usar el framework (para el equipo)
├── memoria/
│   └── DECISIONES.md          ← bitácora de decisiones y bugs (la "memoria")
├── specs/                     ← una carpeta por feature (spec + plan + tasks)
│   └── NNN-nombre-feature/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
├── .claude/
│   └── commands/              ← comandos del ciclo de trabajo
├── notebooks/                 ← STG_1, STG_2, ... y el modelado
├── data/                      ← datasets (no se commitean los pesados)
├── app/                       ← la app Streamlit
└── requirements.txt           ← dependencias congeladas
```

---

## Qué hacer al iniciar una sesión

1. Leer este `CLAUDE.md`.
2. Leer `CONSTITUCION.md`.
3. Leer `memoria/DECISIONES.md` para recuperar contexto.
4. Preguntar al usuario en qué feature quiere trabajar y arrancar el ciclo.
