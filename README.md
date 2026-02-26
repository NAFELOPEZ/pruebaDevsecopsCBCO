# pruebaDevsecopsCBCO — Prueba técnica DevSecOps (CredibanCo)

Este repositorio implementa un flujo DevSecOps **end-to-end** con:
- **CI** (tests + coverage)
- **Seguridad** (SAST/SCA/DAST)
- **Build & Push** de imagen Docker versionada por **SHA**
- **GitOps** actualizando `gitops/values.yaml` mediante **PR automático** (compatible con Branch Protection)
- **Gobernanza** (PR obligatorio + CodeOwners + checks obligatorios)

---

## 0) Re

1. Un PR hacia `main` queda bloqueado sin:
   - aprobación de CodeOwner
   - checks verdes (GitHub Actions)

2. El workflow `triggerci`:
   - corre tests y **coverage >= 80%**
   - corre SAST / SCA / DAST
   - construye imagen Docker y la publica en DockerHub con:
     - tag `latest`
     - tag **SHA corto**
   - actualiza `gitops/values.yaml` **mediante PR automático** (sin pushear directo a `main`)

3. `gitops/values.yaml` termina con el tag SHA de la imagen publicada.

---

## 1) Arquitectura (alto nivel)

```mermaid
flowchart LR
  A[Dev crea rama/PR] --> B[Branch Protection
PR obligatorio + CodeOwners]
  B --> C[Review (Approved)]
  C --> D[GitHub Actions triggerci]
  D --> D1[Tests + Coverage >=80%]
  D --> D2[SAST: Semgrep + ESLint]
  D --> D3[SCA: npm audit + Trivy]
  D --> D4[Build Docker]
  D --> D5[DAST: OWASP ZAP (baseline)]
  D --> E[Push a DockerHub
:latest + :<SHA>]
  E --> F[Update gitops/values.yaml]
  F --> G[PR automático GitOps]
  G --> H[Merge PR GitOps]
  H --> I[GitOps listo para ArgoCD]
```

---

## 2) Requisitos

### 2.1 En local (para ejecutar app/tests/Docker)
- Git
- Node.js (recomendado v20 o superior)
- Docker Desktop

### 2.2 En GitHub
- Acceso para configurar:
  - Secrets de Actions
  - Branch protection
  - Permisos de workflow

### 2.3 En DockerHub
- Usuario: `nahumtestaccount`
- Repositorio: `demo-app`
- Token con permisos de push

---

## 3) Estructura del repo

- `.github/workflows/triggerci.yml` → pipeline CI/Security/Build/GitOps PR
- `.github/CODEOWNERS` → CodeOwners
- `app/` → app Node.js + tests
- `Dockerfile` → imagen de runtime
- `gitops/values.yaml` → fuente GitOps (tag de imagen)
- `helm/demo-app/` → Helm chart (plantillas)
- `argocd/application.yaml` → manifiesto Application de ArgoCD

---

## 4) Ejecutar en local (para validar funcionamiento)

### 4.1 Instalar dependencias, correr tests y coverage
```bash
cd app
npm install
npm test
npm run test:coverage
```

**Resultado esperado:** tests pasan y el coverage cumple el umbral configurado.

### 4.2 Ejecutar la app local
```bash
npm start
```

Endpoints:
- `GET /` → JSON con `message`
- `GET /health` → `{ "status": "ok" }`
- `GET /health?full=true` → `{ "status": "ok", "mode": "full" }`

Detener: `Ctrl + C`.

### 4.3 Construir y correr con Docker
Desde la raíz del repo:
```bash
cd D:\DevelopFiles\P_tec_CBCO\pruebaDevsecopsCBCO
docker build -t demo-app:test .
docker run -p 3000:3000 demo-app:test
```

Probar en navegador:
- `http://localhost:3000/`
- `http://localhost:3000/health`
- `http://localhost:3000/health?full=true`

Detener: `Ctrl + C`.

---

## 5) Configuración en DockerHub (obligatorio para el pipeline)

### 5.1 Crear repositorio
En DockerHub:
- Crear repo: `demo-app` (Public para simplificar pruebas)

### 5.2 Crear Access Token
En DockerHub:
- Account Settings → Security → Access Tokens → New Token
- Nombre: `github-actions`
- Copiar el token
- To use the access token from your Docker CLI client:
    1. Run
        `docker login -u nahumtestaccount`

    2. At the password prompt, enter the personal access token.
        `dckr_pat_y5mdMVK56K4cBkUpRtUs5Uoy5qY`

---

## 6) Configuración en GitHub (obligatorio para el pipeline)

### 6.1 Secrets de GitHub Actions
En GitHub:
- Repo → Settings → Secrets and variables → Actions → New repository secret

Crear:
- `DOCKERHUB_USERNAME` = `nahumtestaccount`
- `DOCKERHUB_TOKEN` = (token de DockerHub)

### 6.2 Permisos para que Actions cree PRs (clave para GitOps)
En GitHub:
- Repo → Settings → Actions → General
- Workflow permissions:
  - **Read and write permissions**
  - **Allow GitHub Actions to create and approve pull requests**

> Sin esto, el paso de PR automático fallará.

### 6.3 CODEOWNERS
Archivo: `.github/CODEOWNERS`

Ejemplo:
```txt
* @NAFELOPEZ @Nahum-dev-retest-account
```

### 6.4 Branch protection (gobernanza)
En GitHub:
- Repo → Settings → Branches → Add branch protection rule
- Branch name pattern: `main`

Activar:
- Require a pull request before merging
- Require approvals (1)
- Require review from Code Owners
- Require status checks to pass before merging (seleccionar `triggerci`)
- Require conversation resolution before merging

---

## 7) Para el evaluador (cómo ejecutar el escenario completo)

### Paso 1 — Crear una rama y abrir PR
En local:
```bash
git checkout -b feature/demo-pr
# hacer un cambio mínimo (por ejemplo un texto en app/src/index.js)
git add .
git commit -m "test: demo PR flow"
git push -u origin feature/demo-pr
```

En GitHub:
- Abrir Pull Request hacia `main`.

### Paso 2 — Aprobar PR (CodeOwner)
Con la cuenta CodeOwner (p.ej. `Nahum-dev-retest-account`):
- PR → Files changed → Review changes → Approve → Submit review

### Paso 3 — Verificar checks
En el PR:
- esperar a que `triggerci` quede verde.

### Paso 4 — Merge del PR
Cuando haya:
- aprobación ✅
- checks ✅

Hacer merge.

### Paso 5 — Validar Build & Push a DockerHub
En DockerHub (`nahumtestaccount/demo-app`):
- tags:
  - `latest`
  - `<sha-corto>`

### Paso 6 — Validar GitOps por PR automático
Tras el merge, el pipeline:
- actualiza `gitops/values.yaml`
- crea un PR automático tipo: `ci: update image tag to <sha>`

En GitHub:
- revisar Pull Requests y abrir el PR automático
- aprobarlo (si aplica)
- mergearlo

### Paso 7 — Validación final
En GitHub:
- `gitops/values.yaml` en `main` debe mostrar el tag SHA actualizado.

---

## 8) Qué hace el pipeline `triggerci` (resumen)

- Unit tests + coverage (Jest)
- Lint (ESLint)
- SAST (Semgrep)
- SCA (npm audit + Trivy FS + Trivy image)
- DAST (OWASP ZAP baseline) sobre contenedor levantado en el runner
- Build & Push Docker (tag SHA + latest) a DockerHub
- Update GitOps (`gitops/values.yaml`) mediante PR automático (create-pull-request)

---

## 9) Troubleshooting (errores típicos)

### 9.3 `GH006: Protected branch update failed`
- causa: branch protection no permite push directo a `main`
- solución: usar PR automático GitOps (ya implementado) o ajustar governance.

### 9.4 Coverage < 80%
- causa: rutas/branches no cubiertos
- solución: ajustar tests o excluir entrypoints de cobertura (con `istanbul ignore next`).