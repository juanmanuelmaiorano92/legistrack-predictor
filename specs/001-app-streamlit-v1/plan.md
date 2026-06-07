# Plan 001 — App Streamlit v1 (demo para presentación)

## Enfoque técnico

La app es un script de Python (`app/app.py`) que Streamlit convierte en una página web
automáticamente. Al abrirla, carga el CSV con el historial de votaciones. El usuario
elige un diputado y un proyecto, presiona "Consultar", y la app filtra el CSV y muestra
los resultados en pantalla. No hay cálculos de ML en esta etapa.

Pasos conceptuales:
1. Al iniciar, leer el CSV y dejarlo listo en memoria (con `@st.cache_data` para que no
   se recargue cada vez que el usuario interactúa).
2. Mostrar dos selectores con los nombres de diputados y los títulos de proyectos únicos.
3. Cuando el usuario aprieta "Consultar", filtrar el CSV por el diputado elegido y
   mostrar: bloque, provincia, conteo de votos, y tabla de las últimas 10 votaciones.
4. Mostrar debajo el texto placeholder de la predicción.

## Librerías y herramientas

| Librería | Para qué | Ya en el proyecto |
|----------|----------|-------------------|
| `streamlit` | Construir la interfaz web | No — agregar a `requirements.txt` |
| `pandas` | Leer y filtrar el CSV | Sí |

No se agrega ninguna otra librería. Sin gráficos externos, sin CSS, sin JavaScript.

## Diseño anti-leakage / validación

**Esta feature no toca modelos ni features de ML, por lo tanto no hay riesgo de data
leakage ni de validación temporal.** La app solo lee y muestra datos que ya están en el
CSV procesado (`df_consolidado`). No se realiza ningún cálculo sobre los datos; tampoco
se crea ninguna variable derivada. El riesgo de leakage es inexistente en esta etapa.

## Pasos de implementación

1. Verificar que existe `app/` en el repositorio; si no, crearlo.
2. Exportar `df_consolidado` como CSV a `data/df_consolidado.csv` (si no existe ya).
   Solo las columnas necesarias: `diputado`, `titulo_base`, `bloque`, `provincia`,
   `voto`, `fecha_votacion`.
3. Agregar `streamlit` a `requirements.txt`.
4. Escribir `app/app.py`:
   - Cargar el CSV con `@st.cache_data`.
   - Mostrar título de la app (`st.title`).
   - Dos `st.selectbox`: uno para diputado, uno para proyecto.
   - Botón "Consultar" (`st.button`).
   - Al presionar: filtrar por diputado, mostrar bloque/provincia/conteo con `st.write`,
     mostrar tabla con `st.dataframe`.
   - Mostrar línea placeholder de predicción con `st.write`.
5. Probar localmente con `streamlit run app/app.py`.
6. Verificar que el CSV no esté en `.gitignore` (o ajustarlo para que `df_consolidado.csv`
   sea commitable si no es demasiado grande — límite de GitHub: 100 MB).

## Reproducibilidad

- No hay semillas porque no hay azar en esta feature.
- **Entrada**: `data/df_consolidado.csv` (generado por STG_2).
- **Salida**: ningún archivo nuevo; la app solo muestra datos en pantalla.
- El archivo `requirements.txt` debe incluir la versión de streamlit usada
  (ej: `streamlit==1.35.0`).

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|--------|------------|
| CSV demasiado grande para GitHub o Streamlit Cloud (>50 MB) | Antes de commitear, revisar el tamaño con `ls -lh data/df_consolidado.csv`. Si supera 50 MB, exportar solo las 6 columnas necesarias (descartando columnas auxiliares como `diputado_norm`). |
| Títulos de proyectos muy largos en el selector | Truncar a 80 caracteres en el selector, mostrando el título completo en la tabla de resultados. |
| El CSV no existe al clonar el repo | Documentar en `README` (o en la app misma) que hay que correr STG_2 para generarlo, o subirlo al repo si el tamaño lo permite. |
