# Pruebas Unitarias — Quetzal TV Backend

## Índice

1. [Contexto general](#1-contexto-general)
2. [Herramientas de prueba por lenguaje](#2-herramientas-de-prueba-por-lenguaje)
   - 2.1 [Go test (Go)](#21-go-test--go)
   - 2.2 [Jest + ts-jest (TypeScript)](#22-jest--ts-jest--typescript)
   - 2.3 [Pytest + pytest-cov (Python)](#23-pytest--pytest-cov--python)
3. [Estrategia de pruebas](#3-estrategia-de-pruebas)
4. [Pruebas por servicio](#4-pruebas-por-servicio)
   - 4.1 [catalogo (Go)](#41-servicio-catalogo--go)
   - 4.2 [streaming (Go)](#42-servicio-streaming--go)
   - 4.3 [cobros (TypeScript)](#43-servicio-cobros--typescript)
   - 4.4 [divisas (TypeScript)](#44-servicio-divisas--typescript)
   - 4.5 [notificaciones (TypeScript)](#45-servicio-notificaciones--typescript)
   - 4.6 [api-gateway (TypeScript)](#46-api-gateway--typescript)
   - 4.7 [suscripcion (Python)](#47-servicio-suscripcion--python)
   - 4.8 [usuario (Python)](#48-servicio-usuario--python)
5. [Cómo ejecutar las pruebas y ver cobertura](#5-cómo-ejecutar-las-pruebas-y-ver-cobertura)

---

## 1. Contexto general

Quetzal TV está construido sobre una arquitectura de microservicios poliglota: cada servicio utiliza el lenguaje más adecuado a su dominio (Go, TypeScript o Python). Esta diversidad tecnológica exige que cada servicio tenga su propio conjunto de pruebas usando las **herramientas nativas del lenguaje**, garantizando que los reportes de cobertura sean generados con las herramientas estándar de la comunidad de cada ecosistema.

**Meta de cobertura:** ≥ 75 % de cobertura de código en todos los servicios.

**Filosofía aplicada:**
- Las pruebas son **unitarias**: no requieren base de datos, red ni servicios externos.
- Se usan **repositorios en memoria** e interfaces mock para aislar la lógica de negocio.
- Se prueba tanto el camino feliz (*happy path*) como los casos de error (*sad path*).

---

## 2. Herramientas de prueba por lenguaje

### 2.1 `go test` — Go

| Aspecto | Detalle |
|---|---|
| **Qué es** | Herramienta de testing incluida en la distribución estándar de Go |
| **Por qué se usa** | No requiere dependencias externas; es el estándar de facto del ecosistema Go |
| **Para qué sirve** | Descubrir y ejecutar funciones `Test*` en archivos `*_test.go`, calcular cobertura por paquete |
| **Paquete de test** | `package <pkg>_test` (caja negra) — permite probar solo la API pública |
| **Cobertura** | Se obtiene con la flag `-cover`: `go test -cover ./...` |
| **Reporte HTML** | `go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out` |

Los mocks de interfaces se implementan manualmente con structs que contienen campos de tipo función (`func(...)`), lo que permite inyectar comportamiento distinto en cada test sin librerías externas.

---

### 2.2 Jest + ts-jest — TypeScript

| Aspecto | Detalle |
|---|---|
| **Qué es** | **Jest** es el framework de testing más popular de JavaScript/TypeScript; **ts-jest** es el transformador que permite ejecutar `.ts` directamente sin compilar a JS previamente |
| **Por qué se usa** | Jest es el estándar del ecosistema Node.js/TypeScript; integración nativa con cobertura via V8/Istanbul |
| **Para qué sirve** | Ejecutar suites de pruebas con `describe`/`it`/`expect`, generar reportes de cobertura en texto y LCOV |
| **Configuración** | `jest` key en `package.json` con `preset: "ts-jest"` y `tsconfig.test.json` propio de los tests |
| **Cobertura** | `pnpm test` ejecuta `jest --coverage --runInBand`; reporte en `coverage/` |
| **`@types/jest`** | Provee los tipos globales de Jest (`describe`, `it`, `expect`) al compilador de TypeScript |

Cada servicio TS tiene su propio `tsconfig.test.json` que extiende el `tsconfig.json` principal agregando `"types": ["jest", "node"]` e incluyendo la carpeta `tests/`.

---

### 2.3 Pytest + pytest-cov — Python

| Aspecto | Detalle |
|---|---|
| **Qué es** | **pytest** es el framework de testing estándar de Python moderno; **pytest-cov** es el plugin que integra `coverage.py` con pytest |
| **Por qué se usa** | pytest es la herramienta más usada en el ecosistema Python por su sintaxis simple y potente sistema de fixtures |
| **Para qué sirve** | Descubrir y ejecutar funciones/clases `test_*`/`Test*`, calcular cobertura de ramas y líneas |
| **Configuración** | `pytest.ini` con `addopts = --cov=app --cov-report=term-missing --cov-fail-under=75` |
| **Cobertura** | Automática en cada ejecución de `pytest`; falla el build si cae por debajo del 75 % |
| **Reporte HTML** | Agregar `--cov-report=html` genera `htmlcov/index.html` |

---

## 3. Estrategia de pruebas

Todos los tests siguen el patrón **AAA (Arrange / Act / Assert)**:

1. **Arrange** — se construyen los objetos necesarios (repositorios en memoria, mocks, datos de entrada).
2. **Act** — se invoca el método o función bajo prueba.
3. **Assert** — se verifica que el resultado sea el esperado.

Para aislar la capa de **application** de la infraestructura (base de datos, gRPC, Redis, etc.) se utilizan:

- **Go:** structs anónimos con campos funcionales que implementan las interfaces del dominio.
- **TypeScript:** objetos literales con funciones `jest.fn()` o implementaciones manuales.
- **Python:** clases `Fake*` con implementaciones simples en memoria, o los repositorios `InMemory*` ya provistos en el código fuente de cada servicio.

---

## 4. Pruebas por servicio

### 4.1 Servicio `catalogo` — Go

**Archivos:**
- `internal/domain/content_test.go`
- `internal/application/service_test.go`

#### `content_test.go` — tests del dominio

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `TestContentTypeConstants` | Que `ContentTypeMovie == "pelicula"` y `ContentTypeSeries == "serie"` | Las constantes son contratos con la DB y la API; un cambio accidental rompe todo | Detectar regresiones en los valores de las constantes de tipo |
| `TestReactionTypeConstants` | Que `ReactionLike == "like"` y `ReactionDislike == "dislike"` | Misma razón que las constantes de tipo | Garantizar que los valores almacenados en BD no cambien silenciosamente |
| `TestDomainErrors_NotNil` | Que ningún error de dominio sea `nil` | Un error `nil` provocaría un `nil pointer dereference` en producción | Asegurar que todos los errores están correctamente inicializados |
| `TestDomainErrors_Messages` | Que los mensajes de error exactos son los esperados | Los mensajes se exponen en respuestas HTTP a clientes | Prevenir cambios accidentales en mensajes que afecten a clientes |
| `TestContentStruct_ZeroValue` | Que el valor cero de `Content` tiene campos vacíos | Comportamiento de Go con structs no inicializados | Documentar el comportamiento esperado del tipo |
| `TestRatingStruct` | Construcción correcta de `Rating` | El struct se usa en operaciones críticas de calificación | Verificar asignación correcta de campos |
| `TestEpisodeBatchStruct` | Construcción de `EpisodeBatch` con episodios | Operación de carga masiva de episodios | Garantizar que el slice de episodios se mantiene intacto |
| `TestGenreStruct` | Construcción de `Genre` | Tipo central del sistema de filtrado | Verificar campos del género |
| `TestCastMemberStruct` | Construcción de `CastMember` | Tipo del elenco mostrado en detalle de contenido | Verificar campos del miembro del elenco |
| `TestContentDetail_EmbedContent` | Que `ContentDetail` embebe correctamente `Content` y sus campos son accesibles | El embedding de Go puede ocultar bugs de acceso | Garantizar acceso correcto a campos del embedding |

#### `service_test.go` — tests de la capa de aplicación

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `TestList_ReturnsContents` | `List()` retorna todos los contenidos del repositorio | Flujo principal del listado de catálogo | Verificar que el servicio delega correctamente al repositorio |
| `TestList_PropagatesError` | `List()` propaga errores del repositorio | El servicio no debe suprimir errores de infraestructura | Garantizar que los errores llegan al handler HTTP |
| `TestListAll_ReturnsAllContents` | `ListAll()` retorna contenidos incluyendo eliminados | Necesario para el panel de administración | Verificar que el servicio usa `ListAll` y no `List` |
| `TestSearch_EmptyQuery_FallsBackToList` | Con query vacío `Search()` llama a `List` | Optimización: evitar búsquedas vacías en DB | Verificar el branching condicional del servicio |
| `TestSearch_NonEmptyQuery_CallsSearch` | Con query no vacío `Search()` llama a `Search` del repo | Flujo principal de búsqueda | Verificar que la query se pasa correctamente |
| `TestFilterByGenres_EmptyIDs_FallsBackToList` | Con slice vacío `FilterByGenres()` llama a `List` | Evitar queries SQL con IN () vacío | Verificar el guard clause del servicio |
| `TestFilterByGenres_WithIDs_CallsFilter` | Con IDs válidos llama a `FilterByGenres` del repo | Flujo de filtrado por género | Verificar delegación al repositorio |
| `TestGetDetail_ReturnsDetail` | `GetDetail()` retorna el detalle del contenido | Flujo principal de detalle | Verificar respuesta exitosa |
| `TestGetDetail_NotFound` | `GetDetail()` propaga `ErrContentNotFound` | El handler HTTP necesita distinguir 404 de 500 | Garantizar el tipado correcto del error |
| `TestCreate_TrimsFields_AndCreates` | `Create()` elimina espacios en los campos antes de guardar | Datos sucios rompen la unicidad en DB | Verificar el sanitizado de inputs |
| `TestCreate_DuplicateContent_ReturnsError` | `Create()` retorna `ErrDuplicateContent` si ya existe | Regla de negocio: no duplicados | Verificar la detección de duplicados |
| `TestCreate_ExistsCheckError_Propagates` | Error del check de existencia se propaga | No suprimir errores de DB | Garantizar propagación de errores de infraestructura |
| `TestUpdate_TrimsActorAccountID` | `Update()` elimina espacios del `actorAccountID` | El ID del actor se registra en auditoría | Verificar sanitizado del actor |
| `TestDelete_TrimsActorAccountID` | `Delete()` elimina espacios del `actorAccountID` | Misma razón que Update | Verificar sanitizado del actor |
| `TestRate_ReturnsPercentage` | `Rate()` retorna el porcentaje de likes | Funcionalidad central de calificación | Verificar el valor de retorno |
| `TestListSeasonsByContent_TrimsContentID` | `ListSeasonsByContent()` trimea el contentID | IDs con espacios fallarían en DB | Verificar sanitizado del ID |
| `TestCreateEpisodeBatch_TrimsFields` | `CreateEpisodeBatch()` trimea todos los campos del batch | Datos de episodios vienen del admin | Verificar sanitizado masivo |
| `TestListAudit_DefaultLimit` | Límites inválidos (0, -1, >500) se reemplazan por 100 | Prevenir queries sin LIMIT o con LIMIT excesivo | Verificar los guard clauses del límite |
| `TestListAudit_ValidLimit` | Un límite válido (50) se pasa sin modificar | El límite válido no debe alterarse | Verificar el flujo normal |
| `TestListAudit_BoundaryLimit500` | El límite exacto de 500 es aceptado | Caso borde del rango válido | Verificar el valor límite superior |

---

### 4.2 Servicio `streaming` — Go

**Archivos:**
- `internal/domain/playback_test.go`
- `internal/application/service_test.go`

#### `playback_test.go` — tests del dominio

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `TestPlaybackStateConstants` | Que `PlaybackInProgress == "en_progreso"` y `PlaybackFinished == "finalizado"` | Los estados se almacenan en DB y se exponen en la API | Detectar cambios accidentales en constantes de estado |
| `TestDomainErrors_NotNil` | Que `ErrHistoryNotFound`, `ErrTrailerNotFound`, `ErrEpisodeNotFound` no son `nil` | Misma razón que en `catalogo` | Garantizar que los errores están inicializados |
| `TestDomainErrors_Messages` | Mensajes exactos de cada error | Los mensajes se incluyen en respuestas HTTP | Prevenir cambios accidentales en mensajes |
| `TestPlaybackHistory_ZeroValue` | Valor cero de `PlaybackHistory` tiene strings vacíos y `ProgressSeconds == 0` | Comportamiento seguro al construir structs vacíos | Documentar el comportamiento del tipo |
| `TestPlaybackHistory_Fields` | Construcción correcta con todos los campos incluyendo `UpdatedAt` | Tipo central del historial de reproducción | Verificar asignación de campos y tiempo |
| `TestPlaybackHistory_EpisodeIDEmptyForMovies` | `EpisodeID` puede ser vacío (películas no tienen episodio) | Las películas no tienen episodio; el campo es opcional | Verificar que el tipo soporta el caso de películas |

#### `service_test.go` — tests de la capa de aplicación

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `TestUpdateProgress_InProgress` | `UpdateProgress()` retorna `PlaybackInProgress` cuando el repo lo indica | Flujo principal de actualización de progreso | Verificar la delegación al repositorio |
| `TestUpdateProgress_Finished` | `UpdateProgress()` retorna `PlaybackFinished` | Detección de contenido finalizado | Verificar el estado de finalización |
| `TestUpdateProgress_PropagatesError` | Errores del repo se propagan | No suprimir errores de DB | Garantizar propagación |
| `TestGetProgress_ReturnsHistory` | `GetProgress()` retorna el historial encontrado | Flujo principal de consulta de progreso | Verificar la respuesta exitosa |
| `TestGetProgress_NotFound` | `GetProgress()` propaga `ErrHistoryNotFound` | Permite al handler retornar 404 | Garantizar tipado correcto del error |
| `TestGetHistory_ReturnsMultiple` | `GetHistory()` retorna múltiples entradas | El historial puede tener muchas entradas | Verificar que se devuelve el slice completo |
| `TestGetHistory_PropagatesError` | Errores del repo se propagan | No suprimir errores de DB | Garantizar propagación |
| `TestGetTrailerURL_ReturnsSignedURL` | `GetTrailerURL()` retorna la URL firmada del trailer | Flujo principal para reproducir trailers | Verificar que la URL se construye correctamente |
| `TestGetTrailerURL_NotFound` | `GetTrailerURL()` propaga `ErrTrailerNotFound` | El handler necesita retornar 404 | Garantizar tipado del error |
| `TestGetEpisodeVideoURL_ReturnsSignedURL` | `GetEpisodeVideoURL()` retorna la URL firmada del episodio | Flujo principal para reproducir episodios | Verificar la URL de GCS |
| `TestGetEpisodeVideoURL_NotFound` | `GetEpisodeVideoURL()` propaga `ErrEpisodeNotFound` | El handler necesita retornar 404 | Garantizar tipado del error |

---

### 4.3 Servicio `cobros` — TypeScript

**Archivos:**
- `tests/domain.test.ts`
- `tests/helpers.test.ts`

#### `domain.test.ts` — tests del dominio

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `EstadoPago acepta valores validos` | El union type de estados de pago tiene los 4 valores esperados | El compilador no verifica valores en runtime | Documentar los estados válidos del sistema de pagos |
| `TipoOperacion acepta valores validos` | El union type tiene `contratacion` y `modificacion_plan` | Tipos críticos del flujo de cobro | Verificar los tipos de operación disponibles |
| `Transaccion construye correctamente` | Todos los campos del objeto Transaccion se asignan | Tipo central del servicio de cobros | Verificar la integridad del modelo |
| `Transaccion acepta suscripcion_id nulo` | Los campos nullable aceptan `null` | Las transacciones iniciales no tienen suscripcion_id | Verificar campos opcionales nulos |
| `Recibo construye correctamente` | Todos los campos de Recibo se asignan | El recibo es el comprobante de pago | Verificar la integridad del modelo de recibo |
| `Recibo acepta enviado_en nulo` | `enviado_en` puede ser `null` cuando no se ha enviado | El recibo puede existir antes de enviarse | Verificar el estado inicial del recibo |
| `ProcesarPagoInput construye input valido` | El input de pago tiene todos los campos requeridos | Es la entrada principal al flujo de cobro | Verificar la estructura del DTO de entrada |
| `ProcesarPagoInput admite campos opcionales ausentes` | Los campos `nombre_usuario` y `descripcion_plan` son opcionales | Versiones antiguas del cliente no los envían | Verificar compatibilidad hacia atrás |
| `ProcesarPagoResult acepta recibo nulo` | El resultado puede tener `recibo: null` | Cuando el pago es rechazado no se genera recibo | Verificar el caso de pago fallido |

#### `helpers.test.ts` — tests de funciones de mapeo

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `rowToTransaccion mapea todos los campos` | El mapper de filas DB a objeto `Transaccion` | La DB retorna strings; el dominio espera tipos específicos | Verificar la conversión de tipos DB → dominio |
| `rowToTransaccion mapea suscripcion_id nulo` | Los `null` de DB se convierten en `null` del dominio | Los `null` en SQL son distintos a `null` en JS | Verificar manejo de nulls en el mapeo |
| `rowToTransaccion parsea montos como float` | `monto_base` y `monto_local` se parsean con `parseFloat` | PostgreSQL retorna NUMERIC como string | Verificar conversión de montos |
| `rowToRecibo mapea todos los campos` | El mapper de filas DB a `Recibo` | Mismo motivo que `rowToTransaccion` | Verificar el mapeo de recibos |
| `rowToRecibo mapea enviado_en nulo` | `null` en `enviado_en` se mantiene como `null` | Estado inicial del recibo | Verificar null en fecha de envío |

---

### 4.4 Servicio `divisas` — TypeScript

**Archivo:** `tests/domain.test.ts`

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `cacheKey genera formato esperado` | `cacheKey('USD','MXN')` produce `'divisas:tasa:USD:MXN'` | La clave de Redis debe tener formato exacto | Prevenir colisiones de caché por claves mal formadas |
| `cacheKey normaliza a mayusculas` | Inputs en minúscula producen la misma clave que en mayúscula | Los códigos de moneda son case-insensitive | Garantizar que `'usd'` y `'USD'` usan la misma caché |
| `cacheKey mismo par = misma cadena` | Determinismo de la función | La caché solo funciona si la clave es determinista | Verificar idempotencia |
| `cacheKey pares inversos = claves distintas` | `USD:EUR` ≠ `EUR:USD` | Son tasas distintas (inversa no es recíproca exacta) | Evitar usar la tasa incorrecta |
| `cacheKeyMonedas genera clave de listado` | `cacheKeyMonedas('USD')` produce `'divisas:monedas:USD'` | La lista de monedas también se cachea | Verificar la clave de caché de listados |
| `TipoCambio construye correctamente` | El tipo tiene todos sus campos bien tipados | Es el objeto central de la tasa de cambio | Verificar integridad del modelo |
| `ResultadoConversion calcula con tasa` | El monto convertido es `monto * tasa` | La conversión es la operación central del servicio | Verificar la lógica de cálculo |
| `ExchangeApiResponse estructura válida` | El DTO de la API externa tiene la forma esperada | Si la API cambia su estructura, los tests lo detectan | Verificar el contrato con la API de divisas |
| `FuenteTasa acepta los 3 valores` | `cache_redis`, `cache_db`, `api` son los valores válidos | La fuente de la tasa se registra para trazabilidad | Documentar los orígenes posibles de una tasa |
| `convertirMonto precision 6 decimales` | `parseFloat((monto*tasa).toFixed(6))` da el resultado correcto | Los montos financieros requieren precisión | Verificar la lógica de redondeo |
| `convertirMonto monto 0 = 0` | Convertir 0 siempre da 0 | Caso degenerado que no debe romper | Verificar el caso borde del monto cero |

---

### 4.5 Servicio `notificaciones` — TypeScript

**Archivo:** `tests/domain.test.ts`

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `TipoNotificacion acepta los 3 tipos` | `confirmacion_registro`, `recibo`, `alerta_publicacion` son válidos | Los tipos se usan para seleccionar plantillas de email | Documentar los tipos de notificación del sistema |
| `EstadoNotificacion acepta los 3 estados` | `pendiente`, `enviado`, `fallido` son válidos | El estado determina reintentos y alertas | Verificar los estados del ciclo de vida de una notificación |
| `Notificacion completa construye correctamente` | Todos los campos del objeto `Notificacion` son correctos | Es el tipo central del servicio | Verificar la integridad del modelo |
| `Notificacion con estado fallido y error` | `error_mensaje` acepta strings cuando el estado es `fallido` | Los fallos deben registrar el motivo | Verificar el caso de notificación fallida |
| `Notificacion pendiente con cero intentos` | `intentos: 0` es válido para notificaciones nuevas | Las notificaciones nuevas no han tenido intentos | Verificar el estado inicial |
| `ResultadoEnvioNotificacion exitoso` | `enviado: true` y `error_mensaje: null` coexisten | El resultado positivo no tiene mensaje de error | Verificar la estructura del resultado exitoso |
| `ResultadoEnvioNotificacion fallido` | `enviado: false` y `error_mensaje` con texto | El resultado negativo debe tener el motivo | Verificar la estructura del resultado fallido |

---

### 4.6 `api-gateway` — TypeScript

**Archivos:**
- `tests/auth.test.ts`
- `tests/proxy.test.ts`

#### `auth.test.ts` — tests de `isPublic()`

La función `isPublic(method, path)` determina si una ruta puede accederse sin JWT.

| Grupo de tests | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| **Rutas de autenticación** | `POST /auth/login` y `POST /auth/register` son públicos; `GET /auth/login` no | El registro y login deben ser accesibles sin token | Evitar que el gateway bloquee el proceso de autenticación |
| **Rutas internas** | `GET /internal/*` es público; `POST /internal/*` no | Las rutas internas son consultadas por otros microservicios | Verificar que el método HTTP afecta la decisión |
| **Rutas del catálogo** | `GET /catalog`, `GET /catalog/id`, `GET /catalog/search` son públicos; `POST /catalog` no | El catálogo es público para visitantes; la escritura requiere admin | Garantizar acceso público al catálogo de contenido |
| **Rutas de planes** | `GET /plans` y `GET /plans/id` son públicos; `POST /plans` no | Los planes se muestran antes de suscribirse | Verificar acceso público a los planes |
| **Rutas de divisas** | `GET` y `POST` de divisas son públicos; `DELETE` no | La conversión de divisas se necesita antes de pagar | Verificar que la conversión es pública |
| **Rutas de notificaciones** | `POST /notificaciones` es público; `GET` no | Notificaciones son enviadas por otros servicios sin token de usuario | Verificar acceso del servicio interno |
| **OPTIONS (CORS preflight)** | Cualquier ruta con `OPTIONS` es pública | Los navegadores envían preflight sin headers de auth | Garantizar que CORS funciona correctamente |
| **GET /health** | La ruta de health check es pública | Los load balancers hacen health checks sin auth | Verificar que el health check no se bloquea |
| **Rutas privadas** | Cobros, suscripciones, perfiles no son públicos | Estas operaciones requieren autenticación obligatoria | Verificar que el gateway protege las rutas sensibles |

#### `proxy.test.ts` — tests de `rewriteUrl()`

La función `rewriteUrl(originalPath, prefix)` elimina el prefijo del API gateway para redirigir al servicio correcto.

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `elimina prefijo /api/usuario` | `/api/usuario/api/v1/auth/me` → `/api/v1/auth/me` | El servicio destino no conoce el prefijo del gateway | Verificar el rewrite correcto de la URL |
| `elimina prefijo para cada servicio` | catalogo, suscripcion, cobros, divisas, streaming | Cada servicio tiene su prefijo único | Garantizar que todos los servicios reciben la URL correcta |
| `preserva query string` | Los parámetros `?genre=1&page=2` no se pierden | Los parámetros de filtrado son críticos | Verificar que los query params sobreviven el rewrite |
| `preserva IDs en el path` | `/profiles/abc-123` mantiene el ID | Los recursos se identifican por ID en el path | Verificar que los segmentos dinámicos se conservan |
| `resultado empieza con /` | La URL resultante siempre tiene slash inicial | HTTP requiere paths con `/` inicial | Garantizar URLs válidas |
| `prefijo exacto retorna /` | Si se quita todo el path queda `/` | Caso borde de ruta raíz del servicio | Verificar el caso degenerado |
| `ruta profunda` | Path con múltiples segmentos se reescribe correctamente | Rutas anidadas como `/history/profile/content` | Verificar rutas complejas |

---

### 4.7 Servicio `suscripcion` — Python

**Archivos:**
- `tests/test_subscription_service.py` *(existente)*
- `tests/test_domain_and_service.py` *(nuevo)*

#### `test_subscription_service.py` — test original

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_get_plan_quote_returns_converted_amount_on_success` | La cotización de un plan con conversión exitosa retorna monto y tasa correctos | Verificar la integración entre el servicio y el cliente de divisas | Garantizar el flujo de cotización con moneda local |

#### `test_domain_and_service.py` — tests ampliados

**`TestCurrencyMap`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_known_countries_return_currency` | Países conocidos retornan su moneda | Función crítica para la cotización en moneda local | Verificar el mapeo principal |
| `test_case_insensitive` | Mayúsculas/minúsculas no afectan el resultado | Los datos del usuario pueden venir en cualquier case | Verificar la normalización de entrada |
| `test_strips_whitespace` | Espacios alrededor del nombre son ignorados | Los inputs de usuario suelen tener espacios | Verificar el trimming |
| `test_unknown_country_returns_none` | País desconocido retorna `None` | El servicio debe manejar este caso sin crashear | Verificar el valor de retorno para países no soportados |
| `test_usd_countries` | Ecuador, El Salvador, etc. retornan USD | Varios países usan USD como moneda oficial | Verificar los países dolarizados |
| `test_all_keys_are_lowercase` | Todas las claves del diccionario son minúsculas | La normalización de entrada depende de que las claves sean minúsculas | Verificar consistencia del mapa |
| `test_all_values_are_three_chars` | Todos los códigos de moneda tienen 3 caracteres | ISO 4217 exige códigos de 3 letras | Verificar integridad del mapa |

**`TestInMemoryPlanRepository`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_create_and_get_by_id` | Se puede crear un plan y recuperarlo por ID | Operación fundamental del repositorio | Verificar el ciclo crear-leer |
| `test_get_by_id_missing_returns_none` | ID inexistente retorna `None` | El servicio debe manejar planes no encontrados | Verificar el caso de ausencia |
| `test_list_active_returns_only_active` | Solo los planes activos aparecen en el listado | Los usuarios no deben ver planes dados de baja | Verificar el filtro de activos |

**`TestInMemorySubscriptionRepository`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_get_active_by_account_id` | Retorna la suscripción activa de la cuenta | Consulta más frecuente del servicio | Verificar el filtro por cuenta y estado |
| `test_get_active_by_account_id_inactive` | No retorna suscripciones canceladas | Las canceladas no deben mostrarse como activas | Verificar el filtro de estado |
| `test_list_active_account_ids` | Retorna IDs únicos de cuentas con suscripción activa | Usado por el servicio de cobros | Verificar el listado de cuentas activas |
| `test_list_active_account_ids_deduplicates` | Cuentas con múltiples suscripciones activas aparecen una sola vez | Usar sets para deduplicar | Verificar deduplicación |

**`TestSubscriptionServiceCreatePlan`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_create_plan_success` | Crear un plan retorna el plan con `activo=True` | Flujo principal de creación de planes | Verificar el comportamiento por defecto |
| `test_create_plan_appears_in_list` | El plan creado aparece en `list_plans()` | Consistencia entre creación y listado | Verificar el ciclo crear-listar |
| `test_get_plan_not_found_raises` | `get_plan()` lanza `NotFoundError` para IDs inexistentes | Permite al handler retornar 404 | Verificar el manejo de planes no existentes |

**`TestSubscriptionServicePlanQuote`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_quote_with_conversion` | Cotización con conversión exitosa | Flujo principal de cotización | Verificar monto, moneda y tasa en la respuesta |
| `test_quote_same_currency_no_conversion` | País con misma moneda que el plan no necesita convertir | Ecuador usa USD igual que el plan base | Verificar el caso de moneda igual |
| `test_quote_unknown_country` | País desconocido retorna `conversion_disponible=False` | No todos los países están en el mapa | Verificar respuesta degradada |
| `test_quote_divisas_client_fails` | Si el cliente de divisas falla, la cotización retorna `conversion_disponible=False` | El servicio de divisas puede no estar disponible | Verificar resiliencia del servicio |
| `test_quote_plan_not_found_raises` | Cotización de plan inexistente lanza `NotFoundError` | No se puede cotizar lo que no existe | Verificar la validación previa |

**`TestSubscriptionServiceSubscriptions`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_create_subscription_success` | Crear suscripción retorna objeto con `estado='activa'` | Flujo principal de suscripción | Verificar el comportamiento post-pago |
| `test_create_subscription_plan_not_found_raises` | Plan inexistente lanza `NotFoundError` | No se puede suscribir a un plan que no existe | Verificar la validación del plan |
| `test_create_duplicate_subscription_raises_conflict` | Segunda suscripción activa lanza `ConflictError` | Un usuario solo puede tener una suscripción activa | Verificar la regla de negocio de unicidad |
| `test_get_subscription_status_with_active` | Estado retorna `tiene_suscripcion=True` cuando hay activa | Usado para mostrar el estado en la UI | Verificar la respuesta con suscripción |
| `test_get_subscription_status_without` | Estado retorna `tiene_suscripcion=False` cuando no hay | Usuario sin suscripción | Verificar la respuesta sin suscripción |
| `test_cancel_subscription` | Cancelar una suscripción la marca como inactiva | Flujo de cancelación de suscripción | Verificar el cambio de estado |
| `test_cancel_nonexistent_subscription_raises` | Cancelar sin suscripción activa lanza `NotFoundError` | No se puede cancelar lo que no existe | Verificar la validación previa |
| `test_change_plan` | Cambiar plan actualiza el `plan_id` de la suscripción | Flujo de upgrade/downgrade | Verificar el cambio de plan |
| `test_change_plan_no_subscription_raises` | Cambiar plan sin suscripción activa lanza `NotFoundError` | No se puede cambiar lo que no existe | Verificar la validación previa |
| `test_change_plan_to_nonexistent_raises` | Cambiar a plan inexistente lanza `NotFoundError` | El plan destino debe existir | Verificar la validación del plan destino |

---

### 4.8 Servicio `usuario` — Python

**Archivos:**
- `tests/test_auth_api.py` *(existente — integración con FastAPI test client)*
- `tests/test_domain.py` *(nuevo — unitarios puros)*

#### `test_domain.py` — tests unitarios puros

**`TestDomainErrors`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_conflict_error_is_domain_error` | `ConflictError` hereda de `DomainError` | La jerarquía de herencia define cómo los handlers capturan errores | Verificar la jerarquía de errores |
| `test_authentication_error_is_domain_error` | `AuthenticationError` hereda de `DomainError` | Mismo motivo | Verificar herencia |
| `test_not_found_error_is_domain_error` | `NotFoundError` hereda de `DomainError` | Mismo motivo | Verificar herencia |
| `test_errors_are_exceptions` | Los errores de dominio se pueden lanzar con `raise` | Deben ser instancias de `Exception` | Verificar que son excepciones reales |

**`TestPasswordHasher`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_hash_returns_string` | `hash()` retorna un string | El hash se almacena en DB como VARCHAR | Verificar el tipo de retorno |
| `test_hash_has_pbkdf2_prefix` | El hash empieza con `pbkdf2_sha256$` | El prefijo identifica el algoritmo al verificar | Verificar el formato del hash |
| `test_hash_has_four_parts` | El hash tiene 4 partes separadas por `$` | El parser de verificación depende de esta estructura | Verificar la estructura del hash |
| `test_verify_correct_password` | La contraseña original verifica correctamente | Flujo principal de login | Verificar la verificación exitosa |
| `test_verify_wrong_password` | Una contraseña diferente no verifica | Seguridad básica del sistema | Verificar que contraseñas incorrectas fallan |
| `test_hash_is_different_each_time` | Dos hashes del mismo password son distintos | El salt aleatorio garantiza unicidad | Verificar que el salt funciona |
| `test_verify_empty_password` | Password vacío se puede hashear y verificar | Caso borde — la validación ocurre en la capa de schemas | Verificar robustez del hasher |

**`TestJwtService`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_encode_returns_string` | `encode()` retorna un string JWT no vacío | El token se envía al cliente | Verificar el tipo y existencia del token |
| `test_decode_valid_token` | `decode()` extrae correctamente el payload | Flujo principal de validación de sesión | Verificar que el payload se recupera |
| `test_decode_expired_token_raises` | Token expirado lanza `AuthenticationError` | Los tokens vencidos deben ser rechazados | Verificar la expiración de tokens |
| `test_decode_invalid_token_raises` | String inválido lanza `AuthenticationError` | El gateway recibe inputs arbitrarios | Verificar la robustez ante tokens malformados |
| `test_decode_tampered_token_raises` | Token con firma alterada lanza `AuthenticationError` | Protección contra manipulación de tokens | Verificar la verificación de firma |
| `test_wrong_secret_raises` | Token firmado con otro secret no verifica | Protección contra tokens de otros entornos | Verificar el aislamiento por secret |

**`TestInMemoryProfileRepository`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_only_one_principal_after_create` | Crear un perfil principal desactiva el anterior | Solo puede haber un perfil principal por cuenta | Verificar la regla de unicidad del perfil principal |
| `test_get_by_name_case_insensitive` | La búsqueda por nombre ignora mayúsculas | Los nombres de perfil pueden tener cualquier case | Verificar la normalización en búsqueda |
| `test_delete_promotes_next_profile_if_principal` | Eliminar el perfil principal promueve al siguiente | La cuenta siempre debe tener un perfil principal | Verificar la promoción automática |
| `test_delete_non_principal_does_not_promote` | Eliminar un no-principal no cambia el principal | No debe haber efectos secundarios innecesarios | Verificar que la promoción es condicional |
| `test_delete_missing_profile_is_noop` | Eliminar un ID inexistente no lanza excepción | La idempotencia de delete es una buena práctica | Verificar comportamiento seguro |

**`TestAuthServiceInMemory`**

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `test_register_creates_account_and_returns_token` | El registro retorna un JWT válido | Flujo principal de onboarding | Verificar el resultado del registro |
| `test_register_duplicate_email_raises_conflict` | Segundo registro con el mismo email lanza `ConflictError` | Dos usuarios no pueden compartir email | Verificar la unicidad del email |
| `test_login_valid_credentials` | Login con credenciales correctas retorna token | Flujo principal de autenticación | Verificar el login exitoso |
| `test_login_wrong_password_raises` | Contraseña incorrecta lanza `AuthenticationError` | Seguridad del sistema | Verificar el rechazo de credenciales incorrectas |
| `test_login_unknown_email_raises` | Email inexistente lanza `AuthenticationError` | No revelar si el email existe o no | Verificar el rechazo de emails desconocidos |
| `test_get_current_account_from_token` | El token del registro permite recuperar la cuenta | El gateway usa esta función en cada request | Verificar la validación de sesión activa |
| `test_logout_invalidates_session` | Después del logout el token ya no es válido | El logout debe invalidar la sesión en DB | Verificar la revocación del token |
| `test_create_profile` | Se puede crear un perfil secundario | Los usuarios pueden tener hasta 5 perfiles | Verificar la creación de perfiles |
| `test_create_duplicate_profile_name_raises` | Dos perfiles con el mismo nombre en la misma cuenta lanzan `ConflictError` | Los perfiles de una cuenta deben tener nombres únicos | Verificar la unicidad del nombre de perfil |
| `test_delete_principal_profile_raises` | Eliminar el perfil principal lanza `ConflictError` | El perfil principal no puede eliminarse directamente | Verificar la protección del perfil principal |
| `test_change_password_success` | Cambiar contraseña con contraseña actual correcta | Flujo de cambio de contraseña | Verificar el cambio exitoso |
| `test_change_password_wrong_current_raises` | Contraseña actual incorrecta lanza `AuthenticationError` | Se debe verificar la identidad antes de cambiar | Verificar la validación de contraseña actual |
| `test_change_password_same_raises` | Nueva contraseña igual a la actual lanza `ConflictError` | Cambiar a la misma contraseña no aporta seguridad | Verificar la regla de contraseña diferente |

---

### 4.3 (ampliado) Servicio `cobros` — tests de servicio con mocks

**Archivo:** `tests/service.test.ts`

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `obtenerTransaccion retorna la transaccion cuando existe` | El mapper de DB→dominio funciona correctamente | La función se usa en cada consulta de historial | Verificar que los campos se asignan bien incluyendo fechas |
| `obtenerTransaccion lanza error cuando no existe` | `rowCount === 0` lanza `Error` con mensaje | El handler HTTP necesita retornar 404 | Verificar el guard clause |
| `obtenerTransaccion mapea suscripcion_id nulo` | Campos nullables de DB quedan como `null` en dominio | PostgreSQL devuelve `null` para campos vacíos | Verificar manejo de nulls |
| `listarTransacciones retorna lista` | Se devuelven múltiples transacciones mapeadas | El historial puede tener muchas entradas | Verificar el mapeo en lote |
| `listarTransacciones retorna lista vacia` | Sin transacciones devuelve `[]` | Estado inicial de una cuenta nueva | Verificar caso vacío |
| `obtenerRecibo retorna el recibo` | El recibo se mapea correctamente con `enviado_en` como `Date` | El recibo es el comprobante de pago | Verificar el mapeo del recibo |
| `obtenerRecibo lanza error cuando no existe` | `rowCount === 0` lanza `Error` | Handler HTTP necesita 404 | Verificar el guard clause del recibo |
| `procesarPago exitoso con recibo y notificacion` | Flujo completo: conversión → SP → transacción → recibo → notificación → UPDATE | Camino principal del servicio de cobros | Verificar la secuencia completa de queries |
| `procesarPago cuando notificacion falla` | Si `enviarReciboNotificacion` rechaza, el recibo queda `enviado=false` | El pago no debe fallar si el correo falla | Verificar la resiliencia del flujo |
| `procesarPago hace rollback cuando sp falla` | Si el SP lanza error, se ejecuta `ROLLBACK` y se relanza | Consistencia transaccional de la DB | Verificar el manejo de errores con rollback |
| `procesarPago sin recibo cuando estado es rechazado` | Si la transacción no es `aprobado`, no se busca recibo | Los pagos rechazados no generan recibo | Verificar el branching por estado |
| `procesarPago lanza error cuando transaccion no se encuentra` | Si la SELECT tras el SP devuelve 0 filas | Caso de inconsistencia de DB | Verificar el guard clause post-SP |

### 4.5 (ampliado) Servicio `notificaciones` — tests de servicio con mocks

**Archivo:** `tests/service.test.ts`

| Test | Qué prueba | Por qué existe | Para qué sirve |
|---|---|---|---|
| `enviarConfirmacionRegistro envia y retorna enviado=true` | Flujo principal: genera HTML → sendMail → registra en DB | Flujo de onboarding | Verificar el asunto, el to, y el contenido del HTML |
| `enviarConfirmacionRegistro retorna enviado=false cuando sendMail falla` | Captura el error de SMTP y registra como `fallido` | SMTP puede no estar disponible | Verificar la resiliencia del envío |
| `enviarConfirmacionRegistro incluye nombre en el HTML` | El nombre del usuario aparece en el cuerpo del correo | Personalización del correo | Verificar la interpolación del template |
| `enviarConfirmacionRegistro registra con tipo confirmacion_registro` | El tipo correcto se pasa al SP de registro | El tipo determina la categoría del historial | Verificar el argumento al SP |
| `enviarRecibo envia correctamente` | Plan, transacción, monto y moneda aparecen en el HTML | El recibo es el documento principal de pago | Verificar el template del recibo |
| `enviarRecibo retorna enviado=false cuando correo está vacío` | Correo con solo espacios se detecta como vacío | Cuentas sin correo no deben intentar envío | Verificar la validación del correo |
| `enviarRecibo retorna enviado=false cuando sendMail falla` | Error SMTP → estado `fallido` | Resiliencia del envío | Verificar el manejo de error |
| `enviarRecibo el html contiene el monto formateado` | `monto.toFixed(2)` y la moneda aparecen en el HTML | Los montos financieros requieren precisión | Verificar el formato del monto |
| `enviarAlertaPublicacion envia para pelicula` | El template de película usa `Película` y el asunto incluye el título | Cada tipo de contenido tiene su template | Verificar el branching película/serie |
| `enviarAlertaPublicacion envia para serie` | El template de serie usa `Serie` | Mismo motivo | Verificar el otro branch |
| `enviarAlertaPublicacion retorna enviado=false cuando sendMail falla` | Resiliencia del envío masivo | Las alertas son enviadas a muchos suscriptores | Verificar el manejo de error |
| `enviarAlertaPublicacion usa el primer correo para registro` | `primerCorreo = correos_destino[0]` se pasa al SP | El SP necesita un correo de referencia | Verificar el argumento de registro |
| `enviarAlertaPublicacion maneja lista vacia sin excepcion` | Lista vacía usa `'multiple'` como fallback | Las alertas pueden enviarse con 0 destinatarios | Verificar el caso borde |

### 4.7 (ampliado) Servicio `suscripcion`

Correcciones aplicadas respecto a la sesión anterior — todos los tests ahora usan la API real del `SubscriptionService`:

| Método anterior (incorrecto) | Método real correcto |
|---|---|
| `svc.list_plans()` | `svc.list_active_plans()` |
| `svc.get_plan(id)` | `plan_repo.get_by_id(id)` (no existe en el servicio) |
| `svc.get_subscription_status(account_id)` | `svc.get_subscription_status_by_account(account_id)` |
| `svc.cancel_subscription(account_id)` | `svc.cancel_subscription(subscription_id)` |
| `svc.change_subscription_plan(account_id, req)` | `svc.change_subscription_plan(subscription_id, req)` |
| `result.cuenta_ids` (objeto) | `result` es directamente `list[str]` |

Tests nuevos en `TestSubscriptionServiceSubscriptions`:

| Test | Qué prueba |
|---|---|
| `test_cancel_already_cancelled_raises_conflict` | Cancelar dos veces lanza `ConflictError` |
| `test_change_plan_same_plan_raises_conflict` | Cambiar al mismo plan lanza `ConflictError` |
| `test_get_subscription_by_id` | Recuperar por ID devuelve la suscripción |
| `test_get_subscription_by_id_not_found_raises` | ID inexistente lanza `NotFoundError` |

### 4.8 (ampliado) Servicio `usuario`

Tests nuevos en `TestAuthServiceInMemory` cubriendo métodos que faltaban:

| Test | Qué prueba |
|---|---|
| `test_validate_token_returns_account_and_session_id` | `validate_token()` retorna `(Account, session_id)` |
| `test_validate_token_after_logout_raises` | Después de logout el token ya no es válido en `validate_token` |
| `test_get_account_by_id` | Buscar cuenta por ID retorna la cuenta correcta |
| `test_get_account_by_id_not_found_raises` | ID inexistente lanza `NotFoundError` |
| `test_get_account_by_email` | Buscar cuenta por email retorna la cuenta correcta |
| `test_get_account_by_email_not_found_raises` | Email inexistente lanza `NotFoundError` |
| `test_update_current_account` | Actualizar nombre y país modifica la cuenta |
| `test_list_profiles` | Registrar + crear perfil → `list_profiles` devuelve 2 perfiles |
| `test_update_profile_nombre` | Actualizar nombre de perfil persiste el cambio |
| `test_update_profile_not_found_raises` | Perfil inexistente lanza `NotFoundError` |
| `test_delete_only_profile_raises` | Eliminar el último perfil lanza `ConflictError` (el principal) |
| `test_sync_profiles_availability` | Con 3 perfiles y max=1 solo queda 1 activo |
| `test_sync_profiles_no_profiles_raises` | Sin perfiles lanza `NotFoundError` |

---

## 5. Resumen de comandos — todos los servicios

### Go

```bash
# catalogo
cd backend/services/catalogo
make test

# catalogo — reporte HTML interactivo
go test -coverprofile=coverage.out ./internal/application ./internal/domain
go tool cover -html=coverage.out -o coverage.html

# streaming
cd backend/services/streaming
make test
```

### TypeScript (pnpm)

```bash
# cobros  — 3 suites: domain.test.ts, helpers.test.ts, service.test.ts
cd backend/services/cobros && pnpm install && pnpm test

# divisas — 2 suites: domain.test.ts, service.test.ts
cd backend/services/divisas && pnpm install && pnpm test

# notificaciones — 2 suites: domain.test.ts, service.test.ts
cd backend/services/notificaciones && pnpm install && pnpm test

# api-gateway — 2 suites: auth.test.ts, proxy.test.ts
cd backend/api-gateway && pnpm install && pnpm test
```

> El reporte de cobertura queda en `coverage/lcov-report/index.html` dentro de cada servicio.

### Python (pytest + pytest-cov)

```bash
# suscripcion — 4 archivos
cd backend/services/suscripcion
pip install -r requirements.txt
pytest
# Falla automáticamente si la cobertura baja del 75%

# usuario — 2 archivos: test_auth_api.py, test_domain.py
cd backend/services/usuario
pip install -r requirements.txt
pytest

# Reporte HTML (cualquier servicio Python)
pytest --cov-report=html
# Abre htmlcov/index.html en el navegador
```

### Tabla resumen — conteo de tests por servicio

| Servicio | Lenguaje | Tests aprox. | Archivos de test |
|---|---|---|---|
| `catalogo` | Go | 30 | `content_test.go`, `service_test.go` |
| `streaming` | Go | 17 | `playback_test.go`, `service_test.go` |
| `cobros` | TypeScript | 27 | `domain.test.ts`, `helpers.test.ts`, `service.test.ts` |
| `divisas` | TypeScript | 25 | `domain.test.ts`, `service.test.ts` |
| `notificaciones` | TypeScript | 24 | `domain.test.ts`, `service.test.ts` |
| `api-gateway` | TypeScript | 41 | `auth.test.ts`, `proxy.test.ts` |
| `suscripcion` | Python | 82 | `test_domain_and_service.py`, `test_infrastructure.py`, `test_subscription_api.py`, `test_subscription_service.py` |
| `usuario` | Python | 73 | `test_auth_api.py`, `test_domain.py` |
| **Total** | | **319** | |

---

## 6. Resultado de ejecución local — 2026-06-17

Las pruebas fueron ejecutadas servicio por servicio. Todas las suites terminaron en estado **passed** después de aislar los tests Python de red/gRPC, ejecutar Jest en modo serial para reducir consumo de memoria y limitar la cobertura unitaria a dominio/aplicación/código puro.

| Servicio | Comando | Resultado | Cobertura reportada |
|---|---|---:|---:|
| `catalogo` | `make test` | 30 passed | `internal/application`: 100% |
| `streaming` | `make test` | 17 passed | `internal/application`: 100% |
| `cobros` | `pnpm test` | 27 passed | 100% statements / 90.90% branches |
| `divisas` | `pnpm test` | 25 passed | 100% |
| `notificaciones` | `pnpm test` | 24 passed | 96.77% statements / 78.26% branches |
| `api-gateway` | `pnpm test` | 41 passed | 100% statements / 91.66% branches |
| `suscripcion` | `pytest` | 82 passed | 76.15% |
| `usuario` | `pytest` | 73 passed | 83.73% |

### Observaciones importantes

- La meta de cobertura unitaria ≥ 75% queda reforzada con `coverageThreshold` en TypeScript y `--cov-fail-under=75` en Python.
- En Go se usa `make test` para medir paquetes unitarios. El comando crudo `go test -cover ./...` incluye `cmd`, infraestructura, handlers HTTP/gRPC y código generado, por lo que no representa cobertura unitaria.
- En TypeScript, `collectCoverageFrom` excluye `server.ts`, infraestructura real y handlers gRPC; esas piezas corresponden a pruebas de integración/e2e porque abren red, BD o transporte gRPC.
- Para validar archivos Python uno por uno sin que falle el umbral global de cobertura, usar `pytest tests/<archivo>.py --no-cov`; luego correr `pytest` completo para validar cobertura.
- Para reducir RAM, los scripts TypeScript ejecutan Jest con `--runInBand`, evitando workers paralelos por servicio.
