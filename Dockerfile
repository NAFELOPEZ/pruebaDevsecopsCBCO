# ==============================================================
# Dockerfile — Multi-stage build con hardening de seguridad
#
# ETAPA 1 (deps):   Instala dependencias de producción
# ETAPA 2 (runtime): Imagen final minimal con usuario no-root
#
# Decisiones de seguridad:
#   - node:20-alpine: imagen base minimal (~50 MB vs ~900 MB full)
#   - npm ci --omit=dev: sólo dependencias de producción
#   - Usuario appuser (UID 1001): proceso nunca corre como root
#   - HEALTHCHECK nativo: Docker y orquestadores detectan estado real
#   - Sin shell innecesario: CMD en forma exec array (no /bin/sh -c)
# ==============================================================

# ── Etapa 1: instalar dependencias ────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar sólo manifests primero → caching óptimo de layers
# Si sólo cambia el código fuente, npm ci NO se re-ejecuta
COPY app/package*.json ./

# --omit=dev: sólo dependencias de producción
# --ignore-scripts: previene ejecución de postinstall scripts maliciosos
RUN npm ci --omit=dev --ignore-scripts

# ── Etapa 2: imagen de runtime ────────────────────────────────
FROM node:20-alpine AS runtime

# Crear grupo y usuario no-root explícito
# UID/GID 1001 debe coincidir con runAsUser en Helm/K8s
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copiar dependencias desde la etapa deps (con ownership correcto)
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Copiar código fuente (con ownership correcto)
COPY --chown=appuser:appgroup app/src ./src

# Documentar el puerto — no abre el puerto, sólo documenta
EXPOSE 3000

# HEALTHCHECK nativo de Docker
# --interval=15s  : verificar cada 15 segundos
# --timeout=3s    : timeout máximo por check
# --start-period=10s: esperar 10s antes del primer check (startup time)
# --retries=3     : 3 fallos consecutivos → estado unhealthy
# Usa node directamente (no curl) → sin dependencia de herramientas extra
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Cambiar a usuario no-root ANTES del CMD
# A partir de aquí, el proceso Node.js corre con UID 1001
USER appuser

# CMD en forma exec array (no shell): el proceso Node es PID 1
# Permite recibir señales SIGTERM correctamente → graceful shutdown
CMD ["node", "src/index.js"]
