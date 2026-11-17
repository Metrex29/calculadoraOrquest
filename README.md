# Calculadora Orquest · Hostelería Madrid

Web para calcular tus **horas trabajadas, la nocturnidad y tu nómina estimada** a partir de las capturas de tus turnos de **Orquest**, con el **convenio de hostelería de la Comunidad de Madrid**.

Pensada para el personal de restauración (equipo y encargados) de la Comunidad de Madrid.

> Calculadora **no oficial**. No tiene relación con ninguna empresa ni con Orquest. Los resultados son una estimación: compáralos siempre con tu nómina.

## Qué hace

- **Configuración inicial en 3 pasos**: horas de contrato a la semana, categoría (equipo o encargado/a) y 12 o 14 pagas.
- **Subir capturas** de la pantalla *Turnos → Mis turnos* de Orquest. Las lee en el propio móvil (gratis, sin cuentas, sin enviarlas a ningún sitio): fechas, horarios, días libres y vacaciones (icono del sol rosa).
- **Semana**: cada día con su turno sobre una línea de 24 h, horas, nocturnidad y lo que valen esas horas.
- **Nómina**: nómina estimada del mes con los mismos conceptos que la nómina real. Puedes apuntar el líquido real y ver si cuadra.
- **Historial** de meses, **copia de seguridad** de los datos y **resumen** del mes en texto.

## Cómo calcula

Importes para personal de **equipo** a jornada completa (40 h), comprobados con una nómina real de octubre de 2026; para otras jornadas se prorratean:

| Concepto | Jornada completa |
|---|---|
| Salario base | 1.127,42 €/mes |
| Plus convenio (prorrateado) | 175,28 €/mes |
| Plus manutención vacaciones | 9,64 €/mes |
| Prorrata pagas extra (12 pagas) | salario base × 2 / 12 |
| Hora complementaria | 9,94 €/h |
| Nocturno 22:00–00:00 (1 % del salario base) | 0,07 €/h |
| Nocturna 00:00–08:00 (25 % del salario base) | 1,76 €/h |
| Manutención (en especie, solo cotiza) | 2,65 €/día trabajado |

- **Horas complementarias del mes** = horas trabajadas − horas de contrato del mes (horas semanales × 52 / 12, descontando los días de vacaciones), redondeado a horas enteras.
- **Seguridad Social**: 4,85 % contingencias comunes + 1,65 % desempleo y formación (contrato indefinido), sobre el devengo más la manutención.
- **Encargados**: el sueldo depende del nivel, así que se copian los importes de la propia nómina.

Todos los importes se pueden cambiar en *Ajustes*.

## Privacidad

Todo se guarda en el `localStorage` del navegador de cada persona. No hay servidor, ni cuentas, ni se envía nada a ningún sitio. Las capturas se procesan en el dispositivo con [Tesseract.js](https://github.com/naptha/tesseract.js).

## Publicarla con GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Build and deployment*, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Al cabo de un minuto estará en `https://<usuario>.github.io/<repositorio>/`.

Es una web estática: también funciona en cualquier otro alojamiento de archivos estáticos.

## Estructura

```
index.html   página
app.css      estilos (claro y oscuro)
app.js       cálculos, interfaz y lector de capturas
ocr/         Tesseract.js, núcleo WebAssembly y datos del idioma español
```

Los datos del idioma (`ocr/lang/spa-traineddata-gz.b64.txt`) son el `spa.traineddata` de [tessdata_best](https://github.com/tesseract-ocr/tessdata_best) comprimido y en base64. `ocr/worker-wrap.js` lo decodifica y se lo entrega a Tesseract.js, para que la web funcione también en alojamientos que no sirven archivos binarios.

## Licencias de terceros

- [Tesseract.js](https://github.com/naptha/tesseract.js) y [tesseract.js-core](https://github.com/naptha/tesseract.js-core): Apache License 2.0 (ver `ocr/LICENSE-tesseract.js.txt`).
- Datos de idioma de [Tesseract OCR](https://github.com/tesseract-ocr/tessdata_best): Apache License 2.0.
- Tipografías Barlow Condensed, IBM Plex Mono y Public Sans: SIL Open Font License, cargadas desde Google Fonts.
