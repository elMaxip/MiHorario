# MiHorario

Generador de horarios académicos: subes el Excel con la oferta de asignaturas de tu institución, eliges los ramos que quieres tomar y las horas en las que puedes asistir, y la aplicación calcula **todas las combinaciones de secciones posibles sin topes de horario**, mostrándolas en un calendario semanal.

## El problema

Al inscribir asignaturas, cada ramo se dicta en varias secciones, con distintos días, horas, docentes y jornadas. Armar un horario a mano significa:

- Revisar cientos (o miles) de filas en una planilla.
- Probar combinaciones de secciones una por una para detectar topes.
- Descartar opciones que no calzan con tu disponibilidad (trabajo, traslados, etc.).
- Repetir todo cuando una sección se llena o cambias de idea.

Es un proceso lento y propenso a errores, y es fácil pasar por alto combinaciones válidas.

## La solución

MiHorario automatiza ese trabajo:

1. **Lee la planilla oficial** (`.xlsx`) directamente en el navegador.
2. **Filtra** las secciones que caen fuera de tu disponibilidad diaria.
3. **Genera por backtracking** todas las combinaciones (una sección por asignatura) que no se superponen.
4. **Visualiza** cada horario resultante en un calendario semanal navegable.

Todo se procesa del lado del cliente: el archivo nunca sale de tu equipo.

## Funcionalidades

- **Carga de archivo** por arrastrar y soltar o mediante selector (solo `.xlsx`).
- **Disponibilidad por día** (lunes a sábado): rango "Desde / Hasta" con un selector de hora propio.
- **Selección de asignaturas** con filtros por carrera, nivel/semestre, jornada y modalidad virtual sincrónica.
  - Solo se puede elegir una variante (nivel/jornada/modalidad) por asignatura; las demás se deshabilitan automáticamente.
- **Generación de horarios** sin topes que respetan la disponibilidad indicada.
- **Fusión de bloques**: clases consecutivas de la misma sección separadas por menos de 15 minutos se muestran como un único bloque.
- **Visualizador** con navegación entre combinaciones ("Horario X de N").
- **Diseño responsive**: vista de calendario semanal en escritorio (≥ 1030 px) y vista por día desplegable en móvil.
- **Mensajes de ayuda** cuando el archivo no tiene asignaturas o cuando ninguna combinación es posible con las horas elegidas.

## Tecnologías

| Área | Herramienta |
| --- | --- |
| UI | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build / dev server | [Vite 7](https://vite.dev/) con `@vitejs/plugin-react-swc` |
| Enrutamiento | [React Router 7](https://reactrouter.com/) |
| Estado global | [Jotai](https://jotai.org/) |
| Lectura de Excel | [SheetJS (`xlsx`)](https://sheetjs.com/) |
| Estilos | CSS Modules |
| Calidad de código | ESLint + `typescript-eslint` |

## Cómo usarlo

### Requisitos

- [Node.js](https://nodejs.org/) 20 o superior
- npm

### Instalación

```bash
git clone https://github.com/elMaxip/MiHorario.git
cd MiHorario
npm install
```

### Variables de entorno

El archivo `.env` define el modo de carga de datos:

```env
VITE_MODE=prod
```

| Valor | Comportamiento |
| --- | --- |
| `prod` | Usa el archivo que sube el usuario en la página de inicio. |
| `dev` | Ignora el archivo subido y carga `public/Horario-full.xlsx`, útil para desarrollar sin subir un archivo cada vez. |

### Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # chequeo de tipos + build de producción en dist/
npm run preview   # sirve el build localmente
npm run lint      # ESLint
```

### Flujo de uso

1. **Inicio (`/`)**: arrastra o selecciona el Excel con la oferta académica.
2. **Planificador (`/planner`)**:
   - En *Disponibilidad*, ajusta el rango horario de cada día (por defecto 08:00–14:00).
   - En *Asignaturas*, filtra y marca los ramos que quieres inscribir.
   - Presiona **Crear y visualizar horarios**.
3. **Calendario (`/calendar`)**: recorre las combinaciones generadas con las flechas.

### Formato del Excel

Se lee la **primera hoja** del libro. Cada fila representa un bloque de clase y debe incluir estas columnas:

| Columna | Ejemplo |
| --- | --- |
| `Sede` | `VIÑA DEL MAR` |
| `Carrera` | `INGENIERÍA EN INFORMÁTICA` |
| `Plan` | `1446115` |
| `Jornada` | `Diurno` |
| `Sigla Asignatura` | `BDY1102` |
| `Nombre Asignatura` | `BASE DE DATOS APLICADA II` |
| `Nivel` | `3` |
| `Sección` | `BDY1102-008D` |
| `Horario` | `Lu 08:31:00 - 09:50:00` |
| `Docente` | `NOMBRE APELLIDO` |
| `ASIGNATURA VIRTUAL SINCRONICA` | *(opcional)* |

El campo `Horario` tiene el formato `<Día> <inicio> - <fin>`, con día en `Lu`, `Ma`, `Mi`, `Ju`, `Vi` o `Sa`. Las filas con horario `0:00:00 - 0:00:00` (sin horario asignado) se descartan. Una sección con varias clases a la semana aparece en varias filas.

En `public/` hay dos archivos de ejemplo: `Horario.xlsx` (reducido) y `Horario-full.xlsx` (oferta completa).

## Estructura del proyecto

```
src/
├── App.tsx                 # Rutas y átomos globales (archivo y horarios generados)
├── main.tsx
├── pages/
│   ├── Home/               # Carga del archivo
│   ├── Planner/            # Disponibilidad y selección de asignaturas
│   └── Calendar/           # Visualizador de horarios
├── components/
│   ├── DesktopCalendar/    # Grilla semanal
│   ├── MobileCalendar/     # Vista por día
│   ├── SubjectBlock/       # Bloque de clase en el calendario
│   ├── SubjectChoise/      # Filtros + listado de asignaturas
│   ├── FilteredSubject/    # Checkbox de cada asignatura
│   ├── TimePicker/         # Selector de hora/minuto
│   ├── TimePickerLabel/    # Fila "Desde / Hasta" por día
│   ├── FileUploader/  Hero/  Button/
├── types/planner.types.ts  # Tipos de dominio (Subject, Schedule, Day…)
└── utils/planner.utils.ts  # Parseo del Excel y algoritmo de generación
```

## Decisiones técnicas

### Procesamiento 100 % en el cliente
No hay backend: SheetJS lee el archivo como `ArrayBuffer` en el navegador. Esto simplifica el despliegue (cualquier hosting estático sirve), elimina costos de servidor y evita que datos de la institución o del estudiante viajen por la red.

### Algoritmo de generación: backtracking con poda
`createSchedule` recorre las asignaturas en orden y, para cada una, prueba cada sección. Antes de avanzar verifica con `checkSchedule` que ningún bloque de la sección se superponga con lo ya asignado; si hay tope, esa rama se descarta de inmediato. Así se evita generar el producto cartesiano completo de secciones.

Antes del backtracking se aplica un **prefiltrado** (`processFileAndGenerateSchedules`):

- Se descartan secciones con algún bloque fuera de la disponibilidad del día. Basta un bloque fuera de rango para excluir la sección entera, ya que inscribirla obliga a asistir a todas sus clases.
- Si alguna asignatura elegida queda sin secciones válidas, se avisa al usuario antes de intentar combinar.

### Identidad de una asignatura
Una misma asignatura puede ofrecerse en distintos niveles, jornadas o modalidades. Por eso se identifica con la clave compuesta `Nombre/Nivel/Jornada/Virtual`, y la interfaz impide seleccionar dos variantes de la misma asignatura.

### Fusión de bloques contiguos
Las planillas suelen partir una clase larga en módulos consecutivos (p. ej. `08:31–09:50` y `10:01–11:20`). `mergeBlocks` une bloques de la misma sección y día que estén a menos de 15 minutos entre sí, para que el calendario muestre una sola tarjeta y el chequeo de topes trabaje con menos elementos.

### Horas como segundos
Las horas se convierten a segundos desde medianoche (`timeToSeconds`) para comparar rangos con aritmética simple. El calendario usa el mismo valor para posicionar cada bloque (`top = segundos / 35 + offset`).

### Estado global mínimo con Jotai
Solo dos datos necesitan cruzar páginas: el archivo subido y los horarios generados. Jotai los guarda en dos átomos sin el boilerplate de Context o Redux. El resto del estado (filtros, disponibilidad, selección) es local a cada página.

### CSS Modules y componentes propios
Cada componente tiene su propio `.module.css`, evitando colisiones de clases sin agregar dependencias de estilos. El selector de hora es un componente propio para mantener un aspecto consistente en escritorio y móvil.

## Limitaciones conocidas

- El número de combinaciones crece exponencialmente con la cantidad de asignaturas y secciones; con muchas asignaturas y rangos horarios amplios la generación puede tardar.
- Los horarios generados viven solo en memoria: si se recarga la página en `/planner` o `/calendar` hay que volver a subir el archivo.
- El formato del Excel está acoplado a los nombres de columna indicados arriba.

## Ideas a futuro

- Mover la generación a un Web Worker para no bloquear la interfaz.
- Ordenar o puntuar horarios (menos ventanas, menos días presenciales, salir más temprano).
- Persistir la sesión en `localStorage`.
- Exportar un horario a imagen, PDF o calendario (`.ics`).
- Bloquear secciones o docentes específicos.

## Autor

Máximo Soto — [@elMaxip](https://github.com/elMaxip)
