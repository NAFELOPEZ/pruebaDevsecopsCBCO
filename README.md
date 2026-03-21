# pruebaDevsecopsCBCO — Pipeline DevSecOps con GitHub Actions, Docker y Kubernetes

> Proyecto de demostración y prueba técnica que implementa un pipeline **CI/CD completo con seguridad integrada (DevSecOps)** usando GitHub Actions, Docker, Helm y ArgoCD para despliegue en Kubernetes.

---

## Tabla de Contenidos

0. [**⚡ Guía de Ejecución Rápida**](#0-guía-de-ejecución-rápida) ← **Empieza aquí**
1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Arquitectura General](#2-arquitectura-general)
3. [Stack Tecnológico y Compatibilidad de Versiones](#3-stack-tecnológico-y-compatibilidad-de-versiones)
4. [Estructura del Repositorio](#4-estructura-del-repositorio)
5. [Pipeline DevSecOps — Explicación Detallada](#5-pipeline-devsecops--explicación-detallada)
6. [Herramientas de Revisión de Logs](#6-herramientas-de-revisión-de-logs)
7. [Controles de Seguridad Implementados](#7-controles-de-seguridad-implementados)
8. [Prerequisitos — Qué necesitas antes de ejecutar](#8-prerequisitos--qué-necesitas-antes-de-ejecutar)
9. [Setup Paso a Paso](#9-setup-paso-a-paso)
10. [Cómo correr la app localmente](#10-cómo-correr-la-app-localmente)
11. [Cómo correr con Docker](#11-cómo-correr-con-docker)
12. [Despliegue en Kubernetes con Helm](#12-despliegue-en-kubernetes-con-helm)
13. [Configuración de ArgoCD (GitOps)](#13-configuración-de-argocd-gitops)
14. [Configuración de GitHub Actions](#14-configuración-de-github-actions)
15. [Demos para Clientes](#15-demos-para-clientes)
16. [Variables de Entorno y Log Levels](#16-variables-de-entorno-y-log-levels)
17. [Troubleshooting](#17-troubleshooting)
18. [Mantenimiento y Operaciones](#18-mantenimiento-y-operaciones)

---

## 0. Guía de Ejecución Rápida

> Esta sección es el punto de entrada para ejecutar el proyecto completo desde cero.
> Sigue las partes **en orden**: primero verifica que todo funciona en local, luego lanza el pipeline en GitHub.

### Convenciones de terminal en este README

> Los comandos se presentan en **tres variantes** cuando la sintaxis difiere entre sistemas operativos.
> Si el bloque dice solo `bash`, ese comando funciona igual en PowerShell y CMD (ej: `git`, `npm`, `kubectl`, `helm`, `argocd`, `gh`).
>
> | Terminal | Continuación de línea | Variables de entorno | Directorio actual |
> |----------|-----------------------|----------------------|-------------------|
> | **bash / Linux / macOS / WSL** | `\` al final de línea | `KEY=value comando` | `$(pwd)` |
> | **PowerShell (Windows)** | `` ` `` al final de línea | `$env:KEY="value"; comando` | `${PWD}` |
> | **CMD (Windows)** | No aplica — usar una sola línea | `set KEY=value && comando` | `%cd%` |

---

### Herramientas requeridas — verificación previa

Antes de empezar, confirma que tienes todo instalado ejecutando. **Estos comandos son iguales en bash, PowerShell y CMD:**

```bash
node --version       # debe mostrar v20.x.x o superior
npm --version        # debe mostrar 9.x o superior
docker --version     # debe mostrar Docker version 24+
git --version        # cualquier versión reciente
gh --version         # debe mostrar gh version 2.x
helm version --short # debe mostrar v3.x.x
```

> **Nota Windows**: si `gh` no se reconoce después de instalarlo con `winget`, cierra y vuelve a abrir VS Code para que tome el nuevo PATH.

Si alguno falla, revisa la [Sección 8 — Prerequisitos](#8-prerequisitos--qué-necesitas-antes-de-ejecutar).

---

### PARTE 1 — Ejecución Local (sin GitHub, sin Docker Hub)

Sigue estos pasos en orden. Cada uno incluye un comando de verificación.

#### L1 — Clonar e instalar dependencias

> `git clone`, `cd` y `npm ci` funcionan igual en bash, PowerShell y CMD.

```bash
git clone https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git
cd pruebaDevsecopsCBCO

cd app
npm ci
```

**Verificar:** debe mostrar `added X packages` sin errores.

---

#### L2 — Correr los tests

> `npm test` es igual en bash, PowerShell y CMD.

```bash
# Desde la carpeta app/
npm test
```

**Resultado esperado:**
```
PASS test/app.test.js
  Demo App
    ✓ GET /health should return ok
    ✓ GET /health?full=true should return full mode
    ✓ GET / should return message
    ✓ startServer should start on a free port and be closable

Tests: 4 passed, 4 total
```

Si algún test falla, **no continúes** — revisa [Troubleshooting](#17-troubleshooting).

---

#### L3 — Correr lint

```bash
npm run lint
```

**Resultado esperado:** ningún output (sin errores). Si hay errores de lint, el pipeline de CI también fallará.

---

#### L4 — Levantar la aplicación en local

**Bash / macOS / Linux:**
```bash
# Modo desarrollo (logs con colores en terminal)
NODE_ENV=development node src/index.js
```

**PowerShell (Windows):**
```powershell
$env:NODE_ENV="development"; node src/index.js
```

**Command Prompt (Windows cmd):**
```cmd
set NODE_ENV=development && node src/index.js
```

**Resultado esperado:**
```
INFO  server_started {"port":3000}
```

**Verificar en otra terminal:**
```bash
curl http://localhost:3000/
# → {"message":"Hello from DevSecOps technical test to CBCO!!!!!!"}

curl http://localhost:3000/health
# → {"status":"ok"}

curl "http://localhost:3000/health?full=true"
# → {"status":"ok","mode":"full"}
```

Detén la app con `Ctrl+C` cuando termines de verificar.

---

#### L5 — Construir la imagen Docker

> `cd ..` y `docker build` funcionan igual en bash, PowerShell y CMD.
> Asegúrate de que Docker Desktop esté abierto y muestre "Engine running" antes de ejecutar.

```bash
# Volver a la raíz del proyecto
cd ..

docker build -t demo-app:local .
```

**Resultado esperado:** `Successfully built ...` o `writing image sha256:...`

**Verificar:**
```bash
docker images demo-app
# NAME       TAG     IMAGE ID      CREATED         SIZE
# demo-app   local   xxxxxxxxxxxx  X seconds ago   ~80MB
```

---

#### L6 — Correr el contenedor Docker

**bash / Linux / macOS / WSL:**
```bash
docker run -d \
  --name demo-app-test \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  demo-app:local
```

**PowerShell (Windows):**
```powershell
docker run -d `
  --name demo-app-test `
  -p 3000:3000 `
  -e NODE_ENV=production `
  -e LOG_LEVEL=info `
  demo-app:local
```

**CMD (Windows):**
```cmd
docker run -d --name demo-app-test -p 3000:3000 -e NODE_ENV=production -e LOG_LEVEL=info demo-app:local
```

**Verificar que está corriendo** (igual en bash, PowerShell y CMD):
```bash
docker ps --filter name=demo-app-test
# Debe mostrar el contenedor con STATUS = Up
```

**Verificar endpoints** (igual en bash, PowerShell y CMD):
```bash
curl http://localhost:3000/
curl http://localhost:3000/health
curl "http://localhost:3000/health?full=true"
```

**Verificar seguridad — el proceso NO debe correr como root** (igual en todas las plataformas):
```bash
docker exec demo-app-test whoami
# → appuser   (si dice "root" hay un problema con el Dockerfile)
```

**Verificar health check de Docker** (igual en todas las plataformas):
```bash
docker inspect demo-app-test --format="{{.State.Health.Status}}"
# → healthy   (puede tardar ~15 segundos en pasar de "starting" a "healthy")
```

**Ver logs en JSON estructurado** (igual en todas las plataformas):
```bash
docker logs demo-app-test
# {"timestamp":"...","level":"info","message":"server_started","port":3000}
# {"timestamp":"...","level":"info","message":"http_request","method":"GET","path":"/health",...}
```

**Detener y limpiar el contenedor** (igual en todas las plataformas):
```bash
docker stop demo-app-test && docker rm demo-app-test
```

---

#### L7 — (Opcional) Validar el Helm chart sin cluster

> `helm lint` y `helm template` funcionan igual en bash, PowerShell y CMD.

```bash
# Desde la raíz del proyecto
helm lint ./helm/demo-app -f gitops/values.yaml
# → [INFO] Chart.yaml: icon is recommended
# → 1 chart(s) linted, 0 chart(s) failed

helm template demo-app ./helm/demo-app -f gitops/values.yaml --namespace demo-app
# → Imprime todos los manifiestos YAML que se desplegarían
```

Si `helm lint` pasa sin errores, el chart está listo para el cluster.

---

#### L8 — Abrir las demos para clientes

```bash
# Windows
start demo\index.html

# Mac / Linux
open demo/index.html       # Mac
xdg-open demo/index.html   # Linux
```

Las demos funcionan sin internet local (fuentes vía CDN — requieren conexión para las tipografías).

---

> ✅ **Si llegaste hasta aquí sin errores**, la aplicación funciona correctamente en local.
> El siguiente paso es lanzar el pipeline completo en GitHub Actions.

---

### PARTE 2 — Pipeline en GitHub Actions (CI/CD completo)

#### P1 — Ajustar tu usuario de DockerHub en los archivos

Reemplaza `nahumtestaccount` con tu usuario real de DockerHub en dos archivos:

**Archivo 1: `.github/workflows/triggerci.yml`**

Busca la línea (aproximadamente línea 10):
```yaml
IMAGE_REPO: nahumtestaccount/demo-app
```
Cámbiala por:
```yaml
IMAGE_REPO: TU_USUARIO_DOCKERHUB/demo-app
```

**Archivo 2: `gitops/values.yaml`**

Busca la línea:
```yaml
repository: "docker.io/nahumtestaccount/demo-app"
```
Cámbiala por:
```yaml
repository: "docker.io/TU_USUARIO_DOCKERHUB/demo-app"
```

---

#### P2 — Crear repositorio y Access Token en DockerHub

1. Ir a [hub.docker.com](https://hub.docker.com/) → **Repositories → Create Repository**
   - Name: `demo-app` · Visibility: `Public` (más simple para empezar)

2. Ir a **Account Settings → Personal Access Tokens → Generate New Token**
   - Description: `github-actions-cbco`
   - Permissions: `Read & Write`
   - **Copia el token** — solo se muestra una vez

---

#### P3 — Configurar permisos de GitHub Actions

Ve a tu repositorio en GitHub:
**Settings → Actions → General**

- En "Workflow permissions" selecciona: ✅ **Read and write permissions**
- Marca: ✅ **Allow GitHub Actions to create and approve pull requests**
- Clic en **Save**

También en **Settings → General** → sección "Pull Requests":
- Marca: ✅ **Allow auto-merge**
- Clic en **Save**

---

#### P4 — Configurar los Secrets en GitHub

Ve a: **Settings → Secrets and variables → Actions → New repository secret**

Crear estos dos secrets (obligatorios):

| Secret name | Valor |
|-------------|-------|
| `DOCKERHUB_USERNAME` | Tu usuario de DockerHub |
| `DOCKERHUB_TOKEN` | El Access Token del paso P2 |

Los siguientes son opcionales — el pipeline funciona sin ellos (en modo degradado):

| Secret name | Cuándo agregarlo |
|-------------|-----------------|
| `ARGOCD_SERVER` | Cuando tengas cluster con ArgoCD |
| `ARGOCD_TOKEN` | Cuando tengas cluster con ArgoCD |
| `DEPLOY_APP_URL` | URL pública de la app en el cluster |

---

#### P5 — Hacer commit y lanzar el pipeline

> `git add`, `git commit` y `git push` son iguales en bash, PowerShell y CMD.

```bash
# Desde la raíz del proyecto
git add .github/workflows/triggerci.yml gitops/values.yaml

git commit -m "chore: configure dockerhub user for pipeline"

git push origin main
```

---

#### P6 — Monitorear el pipeline con gh CLI

> Los comandos `gh` son iguales en bash, PowerShell y CMD.

```bash
# Ver el run que acaba de iniciarse
gh run list --limit 5

# Ver en tiempo real los logs del run más reciente
gh run watch

# Ver el detalle de un run específico (reemplaza RUN_ID con el número)
gh run view RUN_ID

# Ver los logs de un job específico
gh run view RUN_ID --log

# Ver solo los jobs fallidos
gh run view RUN_ID --log-failed
```

**Orden de ejecución esperado:**

```
Job 1: ci              → Tests · ESLint · GitLeaks · Semgrep · npm audit · Trivy FS · SBOM
Job 2: build-push      → Docker build · Trivy image · ZAP DAST · Docker push
Job 3: update-gitops   → Actualiza gitops/values.yaml · Crea PR de GitOps
```

Duración típica: **8–14 minutos** en total.

---

#### P7 — Verificar resultados del pipeline

**Imagen en DockerHub:**
```bash
# Verificar que la imagen fue publicada
gh api repos/{owner}/{repo}/actions/runs --jq '.workflow_runs[0].status'
# → completed

# O directamente en DockerHub:
# https://hub.docker.com/r/TU_USUARIO/demo-app/tags
```

**Artefactos generados (descargables desde GitHub):**
```bash
# Listar artefactos del último run
gh run list --limit 1 --json databaseId --jq '.[0].databaseId' | xargs gh run view --json artifacts
```

O desde la UI: **GitHub → Actions → [run] → Artifacts**:
- `coverage-report-{sha}` — Reporte HTML de cobertura de tests
- `sbom-{sha}` — SBOM en formato SPDX-JSON (inventario de dependencias)
- `dast-logs-{sha}` — Logs del contenedor durante el escaneo ZAP

**Alertas de seguridad:**
- **GitHub → Security → Code scanning alerts** — vulnerabilidades reportadas por Trivy SARIF

**PR de GitOps creado automáticamente:**
```bash
gh pr list
# → #N  chore: update image tag to <sha>  gitops/demo-app-...
```

---

#### P8 — (Opcional) Aprobar y mergear el PR de GitOps

El PR de GitOps actualiza `gitops/values.yaml` con el nuevo tag de imagen. Si tienes auto-merge activado, se mergea solo. Si no:

```bash
# Ver el PR creado
gh pr list

# Aprobarlo y mergearlo
gh pr review <numero-pr> --approve
gh pr merge <numero-pr> --merge
```

Al mergearse, se dispara el workflow `cd-verify.yml` (fase CD).

---

#### P9 — Verificar el estado final

> `gh run list` es igual en todas las plataformas.

```bash
# Ver todos los runs (CI + CD) — igual en bash, PowerShell y CMD
gh run list --limit 10
```

**Estado de los deployments:**

**bash / Linux / macOS / WSL:**
```bash
gh api repos/{owner}/{repo}/deployments \
  --jq '.[0] | {id, environment, created_at}'

# Estado del último deployment:
gh api repos/{owner}/{repo}/deployments \
  --jq '.[0].id' | xargs -I{} \
  gh api repos/{owner}/{repo}/deployments/{}/statuses \
  --jq '.[0].state'
# → success  (si ArgoCD está configurado)
# → in_progress  (si no hay ArgoCD — modo degradado)
```

**PowerShell (Windows):**
```powershell
gh api repos/{owner}/{repo}/deployments --jq '.[0] | {id, environment, created_at}'

# Estado del último deployment (PowerShell no tiene xargs — usar dos pasos):
$deployId = gh api repos/{owner}/{repo}/deployments --jq '.[0].id'
gh api "repos/{owner}/{repo}/deployments/$deployId/statuses" --jq '.[0].state'
```

**CMD (Windows):**
```cmd
gh api repos/{owner}/{repo}/deployments --jq ".[0] | {id, environment, created_at}"

:: Estado del último deployment (CMD — dos pasos):
for /f %i in ('gh api repos/{owner}/{repo}/deployments --jq ".[0].id"') do gh api "repos/{owner}/{repo}/deployments/%i/statuses" --jq ".[0].state"
```

---

> ✅ **Pipeline completo ejecutado.** La imagen está en DockerHub con tag SHA inmutable.
> Para desplegar en Kubernetes, continúa con las [Secciones 12](#12-despliegue-en-kubernetes-con-helm) y [13](#13-configuración-de-argocd-gitops).

---

## 1. Resumen del Proyecto

Este repositorio implementa una **aplicación Node.js/Express** con un pipeline DevSecOps completo que cubre:

| Fase | Herramienta | Qué hace |
|------|-------------|----------|
| **Código** | ESLint + GitLeaks | Calidad de código y detección de secretos expuestos |
| **SAST** | Semgrep | Análisis estático de seguridad del código fuente |
| **SCA** | npm audit + Trivy FS | Vulnerabilidades en dependencias y filesystem |
| **Build** | Docker multi-stage | Imagen segura, sin root, filesystem read-only |
| **DAST** | OWASP ZAP | Pruebas dinámicas de seguridad contra la app en ejecución |
| **Image scan** | Trivy | Vulnerabilidades en la imagen Docker final |
| **SBOM** | Trivy (SPDX-JSON) | Inventario de dependencias para auditoría de supply chain |
| **GitOps** | ArgoCD + Helm | Despliegue declarativo y versionado en Kubernetes |
| **CD Verify** | ArgoCD CLI + curl | Verificación automática post-deploy con smoke tests |
| **Rollback** | ArgoCD CLI | Reversión automática si el deploy falla |

### Endpoints de la aplicación

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `GET` | `/` | `{ "message": "Hello from DevSecOps technical test to CBCO!!!!!!" }` |
| `GET` | `/health` | `{ "status": "ok" }` |
| `GET` | `/health?full=true` | `{ "status": "ok", "mode": "full" }` |

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│  DESARROLLADOR                                                      │
│  git push → main  /  PR review aprobado                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS — triggerci.yml                                     │
│                                                                     │
│  [validate-pr-approval]  →  sólo en PR review aprobado              │
│          ↓                                                          │
│  [ci]  Tests · ESLint · GitLeaks · Semgrep · npm audit · Trivy FS   │
│          ↓                                                          │
│  [build-push]  Docker build → Trivy image → ZAP DAST → Push         │
│          ↓                                                          │
│  [update-gitops]  Actualiza gitops/values.yaml → crea PR GitOps     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  merge del PR de GitOps
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS — cd-verify.yml                                     │
│  (trigger: push a main en gitops/values.yaml)                       │
│                                                                     │
│  [deploy-verify]  ArgoCD wait + Smoke Tests                         │
│          ↓ (en fallo)                                               │
│  [rollback]  argocd app rollback                                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  sync automático
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  KUBERNETES CLUSTER                                                 │
│                                                                     │
│  ArgoCD ──→ Helm chart ──→ Namespace: demo-app                      │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Deployment   │  │ Service      │  │ ServiceAccount (non-root) │  │
│  │ (pod non-root│  │ ClusterIP    │  │ automount: false          │  │
│  │  read-only FS│  │ port: 3000   │  └──────────────────────────┘   │
│  │  securityCtx)│  └──────────────┘  ┌──────────────────────────┐   │
│  └──────────────┘                    │ NetworkPolicy             │  │
│                                      │ (ingress-only)            │  │
│  ┌──────────────────────────────┐    └──────────────────────────┘   │
│  │ PodDisruptionBudget          │                                   │
│  │ minAvailable: 1              │                                   │
│  └──────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico y Compatibilidad de Versiones

> **Todas las versiones son compatibles entre sí y con ciclos de vida a largo plazo.**

### Aplicación

| Componente | Versión | EOL / Soporte | Notas |
|-----------|---------|---------------|-------|
| Node.js | **20 LTS** | Abril 2028 | Runtime principal |
| Express | **4.21.2** | Node ≥12 ✅ | Framework HTTP |
| Jest | **29.7.0** | Node ≥14 ✅ | Testing + cobertura |
| ESLint | **9.21.0** | Node ≥18.18 ✅ | Linting |
| Supertest | **7.0.0** | Node ≥14 ✅ | Tests HTTP de integración |

### Imagen Docker

| Componente | Versión | Notas |
|-----------|---------|-------|
| `node:20-alpine` | Alpine 3.x | Imagen base minimal (~50 MB vs ~900 MB full) |
| Usuario proceso | UID/GID 1001 | Proceso corre como no-root siempre |

### Pipeline — GitHub Actions

| Herramienta / Action | Versión | Compatible con |                                                                                                                                                                                                                                                                                                                                                                                                                                 
|---------------------|---------|----------------|
| `actions/checkout` | v4 | Ubuntu 22.04 ✅ |
| `actions/setup-node` | v4 | Node 20 ✅ |
| `actions/upload-artifact` | v4 | Ubuntu 22.04 ✅ |
| `docker/setup-qemu-action` | v3 | Buildx 0.10+ ✅ |
| `docker/setup-buildx-action` | v3 | Docker Engine 23+ ✅ |
| `docker/login-action` | v3 | DockerHub / GHCR ✅ |
| `docker/build-push-action` | v6 | Buildx v3 ✅ |
| Trivy (instalación directa) | **v0.56.1** | K8s 1.27-1.31 ✅ |
| OWASP ZAP baseline action | **v0.12.0** | ZAP 2.15 ✅ |
| `returntocorp/semgrep-action` | v1 | Python 3.x runner ✅ |
| `gitleaks/gitleaks-action` | v2 | Gitleaks 8.x ✅ |
| `github/codeql-action/upload-sarif` | v3 | GitHub Advanced Security ✅ |
| `peter-evans/create-pull-request` | v6 | GITHUB_TOKEN ✅ |

### Infraestructura

| Componente | Versión | Compatible con |
|-----------|---------|----------------|
| Helm | 3.x (API v2) | K8s ≥1.16 ✅ |
| ArgoCD CLI | **v2.13.3** | ArgoCD server 2.x ✅ |
| ArgoCD server | **v2.13.3** | K8s 1.27-1.31 ✅ |
| Kubernetes (target) | 1.27 - 1.31 | — |

---

## 4. Estructura del Repositorio

```
pruebaDevsecopsCBCO/
│
├── .github/
│   └── workflows/
│       ├── triggerci.yml         ← CI + Build + Push + GitOps PR
│       └── cd-verify.yml         ← CD: verify deploy + rollback automático
│
├── app/                          ← Código fuente Node.js/Express
│   ├── src/
│   │   ├── index.js              ← Servidor Express + request logging middleware
│   │   └── logger.js             ← Logger multi-nivel (trace→fatal), child loggers
│   ├── test/
│   │   └── app.test.js           ← Tests unitarios Jest + Supertest
│   ├── package.json
│   └── package-lock.json
│
├── helm/
│   └── demo-app/                 ← Helm chart de la aplicación
│       ├── Chart.yaml
│       ├── values.yaml           ← Valores por defecto (defaults)
│       └── templates/
│           ├── _helpers.tpl      ← Helpers: labels, selectorLabels, serviceAccountName
│           ├── deployment.yaml   ← securityContext completo + probes + env vars
│           ├── service.yaml      ← Service ClusterIP puerto 3000
│           ├── serviceaccount.yaml   ← SA dedicado, automountToken: false
│           ├── networkpolicy.yaml    ← Solo acepta tráfico del ingress
│           └── poddisruptionbudget.yaml  ← minAvailable: 1
│
├── argocd/
│   └── application.yaml          ← ArgoCD Application (sync policy, retry, finalizer)
│
├── gitops/
│   └── values.yaml               ← Overrides producción (actualizado por CI)
│
├── demo/                         ← Páginas HTML demo para clientes (standalone)
│   ├── index.html                ← Portal selector
│   ├── sumas-soluciones.html     ← Demo Sumas y Soluciones (portal libranzas pensionados)
│   └── credibanco.html           ← Demo Credibanco (fintech/pagos)
│
├── .zap/
│   └── rules.tsv                 ← Supresiones ZAP documentadas con justificación
│
├── .dockerignore                 ← Excluye node_modules, .git, tests del build
├── .gitleaks.toml                ← Config GitLeaks + reglas custom
├── .trivyignore                  ← CVEs aceptadas (vacío por ahora — bien documentado)
├── Dockerfile                    ← Multi-stage, USER 1001, HEALTHCHECK nativo
└── README.md                     ← Este archivo
```

---

## 5. Pipeline DevSecOps — Explicación Detallada

### Workflow: `triggerci.yml`

#### ¿Cuándo se activa?

```yaml
on:
  push:
    branches: [main]
    paths-ignore: ['gitops/**', '**.md']   # Evita loop infinito con PR de GitOps
  pull_request_review:
    types: [submitted]                     # Solo con review aprobado
```

#### Seguridad de permisos — principio de mínimo privilegio

El workflow declara `permissions: {}` globalmente (deniega todo) y cada job abre solo lo que necesita:

```
validate-pr-approval  → sin permisos
ci                    → contents:read, security-events:write
build-push            → contents:read, packages:write, security-events:write
update-gitops         → contents:write, pull-requests:write, deployments:write
```

---

#### Job 0 — `validate-pr-approval`

Solo corre en `pull_request_review`. Verifica que `github.event.review.state == 'approved'`. Si no es así, el pipeline falla y los jobs siguientes no corren. Esto implementa el **control de aprobación de código** antes de que cualquier cosa se construya o se suba al registry.

---

#### Job 1 — `ci` (Tests + Security Scanning)

| Paso | Herramienta | Bloquea si falla | Artefacto generado |
|------|-------------|-----------------|-------------------|
| 1. Unit tests + cobertura | Jest | ✅ Sí | `coverage-report-{tag}` (30 días) |
| 2. ESLint | ESLint | ✅ Sí | — |
| 3. Detección de secretos | GitLeaks | ✅ **Siempre** | — |
| 4. SAST | Semgrep | ✅ Sí | — |
| 5. SCA dependencias | npm audit | ✅ Sí (CRITICAL) | — |
| 6. SCA filesystem SARIF | Trivy FS | No (reporte) | `trivy-fs.sarif` → Code Scanning |
| 7. SCA filesystem bloqueante | Trivy FS | ✅ Sí (CRITICAL) | — |
| 8. SBOM | Trivy SPDX | No | `sbom-{tag}.spdx.json` (90 días) |

**Output del job:** `image_tag` = SHA corto del commit (12 caracteres, ej: `a1b2c3d4e5f6`)

> **Por qué GitLeaks siempre bloquea y no tiene `continue-on-error`**: Un secreto expuesto en el código fuente es un incidente de seguridad inmediato, independientemente de la severidad. No existe "secreto expuesto acceptable".

---

#### Job 2 — `build-push` (Build + Trivy Image + DAST + Push)

> **Principio "build once, deploy many"**: La imagen se construye una sola vez con Buildx. La misma imagen que se testea con DAST es la que se sube al registry y se deploya. El digest SHA256 es su identidad criptográfica.

| Paso | Herramienta | Detalles |
|------|-------------|----------|
| 1. Docker build | Buildx + GHA cache | Multi-stage, provenance, SBOM de imagen |
| 2. Trivy image SARIF | Trivy v0.56.1 | Reporta HIGH+CRITICAL → GitHub Code Scanning |
| 3. Trivy image bloqueante | Trivy v0.56.1 | Bloquea solo en CRITICAL con fix disponible |
| 4. Start container | Docker | `--network host` para acceso desde ZAP |
| 5. DAST | OWASP ZAP Baseline v0.12.0 | Contra la app en ejecución |
| 6. Capture logs DAST | Docker logs | `dast-logs-{tag}` artefacto (30 días) |
| 7. Docker push | DockerHub | Solo en push a main; tag SHA inmutable (nunca `:latest`) |

**Por qué no se usa `:latest`**: Los tags mutables no garantizan reproducibilidad. Si alguien hace `docker pull image:latest` mañana, puede obtener una imagen diferente. Con el tag SHA, la imagen es exactamente la misma para siempre.

---

#### Job 3 — `update-gitops` (Solo en push a `main`)

1. **Crea un GitHub Deployment** — visible en la pestaña "Deployments" del repo. Permite rastrear qué versión está en qué ambiente.
2. **Actualiza `gitops/values.yaml`** — cambia `image.tag` al nuevo SHA corto.
3. **Crea un PR de GitOps** — el PR contiene solo el cambio de tag, con descripción detallada.
4. **Habilita auto-merge** en el PR — si el repo tiene auto-merge activado, el PR se mergea automáticamente.

---

### Workflow: `cd-verify.yml`

Se activa cuando `gitops/values.yaml` cambia en `main` (merge del PR de GitOps).

**Por qué es un workflow separado**: Esto implementa el patrón GitOps correcto. El pipeline de CI no debería saber ni esperar a que ArgoCD sincronice. El CI termina al crear el PR de GitOps. La verificación del deploy es responsabilidad de un proceso separado que se activa cuando el cambio llega a `main`.

#### Job 1 — `deploy-verify`

| Paso | Herramienta | Detalles |
|------|-------------|----------|
| 1. Extraer image tag | bash + grep | Lee el tag de `gitops/values.yaml` |
| 2. Find Deployment ID | GitHub API | Busca el GitHub Deployment creado por triggerci |
| 3. Marcar → `in_progress` | GitHub API | Visible en pestaña Deployments |
| 4. Check ArgoCD config | bash | Modo degradado si no hay secrets configurados |
| 5. ArgoCD wait | argocd CLI | `argocd app wait --health --sync --timeout 300` |
| 6. Smoke tests | curl + jq | `GET /`, `GET /health`, `GET /health?full=true` |
| 7. Update deployment status | GitHub API | `success` o `failure` |

#### Job 2 — `rollback` (solo si `deploy-verify` falla)

```bash
argocd app rollback demo-app
argocd app wait demo-app --health --timeout 180
```

---

## 6. Herramientas de Revisión de Logs

### En el Pipeline (GitHub Actions)

Los artefactos se guardan automáticamente y son descargables desde la UI de Actions:

| Artefacto | Job origen | Retención | Contenido |
|-----------|-----------|-----------|-----------|
| `coverage-report-{tag}` | ci | 30 días | Reporte HTML de cobertura Jest |
| `sbom-{tag}` | ci | 90 días | SBOM en formato SPDX-JSON (inventario de dependencias) |
| `dast-logs-{tag}` | build-push | 30 días | Logs stdout/stderr del contenedor durante ZAP |

Los reportes SARIF (Trivy) aparecen en: **GitHub → Security → Code scanning alerts**

Para ver artefactos: **GitHub → Repositorio → Actions → [nombre del run] → Artifacts**

---

### En la Aplicación (Logs Estructurados JSON)

La app emite una línea JSON por evento en producción. Esto es compatible nativamente con todos los agregadores de logs modernos:

#### Formato de una entrada de log

```json
{
  "timestamp": "2026-03-20T14:30:00.000Z",
  "level": "info",
  "message": "http_request",
  "service": "demo-app",
  "version": "1.0.0",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "duration_ms": 3,
  "user_agent": "kube-probe/1.29"
}
```

#### Compatibilidad con herramientas de logging

| Herramienta | Config necesaria | Estado |
|-------------|-----------------|--------|
| **Fluent Bit** | Anotación `fluentbit.io/parser: "json"` | ✅ Ya incluida en `values.yaml` |
| **Grafana Loki + Promtail** | Instalar `loki-stack` Helm chart | Ver instrucciones abajo |
| **Datadog Agent** | Agent instalado en el cluster | Parsea JSON sin config extra |
| **AWS CloudWatch** | EKS logging activado | Parsea JSON automáticamente |
| **kubectl logs** | Ninguna | Ver logs directamente en terminal |

#### Instalar Loki + Grafana para revisión visual de logs

> `helm repo add`, `helm repo update` y `kubectl port-forward` son iguales en bash, PowerShell y CMD.

**bash / Linux / macOS / WSL:**
```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.enabled=true \
  --set promtail.enabled=true

kubectl get secret --namespace monitoring loki-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode && echo

kubectl port-forward --namespace monitoring service/loki-grafana 3001:80
```

**PowerShell (Windows):**
```powershell
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki grafana/loki-stack `
  --namespace monitoring `
  --create-namespace `
  --set grafana.enabled=true `
  --set promtail.enabled=true

# Obtener contraseña de Grafana
$b64 = kubectl get secret --namespace monitoring loki-grafana -o jsonpath="{.data.admin-password}"
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))

kubectl port-forward --namespace monitoring service/loki-grafana 3001:80
```

**CMD (Windows):**
```cmd
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install loki grafana/loki-stack --namespace monitoring --create-namespace --set grafana.enabled=true --set promtail.enabled=true

:: Obtener contraseña (base64 — pegar el resultado en https://www.base64decode.org/)
kubectl get secret --namespace monitoring loki-grafana -o jsonpath="{.data.admin-password}"

kubectl port-forward --namespace monitoring service/loki-grafana 3001:80
```

> Abrir en el navegador: http://localhost:3001 (usuario: `admin`)
> En Grafana: **Explore → Datasource: Loki → filtrar por** `namespace=demo-app`

#### Ver logs desde kubectl

> `kubectl logs` es igual en bash, PowerShell y CMD. Los pipes con `jq` requieren tener `jq` instalado.
> En Windows instala `jq` con: `winget install jqlang.jq`

**bash / Linux / macOS / WSL:**
```bash
# Logs en tiempo real
kubectl logs -f deployment/demo-app -n demo-app

# Logs legibles con jq (JSON pretty-print)
kubectl logs deployment/demo-app -n demo-app | jq '.'

# Solo errores y fatales
kubectl logs deployment/demo-app -n demo-app \
  | jq 'select(.level == "error" or .level == "fatal")'

# Solo requests HTTP con status 5xx
kubectl logs deployment/demo-app -n demo-app \
  | jq 'select(.message == "http_request" and .status >= 500)'

# Últimas 100 líneas
kubectl logs deployment/demo-app -n demo-app --tail=100 | jq '.'
```

**PowerShell (Windows):**
```powershell
# Logs en tiempo real
kubectl logs -f deployment/demo-app -n demo-app

# Logs legibles con jq
kubectl logs deployment/demo-app -n demo-app | jq '.'

# Solo errores y fatales
kubectl logs deployment/demo-app -n demo-app | jq 'select(.level == "error" or .level == "fatal")'

# Solo requests HTTP con status 5xx
kubectl logs deployment/demo-app -n demo-app | jq 'select(.message == "http_request" and .status >= 500)'

# Últimas 100 líneas
kubectl logs deployment/demo-app -n demo-app --tail=100 | jq '.'
```

**CMD (Windows):**
```cmd
rem Logs en tiempo real
kubectl logs -f deployment/demo-app -n demo-app

rem Logs con jq
kubectl logs deployment/demo-app -n demo-app | jq "."

rem Últimas 100 líneas
kubectl logs deployment/demo-app -n demo-app --tail=100 | jq "."
```

---

### Niveles de Log del Logger

La app usa `app/src/logger.js` con 6 niveles jerárquicos:

| Nivel | Severidad | Cuándo usar | Destino |
|-------|-----------|-------------|---------|
| `trace` | 0 | Debugging muy detallado, paso a paso | stdout |
| `debug` | 1 | Variables, flujo de ejecución | stdout |
| `info` | 2 | Eventos normales (default) | stdout |
| `warn` | 3 | Situaciones inusuales no críticas | stdout |
| `error` | 4 | Errores recuperables | **stderr** |
| `fatal` | 5 | Errores que detienen el proceso | **stderr** |

```bash
# Cambiar nivel sin reiniciar — solo en Kubernetes:
kubectl set env deployment/demo-app LOG_LEVEL=debug -n demo-app
# (K8s hará un rolling update automático)

# Restaurar a info
kubectl set env deployment/demo-app LOG_LEVEL=info -n demo-app
```

---

## 7. Controles de Seguridad Implementados

### Dockerfile

| Control | Implementación | Por qué importa |
|---------|---------------|-----------------|
| Multi-stage build | `AS deps` + `AS runtime` | La imagen final no tiene compiladores, npm, ni herramientas de build |
| Usuario no-root | `adduser -u 1001` + `USER appuser` | Si hay RCE, el atacante no tiene privilegios de root |
| `--ignore-scripts` | `npm ci --omit=dev --ignore-scripts` | Previene ejecución de postinstall scripts maliciosos de dependencias |
| HEALTHCHECK nativo | `CMD node -e "require('http').get..."` | K8s y Docker detectan el estado real de la app (no solo el proceso) |
| Filesystem mínimo | Solo `/app/src` y `/app/node_modules` | Superficie de ataque reducida al mínimo indispensable |

### Kubernetes — Helm Chart

| Control | Campo | Valor | Por qué importa |
|---------|-------|-------|-----------------|
| Pod no-root | `runAsNonRoot` | `true` | K8s rechaza el pod si intenta arrancar como UID 0 |
| UID/GID fijo | `runAsUser`, `runAsGroup` | `1001` | Consistencia entre Dockerfile y K8s |
| Filesystem read-only | `readOnlyRootFilesystem` | `true` | Si hay RCE, el atacante no puede escribir ni instalar binarios |
| Sin escalada de privilegios | `allowPrivilegeEscalation` | `false` | No se puede hacer sudo, setuid, setgid |
| Sin capabilities | `capabilities.drop` | `ALL` | Sin syscalls privilegiadas de Linux |
| SA dedicado | `serviceaccount.yaml` | — | Aislamiento de identidad RBAC entre servicios |
| Sin token auto-mount | `automountServiceAccountToken` | `false` | La app no accede a la API de K8s; reduce impacto de RCE |
| NetworkPolicy | `networkpolicy.yaml` | Ingress-only desde ingress-ns | Bloquea lateral movement si un pod es comprometido |
| PodDisruptionBudget | `poddisruptionbudget.yaml` | `minAvailable: 1` | Garantiza disponibilidad durante actualizaciones de nodo |
| Recursos limitados | `resources.limits` | cpu: 300m, mem: 256Mi | Un pod no puede OOM-kill al nodo ni monopolizar CPU |
| startupProbe | `startupProbe` | `failureThreshold: 12` | Protege el livenessProbe durante el arranque lento |

### Pipeline

| Control | Herramienta | Nivel de bloqueo |
|---------|-------------|-----------------|
| Secretos en código/historial | GitLeaks | **Siempre bloquea** |
| Análisis estático SAST | Semgrep (p/javascript, p/nodejs, p/security-audit) | Bloquea en findings |
| Vulnerabilidades en deps npm | npm audit | Bloquea en CRITICAL |
| Vulnerabilidades en filesystem | Trivy FS | Bloquea en CRITICAL con fix |
| Vulnerabilidades en imagen Docker | Trivy Image | Bloquea en CRITICAL con fix |
| Pruebas dinámicas DAST | OWASP ZAP Baseline | Reporta (configurable para bloquear) |
| Inventario de dependencias | Trivy SBOM SPDX-JSON | Compliance y auditoría |
| Permisos mínimos por job | `permissions: {}` global | Principio de mínimo privilegio |
| Tags de imagen inmutables | SHA corto en lugar de `:latest` | Reproducibilidad y trazabilidad |
| Código de revisión obligatorio | `validate-pr-approval` | Nadie puede saltarse la revisión de código |

---

## 8. Prerequisitos — Qué necesitas antes de ejecutar

### Para correr la app localmente (mínimo)

- [ ] **Node.js 20 LTS** — Descargar en [nodejs.org](https://nodejs.org/)
- [ ] **Git** — Descargar en [git-scm.com](https://git-scm.com/)

### Para correr con Docker

- [ ] **Docker Desktop** (Mac/Windows) o **Docker Engine** (Linux) — versión 24+
  - Descargar en [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)

### Para el pipeline completo en GitHub Actions

- [ ] **Cuenta de GitHub** con este repositorio
- [ ] **Cuenta de DockerHub** con un repositorio `demo-app` creado
- [ ] **Access Token de DockerHub** (no usar la contraseña directa)
- [ ] **Secrets configurados** en el repositorio de GitHub (ver Sección 14)
- [ ] **GitHub Advanced Security activado** (para reportes SARIF de Trivy)

### Para desplegar en Kubernetes (opcional para empezar)

- [ ] **kubectl** configurado y apuntando a un cluster
- [ ] **Helm 3.x** instalado
- [ ] **Cluster Kubernetes 1.27+** — opciones:
  - **Local**: `minikube start --driver=docker`, `kind create cluster`, `k3d cluster create`
  - **Cloud**: EKS (AWS), GKE (Google), AKS (Azure), DigitalOcean K8s
- [ ] **CNI con soporte NetworkPolicy**: Calico, Cilium o Weave
  - Si usas Flannel sin plugin de network policy → cambiar `networkPolicy.enabled: false` en `gitops/values.yaml`

### Para la fase CD con ArgoCD (opcional para empezar)

- [ ] **ArgoCD instalado** en el cluster (ver Sección 13)
- [ ] **ArgoCD server accesible** desde los runners de GitHub Actions (IP pública o VPN)
- [ ] **Secrets `ARGOCD_SERVER`** y **`ARGOCD_TOKEN`** configurados en GitHub
- [ ] **Secret `DEPLOY_APP_URL`** con la URL pública de la app

> **Importante**: Sin ArgoCD, el pipeline funciona en **modo parcial** — CI, Build, Push y creación del PR de GitOps funcionan perfectamente. La fase CD (verify + rollback) muestra advertencias pero no falla. Puedes agregar ArgoCD después, cuando tengas el cluster listo.

---

## 9. Setup Paso a Paso

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git
cd pruebaDevsecopsCBCO
```

### Paso 2 — Instalar dependencias y verificar que todo funciona

```bash
cd app
npm ci

# Correr tests (deben pasar los 4)
npm test

# Correr lint (debe salir sin errores)
npm run lint

# Volver a la raíz
cd ..
```

### Paso 3 — Configurar tu usuario de DockerHub en los archivos

Reemplaza `nahumtestaccount` con tu usuario real de DockerHub:

```bash
# En .github/workflows/triggerci.yml
# Cambiar la línea:  IMAGE_REPO: nahumtestaccount/demo-app
# Por:               IMAGE_REPO: TU_USUARIO/demo-app

# En gitops/values.yaml
# Cambiar la línea:  repository: "docker.io/nahumtestaccount/demo-app"
# Por:               repository: "docker.io/TU_USUARIO/demo-app"
```

### Paso 4 — Configurar GitHub Actions en el repositorio

#### 4.1 Permisos de Actions

Ve a: **Settings → Actions → General**

- En "Workflow permissions": seleccionar **"Read and write permissions"**
- Marcar ✅ **"Allow GitHub Actions to create and approve pull requests"**
- Hacer clic en **"Save"**

#### 4.2 Habilitar Auto-merge (para el PR de GitOps)

Ve a: **Settings → General** → buscar sección "Pull Requests"

- Marcar ✅ **"Allow auto-merge"**
- Hacer clic en **"Save"**

#### 4.3 GitHub Advanced Security (para reportes SARIF)

Ve a: **Settings → Security & analysis**

- Activar **"Code scanning"** (gratis para repos públicos)
- Para repos privados requiere GitHub Advanced Security o GitHub Team

### Paso 5 — Crear el repositorio en DockerHub y generar Access Token

1. Ir a [hub.docker.com](https://hub.docker.com/) y crear cuenta (si no tienes)
2. Crear repositorio: **Repositories → Create Repository**
   - Name: `demo-app`
   - Visibility: `Private` o `Public`
3. **Crear Access Token** (más seguro que la contraseña):
   - Ir a: **Account Settings → Security → New Access Token**
   - Name: `github-actions-cbco`
   - Permissions: `Read & Write`
   - Copiar el token — **solo se muestra una vez**

### Paso 6 — Configurar los Secrets en GitHub

Ve a: **Settings → Secrets and variables → Actions → New repository secret**

Crear los siguientes secrets:

| Secret | Valor a ingresar |
|--------|-----------------|
| `DOCKERHUB_USERNAME` | Tu usuario de DockerHub (ej: `nahumtestaccount`) |
| `DOCKERHUB_TOKEN` | El Access Token creado en el paso anterior |

Los siguientes son opcionales para empezar (agrégalos cuando tengas el cluster):

| Secret | Cuándo agregar | Valor |
|--------|---------------|-------|
| `ARGOCD_SERVER` | Al configurar ArgoCD | `argocd.mi-cluster.com` (sin https://) |
| `ARGOCD_TOKEN` | Al configurar ArgoCD | Token del SA `pipeline` en ArgoCD |
| `DEPLOY_APP_URL` | Al configurar el cluster | `https://demo-app.mi-cluster.com` |

### Paso 7 — Hacer el primer push y observar el pipeline

```bash
# Asegúrate de estar en la rama main
git checkout main

# Commit y push
git add .
git commit -m "feat: setup pipeline DevSecOps completo"
git push origin main
```

Ir a: **GitHub → Repositorio → Actions** para ver el pipeline en ejecución en tiempo real.

El primer run debería:
- ✅ Pasar todos los jobs de `ci`
- ✅ Construir la imagen Docker
- ✅ Escanear con Trivy
- ✅ Correr ZAP (puede reportar findings pero no bloquear)
- ✅ Subir la imagen a DockerHub (con el tag SHA)
- ✅ Crear el PR de GitOps

---

## 10. Cómo correr la app localmente

```bash
cd app
```

> **Nota Windows:** La sintaxis `KEY=value command` es propia de Unix/bash y **no funciona en PowerShell ni en cmd**.
> Usa la sintaxis correspondiente a tu terminal (ver ejemplos por sección abajo).

---

#### Bash / macOS / Linux

```bash
# Modo desarrollo — logs con colores ANSI en terminal
NODE_ENV=development node src/index.js

# Modo producción — logs JSON estructurado (una línea por evento)
NODE_ENV=production node src/index.js

# Con nivel de log específico (ver todos los eventos incluyendo debug)
LOG_LEVEL=debug node src/index.js

# Combinado
LOG_LEVEL=debug NODE_ENV=development node src/index.js
```

#### PowerShell (Windows)

```powershell
# Modo desarrollo
$env:NODE_ENV="development"; node src/index.js

# Modo producción
$env:NODE_ENV="production"; node src/index.js

# Con nivel de log específico
$env:LOG_LEVEL="debug"; node src/index.js

# Combinado
$env:LOG_LEVEL="debug"; $env:NODE_ENV="development"; node src/index.js
```

#### Command Prompt (Windows cmd)

```cmd
# Modo desarrollo
set NODE_ENV=development && node src/index.js

# Modo producción
set NODE_ENV=production && node src/index.js

# Combinado
set LOG_LEVEL=debug && set NODE_ENV=development && node src/index.js
```

La app arranca en `http://localhost:3000`. Verificar:

```bash
# Endpoint raíz
curl http://localhost:3000/
# → {"message":"Hello from DevSecOps technical test to CBCO!!!!!!"}

# Health check
curl http://localhost:3000/health
# → {"status":"ok"}

# Health check full
curl "http://localhost:3000/health?full=true"
# → {"status":"ok","mode":"full"}
```

Correr tests:

```bash
cd app
npm test                  # 4 tests, deben pasar todos
npm run test:coverage     # Con reporte de cobertura (≥80% requerido por el pipeline)
npm run lint              # Sin errores de ESLint
```

---

## 11. Cómo correr con Docker

### Build de la imagen

```bash
# Desde la raíz del proyecto (donde está el Dockerfile)
docker build -t demo-app:local .

# Verificar que la imagen se creó
docker images demo-app
```

### Correr el contenedor

```bash
# Básico (foreground)
docker run -p 3000:3000 demo-app:local

# En background con nombre
docker run -d --name demo-app -p 3000:3000 demo-app:local

# Con variables de entorno explícitas

# bash / Linux / macOS / WSL:
docker run -d \
  --name demo-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  demo-app:local

# PowerShell (Windows):
docker run -d `
  --name demo-app `
  -p 3000:3000 `
  -e NODE_ENV=production `
  -e LOG_LEVEL=info `
  demo-app:local

# CMD (Windows) — una sola línea:
docker run -d --name demo-app -p 3000:3000 -e NODE_ENV=production -e LOG_LEVEL=info demo-app:local

# Ver logs en tiempo real
docker logs -f demo-app

# Ver el estado del HEALTHCHECK
docker inspect demo-app --format='{{.State.Health.Status}}'
# → healthy  (después de ~15 segundos)
```

### Verificar controles de seguridad

**✅ Verificar que NO corre como root** (igual en bash, PowerShell y CMD):
```bash
docker run --rm demo-app:local whoami
# → appuser   (si dice "root" hay un problema)
```

**✅ Verificar filesystem read-only:**

**bash / Linux / macOS / WSL:**
```bash
docker run --rm --read-only --tmpfs /tmp demo-app:local node src/index.js &
sleep 2 && curl http://localhost:3000/health
# → {"status":"ok"}  (si funciona con --read-only, el Dockerfile está bien)
```

**PowerShell (Windows):**
```powershell
# Arrancar el contenedor en background con nombre
docker run -d --name verify-ro --read-only --tmpfs /tmp -p 3001:3000 demo-app:local
Start-Sleep -Seconds 3
curl http://localhost:3001/health
docker stop verify-ro; docker rm verify-ro
```

**CMD (Windows):**
```cmd
docker run -d --name verify-ro --read-only --tmpfs /tmp -p 3001:3000 demo-app:local
timeout /t 3 /nobreak
curl http://localhost:3001/health
docker stop verify-ro && docker rm verify-ro
```

**✅ Scan de vulnerabilidades con Trivy** (igual en bash, PowerShell y CMD):
```bash
trivy image demo-app:local --severity HIGH,CRITICAL
```

---

## 12. Despliegue en Kubernetes con Helm

> Los comandos `kubectl` y `helm` son iguales en bash, PowerShell y CMD.
> Los bloques multilínea con `\` en esta sección son para bash/Linux. En **PowerShell** reemplaza `\` por `` ` ``. En **CMD** escribe el comando en una sola línea.

### Requisitos previos

```bash
# Verificar conexión al cluster — igual en bash, PowerShell y CMD
kubectl cluster-info

# Verificar versión de Helm — igual en bash, PowerShell y CMD
helm version
# → version.BuildInfo{Version:"v3.xx...}
```

### Paso 1 — Crear el namespace

```bash
kubectl create namespace demo-app
```

### Paso 2 — (Solo si la imagen es privada) Crear secret de registry

**bash / Linux / macOS / WSL:**
```bash
kubectl create secret docker-registry dockerhub-creds \
  --docker-server=docker.io \
  --docker-username=TU_USUARIO_DOCKERHUB \
  --docker-password=TU_ACCESS_TOKEN \
  --namespace demo-app
```

**PowerShell (Windows):**
```powershell
kubectl create secret docker-registry dockerhub-creds `
  --docker-server=docker.io `
  --docker-username=TU_USUARIO_DOCKERHUB `
  --docker-password=TU_ACCESS_TOKEN `
  --namespace demo-app
```

**CMD (Windows):**
```cmd
kubectl create secret docker-registry dockerhub-creds --docker-server=docker.io --docker-username=TU_USUARIO_DOCKERHUB --docker-password=TU_ACCESS_TOKEN --namespace demo-app
```

### Paso 3 — Verificar el chart (dry-run)

**bash / Linux / macOS / WSL:**
```bash
helm template demo-app ./helm/demo-app \
  -f gitops/values.yaml \
  --namespace demo-app
```

**PowerShell (Windows):**
```powershell
helm template demo-app ./helm/demo-app `
  -f gitops/values.yaml `
  --namespace demo-app
```

**CMD (Windows):**
```cmd
helm template demo-app ./helm/demo-app -f gitops/values.yaml --namespace demo-app
```

### Paso 4 — Instalar

**bash / Linux / macOS / WSL:**
```bash
helm install demo-app ./helm/demo-app \
  -f gitops/values.yaml \
  --namespace demo-app
```

**PowerShell (Windows):**
```powershell
helm install demo-app ./helm/demo-app `
  -f gitops/values.yaml `
  --namespace demo-app
```

**CMD (Windows):**
```cmd
helm install demo-app ./helm/demo-app -f gitops/values.yaml --namespace demo-app
```

### Paso 5 — Verificar el deploy

```bash
# Ver pods
kubectl get pods -n demo-app
# → NAME                         READY   STATUS    RESTARTS
# → demo-app-xxxxxxxxx-xxxxx     1/1     Running   0

# Ver que el pod NO corre como root
kubectl exec -n demo-app deployment/demo-app -- whoami
# → appuser

# Ver los controles de seguridad aplicados
kubectl get pod -n demo-app -o json | jq '.items[0].spec.securityContext'
# → {"fsGroup":1001,"runAsGroup":1001,"runAsNonRoot":true,"runAsUser":1001}

# Ver NetworkPolicy
kubectl get networkpolicy -n demo-app

# Ver PodDisruptionBudget
kubectl get pdb -n demo-app
```

### Paso 6 — Acceder a la app

```bash
# Port-forward para acceso local
kubectl port-forward svc/demo-app 3000:3000 -n demo-app &

# Verificar endpoints
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Comandos útiles de Helm

> `helm history`, `helm rollback` y `helm uninstall` son iguales en bash, PowerShell y CMD.

```bash
# Ver historial de releases — igual en todas las plataformas
helm history demo-app -n demo-app

# Rollback a revisión anterior — igual en todas las plataformas
helm rollback demo-app -n demo-app

# Desinstalar (cuidado: elimina todos los recursos) — igual en todas las plataformas
helm uninstall demo-app -n demo-app
```

**Actualizar a nueva versión de imagen:**

**bash / Linux / macOS / WSL:**
```bash
helm upgrade demo-app ./helm/demo-app \
  -f gitops/values.yaml \
  --set image.tag=NUEVO_SHA \
  -n demo-app
```

**PowerShell (Windows):**
```powershell
helm upgrade demo-app ./helm/demo-app `
  -f gitops/values.yaml `
  --set image.tag=NUEVO_SHA `
  -n demo-app
```

**CMD (Windows):**
```cmd
helm upgrade demo-app ./helm/demo-app -f gitops/values.yaml --set image.tag=NUEVO_SHA -n demo-app
```

---

## 13. Configuración de ArgoCD (GitOps)

> Los comandos `kubectl apply`, `kubectl wait`, `argocd` y `kubectl get` son iguales en bash, PowerShell y CMD.
> Los bloques multilínea con `\` son para bash/Linux. En **PowerShell** usa `` ` ``; en **CMD** escribe en una sola línea.

### Paso 1 — Instalar ArgoCD en el cluster

**bash / Linux / macOS / WSL:**
```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml

kubectl wait --for=condition=Ready pod \
  -l app.kubernetes.io/name=argocd-server \
  --namespace argocd \
  --timeout=180s

kubectl get pods -n argocd
```

**PowerShell (Windows):**
```powershell
kubectl create namespace argocd
kubectl apply -n argocd `
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml

kubectl wait --for=condition=Ready pod `
  -l app.kubernetes.io/name=argocd-server `
  --namespace argocd `
  --timeout=180s

kubectl get pods -n argocd
```

**CMD (Windows):**
```cmd
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=argocd-server --namespace argocd --timeout=180s
kubectl get pods -n argocd
```

### Paso 2 — Obtener contraseña inicial de admin

**bash / Linux / macOS / WSL:**
```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
# Copia esta contraseña — la usarás en el siguiente paso
```

**PowerShell (Windows):**
```powershell
$pass = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($pass))
```

**CMD (Windows):**
```cmd
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
:: Copia el resultado y decodifícalo en: https://www.base64decode.org/
```

### Paso 3 — Acceder a la UI

```bash
# Port-forward (para desarrollo local)
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Abrir: https://localhost:8080
# Usuario: admin | Contraseña: la del paso anterior
# Acepta el certificado auto-firmado en el navegador
```

### Paso 4 — Instalar ArgoCD CLI

```bash
# Linux / macOS
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/v2.13.3/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Windows (PowerShell)
# Descargar desde: https://github.com/argoproj/argo-cd/releases/download/v2.13.3/argocd-windows-amd64.exe
# Renombrar a argocd.exe y agregar al PATH

# Verificar
argocd version --client
```

### Paso 5 — Login con CLI

**bash / Linux / macOS / WSL:**
```bash
argocd login localhost:8080 \
  --username admin \
  --password <contraseña-del-paso-2> \
  --insecure
```

**PowerShell (Windows):**
```powershell
argocd login localhost:8080 `
  --username admin `
  --password "<contraseña-del-paso-2>" `
  --insecure
```

**CMD (Windows):**
```cmd
argocd login localhost:8080 --username admin --password <contraseña-del-paso-2> --insecure
```

### Paso 6 — Crear service account para el pipeline

```bash
# Editar el ConfigMap de ArgoCD para agregar la cuenta "pipeline"
kubectl -n argocd edit configmap argocd-cm
# Agregar bajo la sección data:
# accounts.pipeline: apiKey

# Generar token de API (guardar este valor como secret ARGOCD_TOKEN en GitHub)
argocd account generate-token --account pipeline
# Copia el token que aparece — solo se muestra una vez
```

### Paso 7 — Registrar el repositorio (si es privado)

**bash / Linux / macOS / WSL:**
```bash
argocd repo add https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git \
  --username TU_USUARIO_GITHUB \
  --password TU_PAT_GITHUB
```

**PowerShell (Windows):**
```powershell
argocd repo add https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git `
  --username TU_USUARIO_GITHUB `
  --password TU_PAT_GITHUB
```

**CMD (Windows):**
```cmd
argocd repo add https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git --username TU_USUARIO_GITHUB --password TU_PAT_GITHUB
```

> El PAT de GitHub necesita permisos: `repo` (lectura).

### Paso 8 — Aplicar el Application manifest

```bash
kubectl apply -f argocd/application.yaml

# Verificar que ArgoCD detectó la aplicación
argocd app list
# → NAME       CLUSTER  NAMESPACE  PROJECT  STATUS     HEALTH
# → demo-app   ...      demo-app   default  OutOfSync  Missing
```

### Paso 9 — Forzar el primer sync manual

```bash
argocd app sync demo-app
argocd app wait demo-app --health --sync --timeout 300
```

### Comandos útiles de ArgoCD

```bash
# Ver estado detallado
argocd app get demo-app

# Ver historial de syncs
argocd app history demo-app

# Rollback a revisión anterior
argocd app rollback demo-app

# Ver diferencias (lo que ArgoCD aplicaría)
argocd app diff demo-app

# Forzar refresh (volver a leer Git)
argocd app refresh demo-app
```

---

## 14. Configuración de GitHub Actions

### Secrets requeridos

Ir a: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Descripción | Requerido para |
|--------|-------------|---------------|
| `DOCKERHUB_USERNAME` | Usuario de DockerHub | Build + Push (obligatorio) |
| `DOCKERHUB_TOKEN` | Access Token DockerHub | Build + Push (obligatorio) |
| `ARGOCD_SERVER` | Hostname ArgoCD sin `https://` | Fase CD (opcional al inicio) |
| `ARGOCD_TOKEN` | Token SA `pipeline` ArgoCD | Fase CD (opcional al inicio) |
| `DEPLOY_APP_URL` | URL pública de la app | Smoke tests (opcional al inicio) |

> **Sin `ARGOCD_SERVER`, `ARGOCD_TOKEN` y `DEPLOY_APP_URL`**: el pipeline CI/Build/Push funciona al 100%. La fase CD (`cd-verify.yml`) mostrará un mensaje de advertencia pero no fallará.

### Cómo verificar que los secrets están configurados

En la pestaña **Actions** de un run completado, busca en los logs del job `deploy-verify`:
- Si ves `✅ ArgoCD configurado` → los secrets de ArgoCD están activos
- Si ves `⚠️ ARGOCD_SERVER o ARGOCD_TOKEN no configurados` → agregar los secrets

### Branch Protection (recomendado para producción)

Ir a: **Settings → Branches → Add rule** para `main`:

```
✅ Require a pull request before merging
✅ Require approvals: 1
✅ Require status checks to pass before merging:
    - CI — Tests + Security Scanning
    - Build + DAST + Push
✅ Require branches to be up to date before merging
✅ Include administrators (para que aplique a todos)
```

### Monitoreo del pipeline

| Dónde mirar | Qué ver |
|-------------|---------|
| GitHub → Actions | Todos los runs con sus logs detallados |
| GitHub → Security → Code scanning | Reportes SARIF de Trivy (HIGH/CRITICAL) |
| GitHub → Deployments | Historial de deploys: success, failure, in_progress |
| GitHub → Actions → [run] → Summary | Resumen visual generado por cada job |
| GitHub → Actions → [run] → Artifacts | SBOM, coverage report, logs DAST |

---

## 15. Demos para Clientes

Las demos son **archivos HTML completamente independientes**. No requieren servidor web, Node.js, ni ninguna instalación. Solo un navegador moderno (Chrome, Firefox, Edge, Safari).

### Cómo abrir las demos

**Opción 1 — Doble clic** (recomendada, todas las plataformas):
Navegar a la carpeta `demo/` y hacer doble clic en `index.html`.

**Opción 2 — Comando en terminal:**

**PowerShell / CMD (Windows):**
```cmd
start demo\index.html
```

**bash / macOS:**
```bash
open demo/index.html
```

**bash / Linux:**
```bash
xdg-open demo/index.html
```

**Opción 3 — Arrastrar al navegador:**
Arrastrar `demo/index.html` a cualquier ventana abierta del navegador.

### Páginas disponibles

| Archivo | Demo | Descripción |
|---------|------|-------------|
| `demo/index.html` | Portal selector | Elige qué demo mostrar al cliente |
| `demo/sumas-soluciones.html` | Sumas y Soluciones | Portal de crédito de libranza para pensionados — simulador interactivo, colores corporativos naranja `#FB5C04` / gris `#8E8E8E` |
| `demo/credibanco.html` | Credibanco | Landing page corporativa de soluciones de pago — identidad real: teal `#00AFAA`, navy `#124734`, amarillo `#FFC600` |

### Características técnicas de las demos

| Característica | Detalle |
|----------------|---------|
| Standalone | Un solo archivo HTML sin dependencias locales |
| Sin instalación | Solo requiere un navegador moderno |
| Responsive | Adaptado para pantallas grandes, tablet y móvil |
| Sin datos reales | Todo el contenido es ilustrativo |
| Marca "Demo" | Ribbon naranja/dorado visible en la esquina superior derecha |
| Navegación | Botón "← Volver al portal" en cada demo |
| Fuentes | Google Fonts vía CDN (requiere internet para verse con la fuente original) |
| Sin internet | Si no hay internet, las fuentes caen al fallback del sistema (se ven bien igualmente) |

### Nota sobre la demo de Credibanco

La demo de Credibanco incluye un panel de "Centro de Operaciones de Seguridad" con alertas animadas en tiempo real (simuladas con CSS). Esto es puramente visual y no conecta a ningún sistema real. Ideal para demostrar capacidades de monitoreo de seguridad financiera.

---

## 16. Variables de Entorno y Log Levels

### Variables de la aplicación

| Variable | Valores posibles | Default | Efecto |
|----------|-----------------|---------|--------|
| `PORT` | número | `3000` | Puerto de escucha del servidor Express |
| `NODE_ENV` | `production` \| `development` | `development` | `production` → JSON logs; otro → colores |
| `LOG_LEVEL` | `trace` `debug` `info` `warn` `error` `fatal` | `info` | Nivel mínimo de logs a emitir |
| `APP_NAME` | string | `demo-app` | Nombre del servicio en cada entrada de log |

### Cómo usar el logger en el código

```javascript
const logger = require('./logger');

// Logs simples con metadatos estructurados
logger.trace('Executing DB query', { sql: 'SELECT * FROM users', params: [42] });
logger.debug('Processing item', { id: 42, step: 'validation' });
logger.info('Server started', { port: 3000, env: process.env.NODE_ENV });
logger.warn('High memory usage', { used: '85%', threshold: '80%' });
logger.error('Payment failed', { transactionId: 'TX-001', reason: 'timeout' });
logger.fatal('DB connection lost', { host: 'db:5432', retries: 3 });

// Child logger — contexto fijo para un subsistema o request
const reqLogger = logger.child({ requestId: 'req-abc-123', userId: 42 });
reqLogger.info('Processing payment');
// → { "requestId": "req-abc-123", "userId": 42, "message": "Processing payment", ... }

// Sub-child — agrega más contexto al child
const txLogger = reqLogger.child({ transactionId: 'TX-999' });
txLogger.info('Transaction authorized');
// → { "requestId": "req-abc-123", "userId": 42, "transactionId": "TX-999", ... }

// Ver el nivel activo en runtime
console.log(logger.level); // → "info"
```

### Cambiar el nivel de log en Kubernetes sin reiniciar el pod

> `kubectl set env` es igual en bash, PowerShell y CMD.

```bash
# Cambiar a debug temporalmente — igual en todas las plataformas
kubectl set env deployment/demo-app LOG_LEVEL=debug -n demo-app
# (K8s hace un rolling update automático — ~10 segundos de interrupción mínima)

# Restaurar a info cuando ya no necesites el debug
kubectl set env deployment/demo-app LOG_LEVEL=info -n demo-app
```

---

## 17. Troubleshooting

### El pipeline falla en "GitLeaks — secret scanning"

**Causa**: GitLeaks detectó un token, contraseña o secreto en el código o historial de commits.

**Diagnóstico**:
**bash / Linux / macOS / WSL:**
```bash
docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest \
  detect --source /repo --config /repo/.gitleaks.toml -v
```

**PowerShell (Windows):**
```powershell
docker run --rm -v "${PWD}:/repo" zricethezav/gitleaks:latest detect --source /repo --config /repo/.gitleaks.toml -v
```

**CMD (Windows):**
```cmd
docker run --rm -v "%cd%:/repo" zricethezav/gitleaks:latest detect --source /repo --config /repo/.gitleaks.toml -v
```

**Solución**:
1. Si el secreto es un falso positivo → agregar al `allowlist.regexes` en `.gitleaks.toml`
2. Si es un secreto real → **rotar el secreto inmediatamente**, luego limpiar el historial:
```bash
# Con git-filter-repo (recomendado)
pip install git-filter-repo
git filter-repo --path archivo-con-secreto --invert-paths
git push origin --force
```

### El pipeline falla en "Trivy ... bloquear en CRITICAL"

**Causa**: Trivy encontró vulnerabilidades CRITICAL con fix disponible en las dependencias o imagen base.

**Diagnóstico**:
```bash
trivy fs --severity CRITICAL --ignore-unfixed .
trivy image --severity CRITICAL --ignore-unfixed <imagen>
```

**Solución**:
```bash
cd app
npm update                    # Actualizar todas las dependencias
npm audit fix                 # Fix automático de vulnerabilidades conocidas
npm audit fix --force         # Fix forzado (puede romper compatibilidad — revisar)
```

Para vulnerabilidades en la imagen base:
```dockerfile
# En Dockerfile, usar una versión más reciente de node:20-alpine
FROM node:20-alpine AS deps   # node:20.x.x-alpine para versión específica
```

### Error "ImagePullBackOff" en Kubernetes

**Causa**: El cluster no puede descargar la imagen (imagen privada sin credenciales, o imagen no existe).

**Diagnóstico** (igual en bash, PowerShell y CMD):
```bash
kubectl describe pod <pod-name> -n demo-app
```

**Solución:**

**bash / Linux / macOS / WSL:**
```bash
kubectl create secret docker-registry dockerhub-creds \
  --docker-server=docker.io \
  --docker-username=TU_USUARIO \
  --docker-password=TU_ACCESS_TOKEN \
  --namespace demo-app

kubectl patch serviceaccount demo-app -n demo-app \
  -p '{"imagePullSecrets": [{"name": "dockerhub-creds"}]}'
```

**PowerShell (Windows):**
```powershell
kubectl create secret docker-registry dockerhub-creds `
  --docker-server=docker.io `
  --docker-username=TU_USUARIO `
  --docker-password=TU_ACCESS_TOKEN `
  --namespace demo-app

kubectl patch serviceaccount demo-app -n demo-app `
  -p '{"imagePullSecrets": [{"name": "dockerhub-creds"}]}'
```

**CMD (Windows):**
```cmd
kubectl create secret docker-registry dockerhub-creds --docker-server=docker.io --docker-username=TU_USUARIO --docker-password=TU_ACCESS_TOKEN --namespace demo-app
kubectl patch serviceaccount demo-app -n demo-app -p "{\"imagePullSecrets\": [{\"name\": \"dockerhub-creds\"}]}"
```

### El pod queda en "CrashLoopBackOff"

**Diagnóstico**:
```bash
kubectl logs <pod-name> -n demo-app --previous
kubectl describe pod <pod-name> -n demo-app | grep -A 20 Events
```

**Causa común**: `readOnlyRootFilesystem: true` impide escrituras en paths que la app usa.

**Verificación**:

**bash / Linux / macOS / WSL:**
```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  --user 1001:1001 \
  demo-app:local
```

**PowerShell (Windows):**
```powershell
docker run --rm `
  --read-only `
  --tmpfs /tmp `
  --user 1001:1001 `
  demo-app:local
```

**CMD (Windows):**
```cmd
docker run --rm --read-only --tmpfs /tmp --user 1001:1001 demo-app:local
```

Si funciona localmente, el Dockerfile está bien. Si falla → la app intenta escribir en un path que no es `/tmp`.

### La NetworkPolicy bloquea el tráfico

**Diagnóstico**:
```bash
# Ver si el CNI soporta NetworkPolicy
kubectl get nodes -o wide
# Si usas Flannel puro → no soporta NetworkPolicy

# Ver la NetworkPolicy activa
kubectl get networkpolicy -n demo-app -o yaml
```

**Solución temporal** (desactivar NetworkPolicy):
```bash
# En gitops/values.yaml:
# networkPolicy:
#   enabled: false

helm upgrade demo-app ./helm/demo-app -f gitops/values.yaml -n demo-app
```

**Solución permanente**: instalar Calico o Cilium como CNI, o instalar el plugin NetworkPolicy para Flannel.

### ArgoCD no sincroniza automáticamente

**Diagnóstico**:
```bash
argocd app get demo-app
# Ver si hay errores en el sync status
```

**Solución**:
```bash
# Forzar refresh
argocd app refresh demo-app

# Forzar sync
argocd app sync demo-app --force

# Ver si ArgoCD puede acceder al repositorio
argocd repo list
```

### El PR de GitOps no se crea

**Causa**: El GITHUB_TOKEN no tiene permisos de crear PRs.

**Solución**:
- Ir a: **Settings → Actions → General**
- Asegurarse de que "Read and write permissions" está seleccionado
- Marcar ✅ "Allow GitHub Actions to create and approve pull requests"

### `gh` no se reconoce en PowerShell/CMD después de instalar

**Error**:
```
gh: The term 'gh' is not recognized as a name of a cmdlet, function, script file, or executable program.
```

**Causa**: `winget` modifica el PATH del sistema, pero la terminal abierta antes de la instalación ya tiene su copia del PATH en memoria y no ve el cambio.

**Solución 1 — Reiniciar VS Code** (más rápido):
Cierra VS Code completamente y vuelve a abrirlo. La nueva terminal tendrá el PATH actualizado.

**Solución 2 — Refrescar el PATH sin cerrar** (PowerShell):
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
gh --version
```

### Comandos multilínea con `\` fallan en PowerShell (`Missing expression after unary operator '--'`)

**Error**:
```
ParserError:
Line |
   2 |    --name demo-app-test \
     |      ~
     | Missing expression after unary operator '--'.
```

**Causa**: En PowerShell, el carácter de continuación de línea es el backtick `` ` ``, no la barra invertida `\` (que es sintaxis de bash/Linux). Cualquier comando copiado de documentación Linux con `\` al final de línea fallará en PowerShell.

**Solución**: Poner el comando en una sola línea (más seguro y portable en Windows):
```powershell
docker run -d --name demo-app-test -p 3000:3000 -e NODE_ENV=production -e LOG_LEVEL=info demo-app:local
```

O usar backtick `` ` `` si necesitas multilínea en PowerShell:
```powershell
docker run -d `
  --name demo-app-test `
  -p 3000:3000 `
  demo-app:local
```

### `$env:NODE_ENV="development"; node src/index.js` falla en CMD

**Error**:
```
El nombre de archivo, el nombre de directorio o la sintaxis de la etiqueta del volumen no son correctos.
```

**Causa**: La sintaxis `$env:VAR="valor"` es exclusiva de **PowerShell**. En **Command Prompt (cmd)** no es válida.

**Solución — usar según tu terminal**:

PowerShell:
```powershell
$env:NODE_ENV="development"; node src/index.js
```

Command Prompt (cmd):
```cmd
set NODE_ENV=development && node src/index.js
```

> **Tip**: Para evitar confusión, cambia el terminal por defecto de VS Code a PowerShell:
> `Ctrl+Shift+P` → `Terminal: Select Default Profile` → selecciona **PowerShell**

### `docker build` falla con `failed to connect to the docker API`

**Error**:
```
ERROR: failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine;
check if the path is correct and if the daemon is running:
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Causa**: Docker Desktop está instalado pero no está corriendo. El daemon de Docker debe estar activo antes de ejecutar cualquier comando `docker`.

**Solución**:
1. Abre **Docker Desktop** desde el menú Inicio (o busca el ícono en la barra de tareas)
2. Espera a que el ícono de la ballena 🐳 en la barra de tareas deje de animarse
3. Verifica que el estado muestra **"Engine running"**
4. Vuelve a ejecutar el comando `docker build`

**Verificación rápida**:
```powershell
docker info   # Debe mostrar información del servidor, no un error
```

---

## 18. Mantenimiento y Operaciones

### Actualizar la versión de Trivy

```bash
# En .github/workflows/triggerci.yml, buscar y cambiar:
TRIVY_VERSION: "v0.56.1"
# Por la nueva versión. Ver: https://github.com/aquasecurity/trivy/releases
```

### Actualizar la imagen base de Docker

```bash
# En Dockerfile, verificar la versión LTS más reciente de node:20-alpine:
# https://hub.docker.com/_/node/tags?name=20-alpine
# Cambiar FROM node:20-alpine por FROM node:20.X.X-alpine para versión fija
```

### Revisión trimestral del `.trivyignore`

El archivo `.trivyignore` tiene una fecha de revisión. Cada trimestre:
1. Ejecutar `trivy image` contra la imagen más reciente
2. Para cada CVE ignorada: verificar si ya hay un fix disponible
3. Si hay fix → eliminar la entrada y actualizar la dependencia
4. Si no hay fix → actualizar la fecha de revisión

### Revisión trimestral del `.zap/rules.tsv`

1. Revisar cada supresión con su justificación
2. Verificar si la razón de supresión sigue siendo válida
3. Actualizar o eliminar supresiones obsoletas

### Escalar la aplicación

**Vía GitOps (recomendado)** — igual en bash, PowerShell y CMD:
```bash
# Editar gitops/values.yaml cambiando: replicaCount: 3
git add gitops/values.yaml
git commit -m "ops: scale demo-app to 3 replicas"
git push origin main
# ArgoCD sincroniza automáticamente
```

**Vía Helm manual:**

**bash / Linux / macOS / WSL:**
```bash
helm upgrade demo-app ./helm/demo-app \
  -f gitops/values.yaml \
  --set replicaCount=3 \
  -n demo-app
```

**PowerShell (Windows):**
```powershell
helm upgrade demo-app ./helm/demo-app `
  -f gitops/values.yaml `
  --set replicaCount=3 `
  -n demo-app
```

**CMD (Windows):**
```cmd
helm upgrade demo-app ./helm/demo-app -f gitops/values.yaml --set replicaCount=3 -n demo-app
```

### Ver el estado general del sistema

> `kubectl get all`, `kubectl top`, `argocd app list` son iguales en bash, PowerShell y CMD.

**bash / Linux / macOS / WSL:**
```bash
kubectl get all -n demo-app

kubectl get events -n demo-app \
  --sort-by='.lastTimestamp' | tail -20

kubectl top pod -n demo-app

argocd app list
argocd app get demo-app
```

**PowerShell (Windows):**
```powershell
kubectl get all -n demo-app

kubectl get events -n demo-app --sort-by='.lastTimestamp' | Select-Object -Last 20

kubectl top pod -n demo-app

argocd app list
argocd app get demo-app
```

**CMD (Windows):**
```cmd
kubectl get all -n demo-app
kubectl get events -n demo-app --sort-by=.lastTimestamp
kubectl top pod -n demo-app
argocd app list
argocd app get demo-app
```

---

> **Repositorio**: [https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO](https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO)
>
> **Mantenido por**: NAFELOPEZ — Prueba técnica DevSecOps CBCO · 2026
