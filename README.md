# DevSecOps Pipeline — Prueba Técnica CBCO

> Pipeline CI/CD completo con seguridad integrada (shift-left) para aplicación Node.js, desplegada en Kubernetes con GitOps.

---

## Descripción

Implementación end-to-end de un pipeline **DevSecOps** que integra **10+ herramientas de seguridad** en cada fase del ciclo de desarrollo. El proyecto demuestra:

- **CI automatizado** con tests, linting y 6 tipos de análisis de seguridad
- **Build seguro** con Docker multi-stage, escaneo de imágenes y DAST
- **CD GitOps** con ArgoCD, verificación automática y rollback ante fallos
- **Infraestructura hardened** con controles de seguridad en Kubernetes

---

## Arquitectura

```
  Developer                    GitHub Actions                         Kubernetes
  ─────────                    ──────────────                         ──────────
                          ┌─────────────────────────┐
   git push ──────────►   │  triggerci.yml (CI)      │
                          │                          │
                          │  ┌─ Tests + Coverage     │
                          │  ├─ ESLint               │
                          │  ├─ GitLeaks (secrets)   │       ┌──────────────────┐
                          │  ├─ Semgrep (SAST)       │       │   ArgoCD         │
                          │  ├─ npm audit (SCA)      │       │   (GitOps)       │
                          │  ├─ Trivy FS (vulns)     │       │                  │
                          │  ├─ SBOM (inventory)     │──────►│  auto-sync       │
                          │  ├─ Docker build+push    │       │  self-heal       │
                          │  ├─ Trivy image scan     │       │  auto-rollback   │
                          │  ├─ ZAP (DAST)           │       └───────┬──────────┘
                          │  └─ GitOps PR (auto)     │               │
                          └─────────────────────────┘               ▼
                          ┌─────────────────────────┐       ┌──────────────────┐
                          │  cd-verify.yml (CD)      │       │  Pod (hardened)  │
                          │                          │       │  ┌────────────┐  │
                          │  ├─ ArgoCD sync wait     │       │  │ non-root   │  │
                          │  ├─ Smoke tests          │       │  │ read-only  │  │
                          │  ├─ Deployment status    │       │  │ drop caps  │  │
                          │  └─ Auto-rollback        │       │  │ probes x3  │  │
                          └─────────────────────────┘       │  └────────────┘  │
                                                            │  NetworkPolicy   │
                                                            │  PDB             │
                                                            └──────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **App** | Node.js + Express | 20 LTS + 4.21.2 |
| **Tests** | Jest + Supertest | 29.7.0 + 7.0.0 |
| **Lint** | ESLint | 9.21.0 |
| **Container** | Docker (multi-stage, alpine) | node:20-alpine |
| **Registry** | Docker Hub | — |
| **CI/CD** | GitHub Actions | Ubuntu latest |
| **Charts** | Helm 3 | 0.1.0 |
| **GitOps** | ArgoCD | v2.13.3 |
| **Cluster** | Kubernetes | 1.27 – 1.31 |
| **SAST** | Semgrep OSS | v1 |
| **SCA** | npm audit + Trivy | v0.69.3 |
| **DAST** | OWASP ZAP Baseline | v0.12.0 |
| **Secrets** | GitLeaks | v2 |
| **SBOM** | Trivy (SPDX-JSON) | v0.56.1 |

---

## Estructura del Repositorio

```
pruebaDevsecopsCBCO/
├── .github/workflows/
│   ├── triggerci.yml            # CI: tests, security scans, build, push, GitOps PR
│   └── cd-verify.yml            # CD: ArgoCD sync verification + rollback
├── app/
│   ├── src/
│   │   ├── index.js             # Express server (/, /health endpoints)
│   │   └── logger.js            # Structured JSON logging
│   ├── test/app.test.js         # Jest + Supertest tests
│   ├── package.json
│   └── eslint.config.js
├── helm/demo-app/
│   ├── Chart.yaml
│   ├── values.yaml              # Defaults con security hardening
│   └── templates/               # Deployment, Service, NetworkPolicy, PDB, SA
├── argocd/
│   └── application.yaml         # ArgoCD Application resource
├── gitops/
│   └── values.yaml              # Production overrides (auto-updated by CI)
├── demo/                        # Standalone HTML client demos
│   ├── index.html
│   ├── sumas-soluciones.html
│   └── credibanco.html
├── Dockerfile                   # Multi-stage, non-root UID 1001
├── .gitleaks.toml               # Secret scanning config
├── .trivyignore                 # Vulnerability suppressions
└── .zap/rules.tsv               # DAST suppressions
```

---

## Pipeline DevSecOps

### CI — `triggerci.yml`

> Se dispara en: `push` a main, `pull_request` a main, `pull_request_review` aprobado.

| Job | Fase | Herramientas | Bloquea |
|-----|------|-------------|---------|
| **ci** | Tests | Jest (≥80% coverage) | Si |
| | Lint | ESLint | Si |
| | Secret Scan | GitLeaks | Si (siempre) |
| | SAST | Semgrep (p/javascript, p/nodejs, p/security-audit) | No |
| | SCA | npm audit (CRITICAL) | Si |
| | Vuln Scan | Trivy FS (CRITICAL con fix) | Si |
| | Inventory | SBOM SPDX-JSON (90 días retención) | No |
| **build-push** | Build | Docker multi-stage + Buildx | Si |
| | Image Scan | Trivy image → SARIF | Si |
| | DAST | OWASP ZAP baseline | No |
| | Push | Docker Hub (solo en main) | — |
| **update-gitops** | GitOps | Actualiza image tag → crea PR auto-merge | — |

### CD — `cd-verify.yml`

| Job | Acción | Detalle |
|-----|--------|---------|
| **deploy-verify** | ArgoCD sync wait | Espera Healthy + Synced (5 min timeout) |
| | Smoke tests | GET /, /health, /health?full=true |
| | Deployment status | Actualiza GitHub Deployments |
| **rollback** | Auto-rollback | Revierte a revisión anterior si fallan smoke tests |

> El CD funciona en **modo degradado** si no hay cluster/ArgoCD configurado — el pipeline pasa con warnings.

---

## Controles de Seguridad

### Dockerfile
- Multi-stage build (solo prod dependencies en imagen final ~50MB)
- `npm ci --ignore-scripts` — previene post-install injection
- Non-root user (UID/GID 1001)
- HEALTHCHECK nativo sin curl

### Kubernetes (Helm)
- `runAsNonRoot: true` — forzado por K8s admission
- `readOnlyRootFilesystem: true` — solo /tmp writable (emptyDir)
- `allowPrivilegeEscalation: false`
- `capabilities: drop ALL`
- NetworkPolicy: solo ingress desde ingress-nginx, egress DNS + HTTPS
- PodDisruptionBudget: minAvailable 1
- Resource limits: 300m CPU, 256Mi RAM
- 3 probes: startup, readiness, liveness en /health
- ServiceAccount sin auto-mount token

### Aplicación (Express)
- `x-powered-by` deshabilitado — previene fingerprinting del servidor

### Pipeline
- Permisos mínimos por job (principle of least privilege)
- Image tags inmutables (SHA del commit, nunca :latest)
- SBOM + provenance de imagen (supply chain security)
- GitLeaks bloquea siempre (no exceptions en pipeline)
- CI obligatorio en PRs (pull_request trigger)
- Code review obligatorio (validate-pr-approval)

---

## Quick Start

```bash
# Clonar e instalar
git clone https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git
cd pruebaDevsecopsCBCO/app
npm ci

# Tests y lint
npm test
npm run lint

# Ejecutar localmente
npm start
# → http://localhost:3000
# → http://localhost:3000/health
```

```bash
# Docker
docker build -t demo-app:local .
docker run -d -p 3000:3000 --name demo-app demo-app:local
curl http://localhost:3000/health
```

---

## Demos

El directorio `demo/` contiene prototipos HTML standalone para clientes:

| Demo | Descripción |
|------|-------------|
| [index.html](demo/index.html) | Portal selector de demos |
| [sumas-soluciones.html](demo/sumas-soluciones.html) | Portal de crédito de libranza — colores #FB5C04 / #8E8E8E |
| [credibanco.html](demo/credibanco.html) | Soluciones de pago — colores #00AFAA / #124734 |

Abrir directamente en el navegador (doble clic). No requieren instalación.

---

## Documentación Detallada

| Documento | Contenido |
|-----------|-----------|
| [Guía de Ejecución Completa](docs/GUIA_EJECUCION.md) | Paso a paso: local, Docker, pipeline CI, CD con ArgoCD |
| [Guía de Ejecución — Troubleshooting](docs/GUIA_EJECUCION.md#troubleshooting) | Todos los errores conocidos y soluciones verificadas |
| [Guía de Ejecución — Mantenimiento](docs/GUIA_EJECUCION.md#mantenimiento-y-operaciones) | Actualizaciones, escalamiento, operaciones |

---

## Endpoints de la App

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/` | `{"message": "Hello from DevSecOps technical test to CBCO!!!!!!"}` |
| GET | `/health` | `{"status": "ok"}` |
| GET | `/health?full=true` | `{"status": "ok", "mode": "full"}` |

---

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 3000 | Puerto del servidor |
| `NODE_ENV` | production | Modo de ejecución |
| `LOG_LEVEL` | info | Nivel de log (trace, debug, info, warn, error, fatal) |

---

## Licencia

Proyecto de prueba técnica — uso interno CBCO.

