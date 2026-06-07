# Tareas 001 — App Streamlit v1 (demo para presentación)

> Cada tarea es chica y verificable. Se ejecutan en orden con /implementar.

- [x] T1 — Crear `requirements.txt` con las dependencias del proyecto (`streamlit`, `pandas`) y sus versiones exactas.

- [x] T2 — Verificar el `.gitignore`: actualmente bloquea `*.csv` y `data/`. Agregar una excepción para permitir commitear `data/df_consolidado.csv` (necesario para Streamlit Cloud). (depende de: T1)

- [x] T3 — Exportar `df_consolidado` a `data/df_consolidado.csv` con solo las 6 columnas necesarias (`diputado`, `titulo_base`, `bloque`, `provincia`, `voto`, `fecha_votacion`), y verificar que el archivo pesa menos de 50 MB. (depende de: T2)

- [x] T4 — Crear la carpeta `app/` y escribir `app/app.py` con la estructura base: carga del CSV con `@st.cache_data`, título de la app, y los dos selectores (diputado y proyecto). (depende de: T3)

- [x] T5 — Agregar el botón "Consultar" y la lógica de filtrado: al presionar, mostrar bloque, provincia y conteo de votos (AFIRMATIVO / NEGATIVO / ABSTENCIÓN) del diputado elegido. (depende de: T4)

- [x] T6 — Agregar la tabla con las últimas 10 votaciones del diputado (`st.dataframe` con columnas: título truncado a 80 caracteres, fecha, voto). (depende de: T5)

- [x] T7 — Agregar la línea placeholder de predicción debajo de la tabla: texto "Modelo en desarrollo — la predicción estará disponible próximamente." (depende de: T6)

- [x] T8 — Probar la app localmente con `streamlit run app/app.py` y verificar que corre sin errores, que los selectores listan datos reales y que la tabla muestra votaciones correctas. (depende de: T7)

- [x] T9 — Validar contra los criterios de aceptación de la spec: lista de 257 diputados, datos reales de bloque/provincia/votos, tabla visible, placeholder de predicción visible. (depende de: T8)

- [x] T10 — Registrar resultado y decisiones en `memoria/DECISIONES.md`. (depende de: T9)
