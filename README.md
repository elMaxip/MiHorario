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
3. **Genera por backtracking** las combinaciones (una sección por asignatura) que no se superponen, por tandas y sin bloquear la interfaz.
4. **Visualiza** cada horario resultante en un calendario semanal navegable.

Todo se procesa del lado del cliente: el archivo nunca sale de tu equipo.

## Funcionalidades

- **Carga del archivo** arrastrándolo a cualquier parte de la página de inicio o con el botón «Seleccionar Excel» (accesible con teclado). «Probar con un archivo de ejemplo» carga `public/Horario.xlsx`. Los errores (archivo que no es `.xlsx`, columnas faltantes, sin asignaturas) se muestran en línea.
- **Filtro por carrera** (obligatorio cuando el archivo trae varias), búsqueda sin tildes, nivel, jornada y modalidad. La casilla «Incluir secciones de otras carreras» suma las secciones con la misma sigla de otras carreras; en los horarios se indica su carrera de origen.
- **Selección de asignaturas** con el conteo en vivo «n de N secciones caben». Solo se puede elegir una versión (jornada o modalidad) por sigla. Si una asignatura elegida no cabe, se sugiere la sección más cercana y «Ampliar horas» aplica ese rango.
- **Disponibilidad por día** (lunes a sábado) en una grilla de 08:00 a 22:30: rangos rápidos, barras que se arrastran desde sus bordes (escritorio) y selects «Desde/Hasta» como alternativa de teclado y en móvil. Al pasar sobre una asignatura, la grilla muestra sus bloques.
- **Generación por tandas de 100** en un Web Worker: la interfaz nunca se bloquea, el primer horario aparece en cuanto se encuentra y se piden más al llegar al final del carril, con «Generar 100 más» o con «siguiente» en el último. «Detener» conserva lo encontrado.
- **Vista de horarios**: carril virtualizado de combinaciones con miniaturas, orden por menos ventanas, menos días o salida más temprana (sobre lo ya generado), semana con resaltado por asignatura, «Secciones para inscribir», «Copiar secciones» y «Descargar horario» (PNG de 1600 px). En móvil: carril horizontal, siglas en los bloques y agenda «Día por día».
- **Sesión guardada** en `localStorage` (`mihorario:prefs:v1`): disponibilidad, ramos, carrera, filtros y orden. El archivo nunca se guarda: al recargar se pide subirlo de nuevo y se restauran las preferencias. «Restablecer preferencias» las borra.

## Tecnologías

| Área | Herramienta |
| --- | --- |
| UI | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build / dev server | [Vite 7](https://vite.dev/) con `@vitejs/plugin-react-swc` |
| Enrutamiento | [React Router 7](https://reactrouter.com/) |
| Estado global | [Jotai](https://jotai.org/) |
| Lectura de Excel | [SheetJS (`xlsx`)](https://sheetjs.com/) 0.20.3, instalado desde `cdn.sheetjs.com` (la versión de npm está desactualizada y tiene vulnerabilidades conocidas) |
| Estilos | CSS Modules + variables de `src/styles/tokens.css` |
| Tipografía | Archivo variable, autoalojada con `@fontsource-variable/archivo` |
| Tests | [Vitest](https://vitest.dev/) |
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

### Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # chequeo de tipos + build de producción en dist/
npm run preview   # sirve el build localmente
npm run lint      # ESLint
npm test          # Vitest
```

### Flujo de uso

1. **Inicio (`/`)**: arrastra o selecciona el Excel con la oferta académica.
2. **Planificador (`/planificador`)**: elige tu carrera, marca tus ramos y ajusta tu disponibilidad (por defecto lunes, miércoles y viernes de 08:00 a 14:00; martes y jueves de 08:00 a 17:00). Presiona **Crear horarios**.
3. **Horarios (`/horarios`)**: recorre las combinaciones, ordénalas, copia las secciones o descarga la imagen.

Las rutas antiguas `/planner` y `/calendar` redirigen a las nuevas.

### Formato del Excel

Se lee la **primera hoja** del libro. Cada fila representa un bloque de clase. Estas columnas son obligatorias: `Carrera`, `Jornada`, `Sigla Asignatura`, `Nombre Asignatura`, `Nivel`, `Sección`, `Horario` y `Docente`. `ASIGNATURA VIRTUAL SINCRONICA` es opcional y marca la modalidad online; el resto se ignora.

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

El campo `Horario` tiene el formato `<Día> <inicio> - <fin>`, con día en `Lu`, `Ma`, `Mi`, `Ju`, `Vi` o `Sa`. Las filas con horario `0:00:00 - 0:00:00` (sin horario asignado) se descartan, y una sección sin ninguna fila con horario no se ofrece. Una sección con varias clases a la semana aparece en varias filas; una sección compartida por varias carreras aparece una vez por carrera y se une en una sola.

En `public/` hay dos archivos de ejemplo: `Horario.xlsx` (reducido) y `Horario-full.xlsx` (oferta completa, varias carreras).

## Estructura del proyecto

```
src/
├── main.tsx
├── app/App.tsx            # Rutas, barra superior y guarda «sin archivo → inicio»
├── domain/                # TypeScript puro, sin React, con tests
│   ├── types.ts           # Offering, Subject, Section, Block, Availability, Schedule
│   ├── parse.ts           # ArrayBuffer → Offering, con errores tipados
│   ├── time.ts, text.ts   # Minutos ↔ «09:31», duraciones, mayúsculas, búsqueda
│   ├── merge.ts           # Fusión de bloques a menos de 15 min
│   ├── fit.ts             # Qué secciones caben y alcance por carrera
│   ├── nearest.ts         # Sección más cercana y rango a ampliar
│   ├── generate.ts        # Backtracking con pila explícita, pausable
│   ├── stats.ts           # Días, ventanas y hora de salida
│   ├── availability.ts    # Disponibilidad por defecto, rangos rápidos, tramos del día
│   └── problem.ts         # Arma el problema para el worker
├── workers/               # Worker de generación por tandas y su protocolo
├── state/                 # Átomos de Jotai, preferencias (localStorage) y controlador del worker
├── features/
│   ├── home/              # Inicio y zona de carga
│   ├── planner/           # Asignaturas, disponibilidad y barra inferior
│   └── schedules/         # Carril, semana, secciones, agenda y exportación PNG
├── ui/                    # Button, Field, Progress, TopBar, Logo
└── styles/                # tokens.css (paleta y tipografía) y global.css
```

## Decisiones técnicas

### Procesamiento 100 % en el cliente
No hay backend: SheetJS lee el archivo en el navegador y se descarga solo cuando hace falta (import dinámico). Ningún dato de la institución o del estudiante viaja por la red, y cualquier hosting estático sirve.

### Identidad de una asignatura
Una asignatura se identifica por **sigla + jornada + modalidad**. Asignaturas con el mismo nombre y distinta sigla (por ejemplo INU4100 e INU4101) nunca se mezclan. Por defecto cada asignatura usa solo las secciones de la carrera elegida; la casilla «Incluir secciones de otras carreras» suma las de la misma sigla.

### Generación: backtracking pausable en un Web Worker
Antes de buscar se filtran las secciones que caben; si una asignatura queda sin secciones se devuelve ese error (con la sugerencia más cercana) en vez de buscar. Las asignaturas se ordenan de menos a más secciones válidas para podar antes, y los choques entre secciones se precalculan en una matriz (`Uint8Array`), así que comprobar un tope es O(1). El recorrido usa un arreglo de índices y una pila explícita: se puede detener en cualquier punto y reanudar exactamente donde quedó.

El worker conserva ese estado entre mensajes (`start`, `next`, `cancel`) y responde con `progress` (cada ~50 ms, con los horarios nuevos para mostrar el primero cuanto antes), `batch` y `error`. Los horarios viajan compactos (índice de sección por asignatura, más sus estadísticas) y la interfaz reconstruye los bloques desde la oferta. El progreso es la fracción del árbol de búsqueda ya recorrida: monótona y exacta.

### Horas en minutos enteros
Todas las horas se convierten a minutos desde medianoche una sola vez, al leer el archivo.

### Errores como datos
El dominio devuelve `{ ok: false, reason, … }` y la interfaz decide qué mostrar. No hay `alert()`.

### Estilos
CSS Modules por componente y una sola fuente de colores, radios y tipografía en `tokens.css`. La vista móvil o de escritorio se decide con CSS (puntos de quiebre en 980, 760 y 440 px).

## Limitaciones conocidas

- La memoria crece con los horarios que se piden (no hay tope total). El carril está virtualizado, pero cada horario ocupa memoria.
- «Ordenar por» ordena solo lo ya generado. «Orden de la planilla» es el orden de generación: las asignaturas con menos secciones se deciden primero, así que no coincide exactamente con el orden de las filas del Excel.
- El formato del Excel está acoplado a los nombres de columna indicados arriba.
- Los nombres de asignatura se pasan a minúscula de oración; los nombres propios dentro de ellos quedan en minúscula.

## Ideas a futuro

- Exportar a calendario (`.ics`).
- Bloquear secciones o docentes específicos.

## Autor

Máximo Soto — [@elMaxip](https://github.com/elMaxip)
