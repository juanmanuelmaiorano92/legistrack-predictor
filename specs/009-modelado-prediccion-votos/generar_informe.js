"use strict";
// Asegura que Node encuentre el paquete docx instalado globalmente en Windows
const os = require("os");
const path2 = require("path");
const globalModules = path2.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules");
if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(globalModules)) {
  process.env.NODE_PATH = (process.env.NODE_PATH ? process.env.NODE_PATH + ";" : "") + globalModules;
  require("module").Module._initPaths();
}
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, LevelFormat, PageBreak,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
const SPEC_DIR = path.resolve(__dirname);
const OUT_FILE = path.join(SPEC_DIR, "informe_legistrack.docx");

function imgPath(name) { return path.join(SPEC_DIR, name); }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BORDER_GRAY  = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS_ALL  = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };
const COL_HDR_FILL = "2E74B5";
const COL_ALT_FILL = "EBF3FB";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 32, color: "2E74B5", font: "Arial" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: "1F497D", font: "Arial" })],
  });
}

function body(text, { bold = false, italic = false, size = 22, after = 120 } = {}) {
  return new Paragraph({
    spacing: { after },
    children: [new TextRun({ text, bold, italic, size, font: "Arial" })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });
}

function img(filename, widthPx, heightPx, caption = "") {
  const filePath = imgPath(filename);
  if (!fs.existsSync(filePath)) {
    return body(`[Imagen no encontrada: ${filename}]`, { italic: true });
  }
  const data = fs.readFileSync(filePath);
  // Scale to fit page width (max 540 pts => 6480 EMU * ... use px at 96dpi -> EMU)
  const maxW = 540; // points
  const scale = widthPx > maxW ? maxW / widthPx : 1;
  const wPt = Math.round(widthPx  * scale);
  const hPt = Math.round(heightPx * scale);
  const result = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80 },
      children: [new ImageRun({
        type: "png",
        data,
        transformation: { width: wPt, height: hPt },
        altText: { title: caption, description: caption, name: caption },
      })],
    }),
  ];
  if (caption) {
    result.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: caption, italic: true, size: 18, color: "666666", font: "Arial" })],
    }));
  }
  return result;
}

function hdrCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS_ALL,
    shading: { fill: COL_HDR_FILL, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20, font: "Arial" })],
    })],
  });
}

function dataCell(text, width, shade = false, align = AlignmentType.LEFT) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS_ALL,
    shading: { fill: shade ? COL_ALT_FILL : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), size: 20, font: "Arial" })],
    })],
  });
}

function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function spacer(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun("")] }));
}

// ---------------------------------------------------------------------------
// Datos inline (evitar dependencia de CSV en runtime)
// ---------------------------------------------------------------------------
const modelos = [
  { nombre: "LGBMClassifier",         cv: "0.383", sd: "0.042", hold: "0.453", nota: "GANADOR" },
  { nombre: "BaggingClassifier",       cv: "0.347", sd: "0.042", hold: "0.409", nota: "" },
  { nombre: "XGBClassifier",           cv: "0.374", sd: "0.048", hold: "0.380", nota: "" },
  { nombre: "RandomForestClassifier",  cv: "0.325", sd: "0.055", hold: "0.341", nota: "" },
  { nombre: "LogisticRegression",      cv: "0.363", sd: "0.027", hold: "0.333", nota: "" },
  { nombre: "DummyClassifier",         cv: "0.285", sd: "0.019", hold: "0.299", nota: "Baseline" },
];

const features = [
  { nombre: "bloque_enc",                   grupo: "Politico",   descripcion: "Bloque politico del diputado (codificado)." },
  { nombre: "provincia_enc",                grupo: "Politico",   descripcion: "Provincia que representa el diputado." },
  { nombre: "tasa_afirmativo_hist",         grupo: "Historial",  descripcion: "Proporcion historica de votos AFIRMATIVO del diputado hasta ese momento." },
  { nombre: "tasa_afirmativo_tema_hist",    grupo: "Historial",  descripcion: "Tasa de AFIRMATIVO del diputado en ese tema especifico." },
  { nombre: "tasa_alineacion_bloque_hist",  grupo: "Historial",  descripcion: "Frecuencia con que el diputado voto igual que su bloque." },
  { nombre: "tasa_afirmativo_desde_2023",   grupo: "Reciente",   descripcion: "Tasa de AFIRMATIVO desde el 10-dic-2023 (inicio del gobierno actual)." },
  { nombre: "tasa_afirmativo_2026",         grupo: "Reciente",   descripcion: "Tasa de AFIRMATIVO desde el 1-ene-2026 (comportamiento del ano en curso)." },
  { nombre: "n_votos_hist",                 grupo: "Historial",  descripcion: "Cantidad de votos previos del diputado (mide experiencia/datos disponibles)." },
  { nombre: "tasa_afirmativo_bloque_tema",  grupo: "Bloque",     descripcion: "Tasa de AFIRMATIVO del bloque en ese tema (posicion colectiva)." },
  { nombre: "emb_0 ... emb_383",            grupo: "NLP",        descripcion: "384 dimensiones del embedding semantico del titulo del proyecto de ley (modelo multilingual MiniLM)." },
];

// ---------------------------------------------------------------------------
// Tabla de modelos
// ---------------------------------------------------------------------------
const W_TABLA_MODELOS = 9360;
const cols_m = [3200, 1540, 1540, 1540, 1540];

function tablaModelos() {
  const hdrRow = new TableRow({
    children: [
      hdrCell("Modelo",             cols_m[0]),
      hdrCell("CV F1-macro",        cols_m[1]),
      hdrCell("CV Desvio",          cols_m[2]),
      hdrCell("Holdout F1-macro",   cols_m[3]),
      hdrCell("Nota",               cols_m[4]),
    ],
  });
  const filas = modelos.map((m, i) => new TableRow({
    children: [
      dataCell(m.nombre,  cols_m[0], i % 2 === 1),
      dataCell(m.cv,      cols_m[1], i % 2 === 1, AlignmentType.CENTER),
      dataCell(`±${m.sd}`,cols_m[2], i % 2 === 1, AlignmentType.CENTER),
      dataCell(m.hold,    cols_m[3], i % 2 === 1, AlignmentType.CENTER),
      dataCell(m.nota,    cols_m[4], i % 2 === 1, AlignmentType.CENTER),
    ],
  }));
  return new Table({
    width: { size: W_TABLA_MODELOS, type: WidthType.DXA },
    columnWidths: cols_m,
    rows: [hdrRow, ...filas],
  });
}

// ---------------------------------------------------------------------------
// Tabla de features
// ---------------------------------------------------------------------------
const cols_f = [2500, 1400, 5460];

function tablaFeatures() {
  const hdrRow = new TableRow({
    children: [
      hdrCell("Feature",     cols_f[0]),
      hdrCell("Grupo",       cols_f[1]),
      hdrCell("Descripcion", cols_f[2]),
    ],
  });
  const filas = features.map((f, i) => new TableRow({
    children: [
      dataCell(f.nombre,      cols_f[0], i % 2 === 1),
      dataCell(f.grupo,       cols_f[1], i % 2 === 1, AlignmentType.CENTER),
      dataCell(f.descripcion, cols_f[2], i % 2 === 1),
    ],
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: cols_f,
    rows: [hdrRow, ...filas],
  });
}

// ---------------------------------------------------------------------------
// Tabla de tuning (cargada desde CSV si existe)
// ---------------------------------------------------------------------------
function tablaTuning() {
  const csvPath = path.join(SPEC_DIR, "comparacion_default_vs_afinado.csv");
  if (!fs.existsSync(csvPath)) {
    return [body("(Tabla de tuning no disponible aun — ejecutar STG_7_tuning.ipynb)", { italic: true })];
  }
  const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
  const cols_t = [4680, 2340, 2340];
  const hdrRow = new TableRow({
    children: [
      hdrCell("Modelo",          cols_t[0]),
      hdrCell("CV F1-macro",     cols_t[1]),
      hdrCell("Holdout F1-macro",cols_t[2]),
    ],
  });
  const filas = lines.map((line, i) => {
    const parts = line.split(",");
    return new TableRow({
      children: [
        dataCell(parts[0] || "", cols_t[0], i % 2 === 1),
        dataCell(parts[1] || "", cols_t[1], i % 2 === 1, AlignmentType.CENTER),
        dataCell(parts[2] || "", cols_t[2], i % 2 === 1, AlignmentType.CENTER),
      ],
    });
  });
  return [new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: cols_t, rows: [hdrRow, ...filas] })];
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------
function seccionPortada() {
  return [
    ...spacer(4),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "LegisTrack", bold: true, size: 64, font: "Arial", color: "2E74B5" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "Sistema de prediccion de votaciones legislativas", size: 32, font: "Arial", color: "404040" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "Camara de Diputados de la Nacion Argentina", size: 28, italic: true, font: "Arial", color: "606060" })],
    }),
    ...spacer(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Informe tecnico — modelado predictivo", size: 24, font: "Arial", color: "808080" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [new TextRun({ text: "Junio 2026", size: 24, font: "Arial", color: "808080" })],
    }),
    pageBreak(),
  ];
}

function seccionFeatures() {
  return [
    h1("1. Ingenieria de features"),
    body("El modelo de prediccion se alimenta de 394 variables (features) divididas en tres grupos:"),
    bullet("9 features historicas y politicas: capturan el comportamiento pasado del diputado y de su bloque."),
    bullet("384 embeddings semanticos: representan el contenido del titulo del proyecto de ley en un espacio vectorial de alta dimension."),
    bullet("1 identificador de tema (tema_id): agrupa proyectos de la misma area tematica."),
    ...spacer(1),
    h2("1.1 Tabla de features"),
    tablaFeatures(),
    ...spacer(1),
    h2("1.2 Garantia anti-leakage (sin fuga de informacion)"),
    body(
      "Todas las features historicas se calculan con el patron cumsum().shift(1): cada fila solo ve " +
      "votos anteriores a su propia fecha. El primer voto de cada diputado queda en NaN (verificado por " +
      "assert automatico). Los NaN se rellenan en cascada: tema -> historial global -> 0.5 neutro."
    ),
    pageBreak(),
  ];
}

function seccionModelos() {
  const imgs1 = img("comparacion_modelos.png", 900, 500, "Figura 1. Comparacion de F1-macro en CV y holdout");
  return [
    h1("2. Comparacion de modelos"),
    body(
      "Se entrenaron y evaluaron 6 modelos con validacion temporal (TimeSeriesSplit, 5 particiones). " +
      "La metrica es F1-macro, que penaliza por igual los errores en las tres clases (AFIRMATIVO, " +
      "NEGATIVO, ABSTENCION), evitando la trampa de la accuracy en datasets desbalanceados."
    ),
    ...spacer(1),
    h2("2.1 Resultados"),
    tablaModelos(),
    ...spacer(1),
    ...(Array.isArray(imgs1) ? imgs1 : [imgs1]),
    h2("2.2 Modelo ganador: LightGBM"),
    body(
      "LGBMClassifier obtuvo el mejor F1-macro en holdout (0.453), superando al segundo " +
      "modelo (BaggingClassifier, 0.409) en 4.4 puntos. LightGBM es un algoritmo de gradient " +
      "boosting optimizado para velocidad y memoria, especialmente eficaz con datos tabulares mixtos."
    ),
    pageBreak(),
  ];
}

function seccionMatriz() {
  const imgs2 = img("matriz_confusion_ganador.png", 600, 500, "Figura 2. Matriz de confusion — LGBMClassifier (holdout)");
  return [
    h1("3. Analisis del modelo ganador"),
    h2("3.1 Matriz de confusion"),
    body(
      "La matriz de confusion muestra cuantos votos de cada clase real fueron correctamente " +
      "clasificados en el conjunto holdout (20% mas reciente del dataset):"
    ),
    ...(Array.isArray(imgs2) ? imgs2 : [imgs2]),
    body("Lectura de los resultados:", { bold: true }),
    bullet("AFIRMATIVO: el modelo lo predice muy bien (93% de los AFIRMATIVOS reales son capturados)."),
    bullet("NEGATIVO: solo detecta 228 de 870 NEGATIVOS reales. Los confunde frecuentemente con AFIRMATIVO."),
    bullet("ABSTENCION: con 68 casos en holdout y desbalance extremo (1.4% del total), el modelo apenas los identifica (6 correctos). Es el punto mas debil."),
    ...spacer(1),
    body(
      "Estos resultados son esperables dado el fuerte desbalance de clases. Las tecnicas utilizadas " +
      "(class_weight='balanced') mitigan pero no eliminan el problema con clases tan minoritarias."
    ),
    pageBreak(),
  ];
}

function seccionImportancia() {
  const imgs3 = img("importancia_features_top30.png", 1000, 900, "Figura 3. Top 30 features por importancia (gain) — LGBMClassifier");
  const imgs4 = img("importancia_por_grupo.png", 700, 400, "Figura 4. Importancia por grupo de features");
  return [
    h1("4. Importancia de features"),
    body(
      "LightGBM calcula la importancia de cada feature segun cuanto 'ganaron' en promedio las " +
      "divisiones de arbol que la usaron (criterio 'gain'). Un valor mas alto significa que la " +
      "feature contribuyo mas a reducir el error del modelo."
    ),
    ...(Array.isArray(imgs4) ? imgs4 : [imgs4]),
    body("Distribucion por grupo:", { bold: true }),
    bullet("Embeddings semanticos (384 dimensiones): 61.4% de la importancia total."),
    bullet("Features historicas y de bloque: 38.4%."),
    bullet("tema_id: 0.2% (redundante con los embeddings)."),
    ...spacer(1),
    ...(Array.isArray(imgs3) ? imgs3 : [imgs3]),
    h2("4.1 Interpretacion politica"),
    body("Las features mas influyentes individualmente son:", { bold: true }),
    bullet("bloque_enc (6.7%): el bloque politico es el predictor mas fuerte. La disciplina partidaria es la principal fuerza organizadora del voto legislativo."),
    bullet("n_votos_hist (6.5%): cuantos votos previos tiene el diputado, lo que captura tanto experiencia como disponibilidad de datos."),
    bullet("tasa_afirmativo_bloque_tema (5.0%): la posicion historica del bloque en ese tema especifico."),
    bullet("provincia_enc (4.8%): la provincia introduce heterogeneidad regional que el bloque solo no captura."),
    bullet("tasa_afirmativo_hist (4.5%): la tendencia global del diputado a votar afirmativamente."),
    bullet("tasa_afirmativo_desde_2023 (4.1%): el comportamiento bajo el gobierno actual."),
    ...spacer(1),
    body(
      "El hecho de que los embeddings sumen 61% en conjunto (aunque individualmente cada " +
      "dimension aporta menos de 0.4%) confirma que el contenido de la ley importa tanto como " +
      "el comportamiento historico del legislador. Sin NLP, el modelo tendria menos de la mitad " +
      "de la informacion disponible."
    ),
    pageBreak(),
  ];
}

function seccionMetodologia() {
  return [
    h1("5. Defensa metodologica"),
    h2("5.1 Validacion temporal (no aleatoria)"),
    body(
      "En datos con dimension temporal, partir el dataset al azar ('train_test_split' clasico) " +
      "introduce fuga de informacion: el modelo entrena con votos del futuro. Esto produce metricas " +
      "artificialmente buenas que no se trasladan a la realidad."
    ),
    body(
      "En LegisTrack usamos exclusivamente validacion temporal:"
    ),
    bullet("TimeSeriesSplit(n_splits=5) para la validacion cruzada: cada fold usa el pasado para entrenar y el futuro inmediato para evaluar."),
    bullet("Holdout fijo: el 20% mas reciente del dataset (nunca visto durante el entrenamiento) como evaluacion final."),
    ...spacer(1),
    h2("5.2 Metrica: F1-macro"),
    body(
      "El dataset esta fuertemente desbalanceado: ~72% AFIRMATIVO, ~24% NEGATIVO, ~4% ABSTENCION. " +
      "Un modelo que siempre prediga AFIRMATIVO obtendria accuracy del 72% sin aprender nada util."
    ),
    body(
      "F1-macro pondera por igual las tres clases, sin importar su frecuencia. Es la metrica " +
      "honesta para este problema y la que usamos en toda la comparacion."
    ),
    ...spacer(1),
    h2("5.3 Anti-leakage en features"),
    body(
      "Cada feature historica se calcula con el patron cumsum().shift(1): la fila del voto N " +
      "solo ve los votos 0..N-1. Esto se verifica con un assert automatico al final de STG_5: " +
      "si alguna feature no es NaN en el primer voto de algun diputado, la notebook falla."
    ),
    pageBreak(),
  ];
}

function seccionTuning() {
  const tuningExists = fs.existsSync(imgPath("comparacion_tuning.png"));
  const imgs5 = tuningExists
    ? img("comparacion_tuning.png", 700, 400, "Figura 5. Comparacion LightGBM por defecto vs. afinado")
    : [body("(Grafico de tuning no disponible aun)", { italic: true })];

  return [
    h1("6. Optimizacion de hiperparametros (STG_7)"),
    body(
      "Se aplico RandomizedSearchCV sobre el modelo ganador (LGBMClassifier) para buscar " +
      "mejores hiperparametros. La busqueda uso el mismo TimeSeriesSplit temporal, garantizando " +
      "que ningun fold del tuning vio datos del futuro."
    ),
    body("Hiperparametros explorados:", { bold: true }),
    bullet("n_estimators: cantidad de arboles [100, 200, 300, 400, 500, 600]"),
    bullet("learning_rate: tasa de aprendizaje [0.01...0.15]"),
    bullet("num_leaves: complejidad del arbol [31...127]"),
    bullet("min_child_samples: regularizacion por hoja [10...80]"),
    bullet("colsample_bytree: muestreo de features por arbol [0.5...1.0]"),
    bullet("subsample: muestreo de filas por arbol [0.6...1.0]"),
    ...spacer(1),
    h2("6.1 Resultados del tuning"),
    ...tablaTuning(),
    ...spacer(1),
    ...(Array.isArray(imgs5) ? imgs5 : [imgs5]),
    pageBreak(),
  ];
}

function seccionConclusiones() {
  return [
    h1("7. Conclusiones"),
    body(
      "LegisTrack demuestra que el voto de un diputado en la Camara de Argentina es predecible " +
      "con un F1-macro de 0.45 usando informacion disponible publica (historial de votaciones y " +
      "texto del proyecto de ley)."
    ),
    body("Los hallazgos principales son:", { bold: true }),
    bullet("La disciplina partidaria (bloque) es el predictor individual mas fuerte, reflejando la logica de coalition politics en Argentina."),
    bullet("El contenido semantico del proyecto de ley (embeddings NLP) aporta el 61% de la informacion total, mas que todas las features historicas juntas."),
    bullet("La clase NEGATIVO es la mas dificil de predecir, posiblemente por la mayor heterogeneidad interna en los votos negativos."),
    bullet("La validacion temporal estricta garantiza que las metricas son honestas y transferibles al uso real del sistema."),
    ...spacer(1),
    body("Limitaciones:", { bold: true }),
    bullet("ABSTENCION es casi impredecible con los datos actuales (68 casos en holdout)."),
    bullet("El modelo no captura negociaciones privadas, ausencias strategicas ni cambios de bloque recientes."),
    bullet("Un F1-macro de 0.45 significa que el modelo se equivoca con frecuencia; debe usarse como herramienta de apoyo, no como oraculo."),
    ...spacer(2),
    body(
      "LegisTrack — Informe generado automaticamente | Junio 2026",
      { italic: true, size: 18, after: 0 }
    ),
  ];
}

// ---------------------------------------------------------------------------
// Documento final
// ---------------------------------------------------------------------------
async function main() {
  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 2cm
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E74B5" } },
            children: [
              new TextRun({ text: "LegisTrack — Predictor de votaciones legislativas", size: 18, font: "Arial", color: "2E74B5" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Pagina ", size: 18, font: "Arial", color: "808080" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "808080" }),
              new TextRun({ text: " de ", size: 18, font: "Arial", color: "808080" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: "808080" }),
            ],
          })],
        }),
      },
      children: [
        ...seccionPortada(),
        ...seccionFeatures(),
        ...seccionModelos(),
        ...seccionMatriz(),
        ...seccionImportancia(),
        ...seccionMetodologia(),
        ...seccionTuning(),
        ...seccionConclusiones(),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT_FILE, buffer);
  console.log(`Informe generado: ${OUT_FILE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
