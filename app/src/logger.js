/**
 * logger.js — Logger estructurado con niveles configurables
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  NIVELES (de menor a mayor severidad)                       │
 * │  trace → debug → info → warn → error → fatal               │
 * │  Configurar con: LOG_LEVEL=debug node src/index.js          │
 * └─────────────────────────────────────────────────────────────┘
 *
 * MODOS DE SALIDA:
 *   Production (NODE_ENV=production):
 *     → JSON estructurado en stdout, una línea por entrada.
 *       Compatible con Fluent Bit (parser: json), Loki,
 *       Datadog, CloudWatch Logs y cualquier agregador de logs.
 *
 *   Development (NODE_ENV=development o sin definir):
 *     → Texto legible con colores ANSI para la terminal.
 *       Facilita el debugging local sin necesidad de herramientas.
 *
 * CHILD LOGGERS:
 *   Permiten agregar contexto fijo a todas las entradas de un
 *   subsistema (ej: requestId, userId) sin repetirlo manualmente.
 *
 *   const reqLogger = logger.child({ requestId: 'abc-123' });
 *   reqLogger.info('Processing request');
 *   // → { "requestId": "abc-123", "message": "Processing request", ... }
 *
 * VARIABLES DE ENTORNO:
 *   LOG_LEVEL   — nivel mínimo: trace|debug|info|warn|error|fatal (default: info)
 *   NODE_ENV    — production → JSON; cualquier otro → colores (default: development)
 *   APP_NAME    — nombre del servicio en las entradas de log (default: demo-app)
 */

"use strict";

// ── Constantes ────────────────────────────────────────────────

const SERVICE_NAME    = process.env.APP_NAME           || "demo-app";
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const IS_PRODUCTION   = process.env.NODE_ENV === "production";
const RAW_LEVEL       = (process.env.LOG_LEVEL || "info").toLowerCase();

/**
 * Mapa numérico de niveles.
 * Las entradas con valor inferior al nivel activo se descartan.
 */
const LEVEL_VALUES = {
  trace: 0,
  debug: 1,
  info:  2,
  warn:  3,
  error: 4,
  fatal: 5,
};

// Validar que LOG_LEVEL tenga un valor reconocido
const CURRENT_LEVEL_VALUE = LEVEL_VALUES[RAW_LEVEL] ?? LEVEL_VALUES.info;

// ── Colores ANSI para modo desarrollo ─────────────────────────
const COLORS = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  trace:  "\x1b[35m",   // magenta
  debug:  "\x1b[36m",   // cyan
  info:   "\x1b[32m",   // green
  warn:   "\x1b[33m",   // yellow
  error:  "\x1b[31m",   // red
  fatal:  "\x1b[41m",   // red background
};

// ── Funciones internas ────────────────────────────────────────

/**
 * Serializa un objeto meta a string, omitiendo claves undefined/null.
 * Maneja errores de referencia circular con un fallback seguro.
 */
function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return JSON.stringify({ _serializationError: "circular reference or non-serializable value" });
  }
}

/**
 * Formatea una entrada en modo producción (JSON por línea).
 * Siempre escribe a stdout para que los agentes de logs la capturen.
 */
function writeJson(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    ...meta,
  };
  process.stdout.write(safeStringify(entry) + "\n");
}

/**
 * Formatea una entrada en modo desarrollo (texto con colores).
 * error/fatal van a stderr; el resto a stdout.
 */
function writePretty(level, message, meta) {
  const color   = COLORS[level] || COLORS.reset;
  const time    = new Date().toISOString().replace("T", " ").replace("Z", "");
  const pad     = level.toUpperCase().padEnd(5);
  const metaStr = Object.keys(meta).length
    ? ` ${COLORS.dim}${safeStringify(meta)}${COLORS.reset}`
    : "";

  const line = `${COLORS.dim}${time}${COLORS.reset} ${color}${COLORS.bold}${pad}${COLORS.reset} ${message}${metaStr}`;

  if (level === "error" || level === "fatal") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

/**
 * Función central de escritura. Filtra por nivel activo.
 * @param {string} level    - Nivel del mensaje
 * @param {string} message  - Texto principal del log
 * @param {object} meta     - Campos adicionales (contexto del evento)
 */
function write(level, message, meta = {}) {
  const levelValue = LEVEL_VALUES[level] ?? LEVEL_VALUES.info;
  if (levelValue < CURRENT_LEVEL_VALUE) return;

  if (IS_PRODUCTION) {
    writeJson(level, message, meta);
  } else {
    writePretty(level, message, meta);
  }
}

// ── API pública del logger raíz ───────────────────────────────

const logger = {
  /**
   * trace — Diagnóstico muy detallado.
   * Usar para trazas de ejecución paso a paso.
   * Solo visible cuando LOG_LEVEL=trace.
   */
  trace: (message, meta) => write("trace", message, meta),

  /**
   * debug — Información de debugging.
   * Útil en desarrollo para inspeccionar variables y flujo.
   * Solo visible cuando LOG_LEVEL=trace o debug.
   */
  debug: (message, meta) => write("debug", message, meta),

  /**
   * info — Eventos normales del sistema.
   * Arranque del servidor, requests completados, etc.
   */
  info: (message, meta) => write("info", message, meta),

  /**
   * warn — Situaciones inusuales pero no críticas.
   * Degradación de servicio, configuración faltante, retries, etc.
   */
  warn: (message, meta) => write("warn", message, meta),

  /**
   * error — Errores recuperables.
   * Excepción capturada, request fallido, timeout, etc.
   */
  error: (message, meta) => write("error", message, meta),

  /**
   * fatal — Errores irrecuperables que detienen el proceso.
   * Fallo de conexión a DB, error de configuración crítica, etc.
   * Después de llamar a fatal, el proceso debería terminar.
   */
  fatal: (message, meta) => write("fatal", message, meta),

  /**
   * child — Crea un logger derivado con contexto fijo.
   *
   * Todo lo que se loggee con el child incluye automáticamente
   * los campos del contexto sin necesidad de repetirlos.
   *
   * Ejemplo:
   *   const reqLog = logger.child({ requestId: 'abc', userId: 42 });
   *   reqLog.info('Request received');
   *   // → { "requestId": "abc", "userId": 42, "message": "Request received", ... }
   *
   * @param {object} context - Campos fijos a incluir en todas las entradas
   * @returns {object} Logger hijo con los mismos métodos que el padre
   */
  child(context = {}) {
    return {
      trace: (message, meta) => write("trace", message, { ...context, ...meta }),
      debug: (message, meta) => write("debug", message, { ...context, ...meta }),
      info:  (message, meta) => write("info",  message, { ...context, ...meta }),
      warn:  (message, meta) => write("warn",  message, { ...context, ...meta }),
      error: (message, meta) => write("error", message, { ...context, ...meta }),
      fatal: (message, meta) => write("fatal", message, { ...context, ...meta }),
      // Un child puede generar sub-childs con contexto adicional
      child: (subContext = {}) => logger.child({ ...context, ...subContext }),
    };
  },

  /**
   * level — Devuelve el nivel activo actual.
   * Útil para diagnóstico: logger.level → "info"
   */
  get level() {
    return RAW_LEVEL;
  },
};

module.exports = logger;
