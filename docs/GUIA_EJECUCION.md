# Guía de Ejecución Completa

> Paso a paso para ejecutar el proyecto localmente, en Docker, en GitHub Actions y con ArgoCD en Kubernetes.

---

## Convenciones de Terminal

En esta guía todos los comandos se presentan en variantes para las tres plataformas principales:

| Terminal | Continuación de línea | Variables de entorno | Directorio actual |
|----------|-----------------------|---------------------|-------------------|
| **bash / Linux / macOS / WSL** | `\` | `KEY=value comando` | `$(pwd)` |
| **PowerShell (Windows)** | `` ` `` (backtick) | `$env:KEY="value"; comando` | `${PWD}` |
| **CMD (Windows)** | una sola línea | `set KEY=value && comando` | `%cd%` |

> **Regla**: Si un bloque dice `bash` es para Linux/macOS/WSL. Si dice `powershell` es para PowerShell en Windows. Si dice `cmd` es para Command Prompt.

---

## Tabla de Contenidos

- [Parte 1 — Ejecución Local (Node.js)](#parte-1--ejecución-local-nodejs)
- [Parte 2 — Docker](#parte-2--docker)
- [Parte 3 — Pipeline CI en GitHub Actions](#parte-3--pipeline-ci-en-github-actions)
- [Parte 4 — CD con ArgoCD + Minikube](#parte-4--cd-con-argocd--minikube)
- [Troubleshooting](#troubleshooting)
- [Variables de Entorno y Logging](#variables-de-entorno-y-logging)
- [Mantenimiento y Operaciones](#mantenimiento-y-operaciones)

---

## Parte 1 — Ejecución Local (Node.js)

### Prerequisitos

- Node.js 20 LTS ([descargar](https://nodejs.org/))
- Git

### L1 — Clonar el repositorio

```bash
git clone https://github.com/NAFELOPEZ/pruebaDevsecopsCBCO.git
cd pruebaDevsecopsCBCO
```

### L2 — Instalar dependencias

```bash
cd app && npm ci
```

> `npm ci` instala las versiones exactas del `package-lock.json` (reproducible, más rápido que `npm install`).

### L3 — Ejecutar tests

```bash
npm test
```

**Con cobertura** (requiere ≥80%):
```bash
npm run test:coverage
```

### L4 — Ejecutar linter

```bash
npm run lint
```

### L5 — Ejecutar la app localmente

**bash / Linux / macOS:**
```bash
NODE_ENV=development node src/index.js
```

**PowerShell:**
```powershell
$env:NODE_ENV="development"; node src/index.js
```

**CMD:**
```cmd
set NODE_ENV=development && node src/index.js
```

### L6 — Verificar endpoints

```bash
curl http://localhost:3000/
# → {"message":"Hello from DevSecOps technical test to CBCO!!!!!!"}

curl http://localhost:3000/health
# → {"status":"ok"}

curl http://localhost:3000/health?full=true
# → {"status":"ok","mode":"full"}
```

**PowerShell** (si no tienes curl):
```powershell
Invoke-RestMethod http://localhost:3000/health
```

---

## Parte 2 — Docker

### Prerequisitos

- Docker Desktop ([descargar](https://www.docker.com/products/docker-desktop/)) o Docker Engine
- Docker Desktop debe estar **corriendo** (verificar icono en taskbar → "Engine running")

### D1 — Construir la imagen

```bash
docker build -t demo-app:local .
```

> El Dockerfile usa multi-stage build: imagen final ~50MB con solo dependencias de producción.

### D2 — Ejecutar el contenedor

**bash / Linux / macOS:**
```bash
docker run -d -p 3000:3000 --name demo-app \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  demo-app:local
```

**PowerShell:**
```powershell
docker run -d -p 3000:3000 --name demo-app `
  -e NODE_ENV=production `
  -e LOG_LEVEL=info `
  demo-app:local
```

**CMD:**
```cmd
docker run -d -p 3000:3000 --name demo-app -e NODE_ENV=production -e LOG_LEVEL=info demo-app:local
```

### D3 — Verificar

```bash
# Endpoints
curl http://localhost:3000/health

# Logs (JSON estructurado)
docker logs demo-app

# HEALTHCHECK status
docker inspect demo-app --format='{{.State.Health.Status}}'
# → healthy

# Verificar que corre como non-root
docker exec demo-app whoami
# → appuser (UID 1001)

# Verificar filesystem read-only
docker exec demo-app touch /app/test 2>&1
# → Read-only file system (esperado)
```

### D4 — Limpiar

```bash
docker stop demo-app && docker rm demo-app
```

---

## Parte 3 — Pipeline CI en GitHub Actions

### Prerequisitos

- Cuenta de GitHub con el repositorio forkeado/clonado
- Cuenta de Docker Hub + Access Token
- GitHub CLI (`gh`) instalado (opcional, para monitoreo)

### P1 — Configurar usuario DockerHub en el pipeline

En `.github/workflows/triggerci.yml`, verificar que `IMAGE_REPO` apunte a tu usuario:
```yaml
env:
  IMAGE_REPO: "TU_USUARIO_DOCKERHUB/demo-app"
```

### P2 — Crear Access Token en DockerHub

1. Ir a [hub.docker.com/settings/security](https://hub.docker.com/settings/security)
2. **New Access Token** → nombre: `github-actions` → permisos: **Read & Write**
3. Copiar el token (solo se muestra una vez)

### P3 — Configurar permisos en GitHub Actions

1. **Settings → Actions → General**:
   - Workflow permissions: **Read and write permissions**
   - ✅ Allow GitHub Actions to create and approve pull requests
2. **Settings → General → Pull Requests**:
   - ✅ Allow auto-merge

### P4 — Configurar Branch Protection Rules

> Protege la rama `main` para que todo cambio pase por PR con aprobación y CI exitoso.

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**
2. **Ruleset Name**: `main`
3. **Enforcement status**: **Active**
4. **Target branches** → Add target → Include by pattern → `main`
5. Activar las siguientes reglas:

| Regla | Configuración |
|-------|--------------|
| **Require a pull request before merging** | Required approvals: `1` |
| **Require status checks to pass** | Add check: `CI — Tests + Security Scanning` + "Require branches to be up to date" |
| **Block force pushes** | ✅ Activado |

6. Clic en **"Create"** o **"Save changes"**

> **Nota**: La opción "Do not allow bypassing the above settings" solo está disponible en planes GitHub Pro/Team/Enterprise. En plan Free no aparece — no es crítico para el funcionamiento del pipeline.

> **Importante**: El check `CI — Tests + Security Scanning` solo aparece en el buscador después de que el pipeline se haya ejecutado al menos una vez exitosamente. Si no lo encuentras, busca por `ci` (el nombre del job en el workflow).

### P5 — Configurar GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Valor | Requerido |
|--------|-------|-----------|
| `DOCKERHUB_USERNAME` | Tu usuario de DockerHub | ✅ CI |
| `DOCKERHUB_TOKEN` | Access Token del paso P2 | ✅ CI |
| `ARGOCD_SERVER` | URL de ngrok sin `https://` | ⚡ CD |
| `ARGOCD_TOKEN` | Token de service account ArgoCD | ⚡ CD |
| `DEPLOY_APP_URL` | URL pública de la app desplegada | ⚡ CD (opcional) |

> Los secrets marcados ⚡ son opcionales. Sin ellos, el CD funciona en **modo degradado** (pasa con warnings).

### P6 — Ejecutar el pipeline

```bash
git add .
git commit -m "ci: trigger pipeline"
git push origin main
```

### P7 — Monitorear ejecución

**En GitHub**: Actions → workflow run más reciente

**Con GitHub CLI:**

**bash:**
```bash
gh run watch
```

**PowerShell:**
```powershell
gh run watch
```

### P8 — Verificar resultados

Después de un pipeline exitoso:

1. **Actions → Artifacts**: `coverage-report-*`, `sbom-*.spdx.json`, `dast-logs-*`
2. **Security → Code scanning**: Alertas de Trivy y Semgrep (SARIF)
3. **Pull Requests**: PR automático de GitOps actualizando `gitops/values.yaml`
4. **Docker Hub**: Imagen publicada con tag = SHA del commit
5. **Deployments**: Estado del deployment en la pestaña Environments

### P9 — Gestión del PR de GitOps

El CI crea un PR automático que actualiza el image tag en `gitops/values.yaml`. Este PR:
- Tiene auto-merge habilitado (si configuraste P3)
- Al hacer merge a main, dispara `cd-verify.yml`
- **No bypasea** branch protection — si tienes reviewers requeridos, necesita aprobación

---

## Parte 4 — CD con ArgoCD + Minikube

### Arquitectura de la sesión local

Para completar el CD al 100%, necesitas exponer ArgoCD al runner de GitHub Actions. Esto requiere:

```
Terminal 1: kubectl port-forward (ArgoCD)      ← mantener abierta
Terminal 2: ngrok http 8080                    ← mantener abierta
Terminal 3: terminal de trabajo                ← donde ejecutas comandos
```

> **Nota**: Con el plan free de ngrok solo se puede tener 1 túnel. Por eso exponemos solo ArgoCD.
> Los smoke tests (`DEPLOY_APP_URL`) se saltan en este modo, pero ArgoCD ya verifica la salud
> de la app mediante los health probes de Kubernetes — esta es una verificación válida y suficiente.

### PC0 — Instalar herramientas

**PowerShell (Windows) — instalar todo con winget:**
```powershell
winget install Kubernetes.kubectl
winget install Helm.Helm
winget install Kubernetes.minikube
winget install ngrok.ngrok
winget install Argoproj.ArgoCD
```

> ⚠️ **Después de cada `winget install`**, cierra y reabre VS Code (o tu terminal) para que el PATH se actualice. Verificar con:
> ```powershell
> where.exe kubectl
> where.exe helm
> where.exe minikube
> where.exe ngrok
> where.exe argocd
> ```

**bash / Linux / macOS:**
```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# ngrok (Debian/Ubuntu)
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/v2.13.3/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

> ⚠️ **NO ejecutes los comandos de Linux en PowerShell**. `chmod`, `sudo`, `curl ... linux/amd64` no funcionan en Windows. En Windows usa exclusivamente los comandos de `winget`.

### PC1 — Crear cluster local con minikube

**Prerequisito**: Docker Desktop debe estar corriendo.

```bash
minikube start --driver=docker --cpus=2 --memory=4096
```

Verificar:
```bash
minikube status
kubectl cluster-info
```

Esperado: `host: Running`, `kubelet: Running`, `apiserver: Running`.

### PC2 — Instalar ArgoCD en el cluster

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=120s
```

**Obtener el password del admin:**

**bash / Linux / macOS:**
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo  # nueva línea
```

**PowerShell:**
```powershell
$encoded = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encoded))
```

> Guarda este password — lo necesitarás para el login.

### PC3 — Configurar ArgoCD en modo insecuro (para ngrok)

ArgoCD usa TLS por defecto. Cuando se expone a través de ngrok (que agrega su propia capa TLS), esto causa **redirect loops**. La solución oficial es desactivar TLS en ArgoCD y dejar que ngrok maneje el HTTPS.

**PowerShell (requiere archivo temporal porque PowerShell escapa JSON incorrectamente):**
```powershell
Set-Content -Path patch.json -Value '{"data":{"server.insecure":"true"}}'
kubectl -n argocd patch configmap argocd-cmd-params-cm --type merge --patch-file patch.json
Remove-Item patch.json
kubectl -n argocd rollout restart deployment argocd-server
kubectl -n argocd rollout status deployment argocd-server
```

**bash:**
```bash
kubectl -n argocd patch configmap argocd-cmd-params-cm --type merge \
  -p '{"data":{"server.insecure":"true"}}'
kubectl -n argocd rollout restart deployment argocd-server
kubectl -n argocd rollout status deployment argocd-server
```

Verificar:
```bash
kubectl -n argocd get configmap argocd-cmd-params-cm -o jsonpath="{.data}"
# Esperado: {"server.insecure":"true"}
```

> ⚠️ **¿Por qué modo insecuro?** En producción usarías un Ingress con TLS terminado por un cert-manager.
> Para desarrollo local con ngrok, el modo insecuro es la forma correcta de evitar doble TLS.
> ngrok ya proporciona HTTPS para el tráfico externo.

### PC4 — Terminal 1: port-forward de ArgoCD

**Abrir una nueva terminal** (dejarla abierta todo el tiempo):

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:80
```

> ⚠️ **Puerto 80, no 443**. Con `server.insecure: true`, ArgoCD sirve en HTTP puro en el puerto 80.
> Usar puerto 443 causará error "context deadline exceeded" porque ya no hay TLS.

### PC5 — Terminal 2: túnel ngrok

**Abrir otra terminal** (dejarla abierta):

Primero configurar el authtoken (solo una vez):
```bash
ngrok config add-authtoken TU_AUTHTOKEN_DE_NGROK
```
> Obtener tu authtoken en: https://dashboard.ngrok.com/get-started/your-authtoken

Luego:
```bash
ngrok http 8080
```

Ngrok mostrará algo como:
```
Forwarding  https://xxxx-xxx-xxx-xxx-xxx.ngrok-free.app → http://localhost:8080
```

> Copiar la URL **sin** `https://` → ej: `xxxx-xxx-xxx-xxx-xxx.ngrok-free.app`
> Este valor será `ARGOCD_SERVER` en los secrets de GitHub.

### PC6 — Terminal 3: verificar conexión y login

En tu terminal de trabajo (Terminal 3), verificar que ArgoCD responde:

```bash
curl http://localhost:8080
# Debería devolver HTML (la UI de ArgoCD)
```

Si responde, hacer login:

**bash:**
```bash
argocd login localhost:8080 --username admin --password TU_PASSWORD --plaintext
```

**PowerShell:**
```powershell
argocd login localhost:8080 --username admin --password TU_PASSWORD --plaintext
```

> ⚠️ **Flags importantes:**
> - `--plaintext` → se conecta sin TLS (porque ArgoCD está en modo insecuro). **No usar `--insecure` ni `--grpc-web` para conexión local.**
> - Si el password tiene caracteres especiales (`!`, `$`, `#`), ponlo entre comillas simples: `--password 'Mi#Pass!'`

Esperado:
```
'admin:login' logged in successfully
Context 'localhost:8080' updated
```

### PC7 — Crear cuenta de pipeline y generar token

**PowerShell:**
```powershell
Set-Content -Path patch.json -Value '{"data":{"accounts.pipeline":"apiKey"}}'
kubectl -n argocd patch configmap argocd-cm --type merge --patch-file patch.json
Remove-Item patch.json
```

**bash:**
```bash
kubectl -n argocd patch configmap argocd-cm --type merge \
  -p '{"data":{"accounts.pipeline":"apiKey"}}'
```

Generar token:
```bash
argocd account generate-token --account pipeline --plaintext
```

> Copiar el token completo (JWT). Este será `ARGOCD_TOKEN` en los secrets de GitHub.

### PC8 — Desplegar la app con Helm

```bash
kubectl create namespace demo-app
helm install demo-app ./helm/demo-app -f gitops/values.yaml --namespace demo-app
```

> Si el namespace o release ya existen de intentos previos:
> ```bash
> helm upgrade demo-app ./helm/demo-app -f gitops/values.yaml --namespace demo-app
> ```

Verificar:
```bash
kubectl get pods -n demo-app
# Esperado: demo-app-xxxxx   1/1   Running

kubectl get svc -n demo-app
# Esperado: demo-app   ClusterIP   10.x.x.x   3000/TCP
```

### PC9 — Aplicar ArgoCD Application

```bash
kubectl apply -f argocd/application.yaml
```

Verificar:
```bash
argocd app get demo-app --plaintext
```

Forzar sync inicial:
```bash
argocd app sync demo-app --plaintext
```

### PC10 — Configurar secrets en GitHub

Ve a **GitHub → Settings → Secrets and variables → Actions** y configura:

| Secret | Valor | Ejemplo |
|--------|-------|---------|
| `ARGOCD_SERVER` | URL de ngrok sin `https://` | `xxxx-190-145-240-166.ngrok-free.app` |
| `ARGOCD_TOKEN` | Token JWT del paso PC7 | `eyJhbGciOi...` |

> ⚠️ **Las URLs de ngrok cambian cada vez que reinicias ngrok** (plan free). Debes actualizar `ARGOCD_SERVER` en cada sesión de trabajo.

> `DEPLOY_APP_URL` es opcional. Sin él, los smoke tests se saltan pero ArgoCD ya verifica la salud de la app mediante los probes de Kubernetes.

### PC11 — Disparar el pipeline de CD

```bash
git commit --allow-empty -m "ci: trigger full CD pipeline test"
git push origin main
```

Monitorear:
```bash
gh run watch
```

**Resultado esperado de cd-verify.yml:**
```
✅ ArgoCD Sync     → Synced + Healthy
⚠️ Smoke Tests     → Skipped (DEPLOY_APP_URL no configurado)
```

> ArgoCD verifica internamente que la app pasa los health probes (/health). Los smoke tests externos son verificación adicional, no obligatoria.

### Arquitectura de terminales (resumen)

```
┌──────────────────────────────────────────────────┐
│ Terminal 1: kubectl port-forward ... 8080:80      │ ← NO CERRAR
├──────────────────────────────────────────────────┤
│ Terminal 2: ngrok http 8080                       │ ← NO CERRAR
├──────────────────────────────────────────────────┤
│ Terminal 3: terminal de trabajo                   │ ← aquí ejecutas
│  - argocd login                                   │    todos los
│  - helm install/upgrade                           │    comandos
│  - kubectl apply                                  │
│  - git push                                       │
└──────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Errores de Terminal / Plataforma

#### `'chmod' is not recognized` / `'sudo' is not recognized`
**Causa**: Estás ejecutando comandos de Linux en PowerShell/CMD de Windows.
**Fix**: En Windows usa los comandos de `winget` (ver PC0). Los bloques `bash` son solo para Linux/macOS.

#### PowerShell: `Missing expression after unary operator '--'`
**Causa**: PowerShell usa backtick `` ` `` para continuar líneas, no `\`.
**Fix**: Reemplazar `\` por `` ` `` al final de cada línea, o escribir todo en una sola línea.

#### CMD: `$env: is not recognized`
**Causa**: `$env:VAR` es sintaxis de PowerShell, no de CMD.
**Fix**: En CMD usar `set VAR=value && comando`.

#### `'gh' is not recognized` / `'ngrok' is not recognized` / `'argocd' is not recognized`
**Causa**: Terminal abierta antes de la instalación, PATH no actualizado.
**Fix**: Cerrar y reabrir VS Code (o la terminal). Verificar con `where.exe gh`.
**Alternativa rápida** (PowerShell):
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Errores de Docker

#### `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`
**Causa**: Docker Desktop no está corriendo.
**Fix**: Abrir Docker Desktop, esperar a que el icono de la taskbar muestre "Engine running".

### Errores de ArgoCD

#### `307 (Temporary Redirect)` al hacer `argocd login`
**Causa**: ArgoCD tiene TLS activo y ngrok agrega otra capa HTTPS → redirect loop.
**Fix**: Configurar ArgoCD en modo insecuro (ver PC3). Esto desactiva TLS en ArgoCD y deja que ngrok maneje HTTPS.

#### `stopped after 10 redirects` al hacer `argocd login`
**Causa**: Mismo problema que el 307 — doble capa TLS entre ArgoCD y ngrok.
**Fix**: Aplicar el patch de modo insecuro (PC3) y reiniciar el deployment.

#### `gRPC connection not ready: context deadline exceeded`
**Causa**: Puede ser uno de estos problemas:
1. Port-forward no está corriendo en Terminal 1
2. Port-forward apunta al puerto 443 en vez de 80
3. ArgoCD server no terminó de reiniciar tras el patch
**Fix**:
1. Verificar que Terminal 1 muestra `Forwarding from 127.0.0.1:8080 -> 8080`
2. Asegurar que el port-forward es `8080:80` (no `8080:443`)
3. Ejecutar `kubectl -n argocd rollout status deployment argocd-server` y esperar

#### `Unable to listen on port 8080: bind: Only one usage of each socket address`
**Causa**: Puerto 8080 ya está en uso por un proceso anterior.
**Fix**:
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :8080
# Terminar el proceso (reemplazar PID con el número)
taskkill /PID <PID> /F
# Reintentar port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:80
```

#### `kubectl patch` falla con `invalid character '\'` en PowerShell
**Causa**: PowerShell escapa los caracteres en strings JSON de forma incorrecta.
**Fix**: Usar archivo temporal:
```powershell
Set-Content -Path patch.json -Value '{"data":{"key":"value"}}'
kubectl -n argocd patch configmap NOMBRE --type merge --patch-file patch.json
Remove-Item patch.json
```

#### Login falla con `--insecure` pero funciona con `--plaintext`
**Causa**: `--insecure` = "acepta certificado TLS inválido" (pero sigue usando TLS). `--plaintext` = "conecta sin TLS". Con modo insecuro activo, ArgoCD no usa TLS, así que el CLI debe usar `--plaintext`.

| Flag | Significado | Cuándo usar |
|------|-------------|-------------|
| `--insecure` | Skips TLS cert verification | ArgoCD con TLS auto-firmado |
| `--grpc-web` | Usa HTTP/1.1 para gRPC | Conexión a través de proxy/ngrok |
| `--plaintext` | Sin TLS (HTTP puro) | ArgoCD en modo insecuro (localhost) |

### Errores de ngrok

#### `Your account is limited to 1 simultaneous session`
**Causa**: Plan free de ngrok solo permite 1 túnel simultáneo.
**Fix**: Esta guía usa solo 1 túnel (para ArgoCD). Los smoke tests de la app se saltan pero ArgoCD ya verifica la salud mediante K8s probes.

#### `configuration file must define at least one tunnel`
**Causa**: Bug conocido de ngrok instalado vía winget en Windows — no lee el archivo de configuración correctamente.
**Fix**: No usar `ngrok start --all`. Usar `ngrok http 8080` directamente (comando simple).

### Errores de Helm / Kubernetes

#### `namespaces "demo-app" already exists`
**Fix**: Ignorar el error y continuar, o usar `kubectl create namespace demo-app --dry-run=client -o yaml | kubectl apply -f -`

#### `release name check failed: cannot reuse a name that is still in use`
**Fix**: Usar `helm upgrade` en lugar de `helm install`:
```bash
helm upgrade demo-app ./helm/demo-app -f gitops/values.yaml --namespace demo-app
```

#### `ImagePullBackOff`
**Causa**: La imagen Docker no se puede descargar (nombre incorrecto o registry privado).
**Fix**: Verificar que `gitops/values.yaml` tiene el repositorio correcto. Si es privado, crear secret:
```bash
kubectl create secret docker-registry regcred \
  --docker-username=TU_USER \
  --docker-password=TU_TOKEN \
  --docker-server=docker.io \
  -n demo-app
```

### Errores del Pipeline (GitHub Actions)

#### GitLeaks falla
**Causa**: Se detectaron posibles secrets en el código.
**Fix**: Ejecutar localmente para ver detalles:
```bash
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest detect --source=/path --verbose
```
Si es un falso positivo, agregar la excepción en `.gitleaks.toml`.

#### Trivy reporta CRITICAL
**Fix**:
```bash
cd app && npm update
npm audit fix
```
Si es de la imagen base, actualizar `node:20-alpine` en `Dockerfile` a la última versión.

#### Trivy v0.56.1 no se puede instalar (versión eliminada)
**Síntoma**: `wget: server returned error: HTTP/404` o script de instalación silenciosamente falla.
**Causa**: Las versiones v0.27–v0.68 de Trivy fueron eliminadas de GitHub Releases como respuesta a un incidente de supply chain en trivy-action (marzo 2026).
**Fix**: Usar v0.69.3 o superior con instalación directa por `.deb`:
```yaml
wget -q "https://github.com/aquasecurity/trivy/releases/download/v0.69.3/trivy_0.69.3_Linux-64bit.deb" -O /tmp/trivy.deb
sudo dpkg -i /tmp/trivy.deb
```
**Referencia**: https://github.com/aquasecurity/trivy/releases

#### Build falla: `docker exporter does not currently support exporting manifest lists`
**Síntoma**: El job Build + DAST + Push falla en el step "Build Docker image" con error de manifest list.
**Causa**: Las opciones `push: true` + `load: true` + `provenance: true` son incompatibles. Provenance/SBOM generan un manifest list (OCI index) y el docker exporter (`--load`) no puede importar manifest lists.
**Fix**: Separar push y load:
- En push a main: `push: true`, `load: false`, `provenance: true`, `sbom: true` → luego `docker pull`
- En PRs: `push: false`, `load: true`, `provenance: false`, `sbom: false`

```yaml
push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
load: ${{ !(github.event_name == 'push' && github.ref == 'refs/heads/main') }}
provenance: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
sbom: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
```
Después del push, agregar step para hacer `docker pull` de la imagen para DAST.

#### Jobs Build y GitOps se saltan aunque CI pasó (skipped)
**Síntoma**: CI muestra check verde ✅ pero Build + DAST + Push aparece como ⊘ Skipped.
**Causa**: GitHub Actions propaga el estado "skipped" por la cadena de dependencias. Si `validate-pr-approval` fue skipped (porque no es un evento `pull_request_review`), los jobs downstream se saltan automáticamente, **incluso si su dependencia directa (`ci`) pasó correctamente**.
**Fix**: Agregar `always()` a la condición `if` de los jobs downstream:
```yaml
# ANTES (no funciona):
if: needs.ci.result == 'success'

# DESPUÉS (funciona):
if: always() && needs.ci.result == 'success'
```
`always()` le dice a GitHub Actions que evalúe la condición en vez de aplicar la lógica de skip automático por cadena.

#### GitOps falla: `syntax error near unexpected token '|'`
**Síntoma**: El job GitOps — Update image tag falla en "Create GitHub Deployment" con exit code 2.
**Causa**: Bash en los runners de GitHub Actions no soporta correctamente un heredoc con pipe (`<<PAYLOAD ... PAYLOAD | jq`) dentro de una sustitución de comando `$(...)`. La combinación `$(command <<EOF ... EOF | filter)` causa un error de parsing.
**Fix**: Escribir el JSON en un archivo temporal en vez de usar heredoc con pipe:
```yaml
cat > /tmp/deploy-payload.json <<'EOF'
{ "ref": "...", "environment": "production" }
EOF

DEPLOYMENT_ID=$(gh api repos/.../deployments \
  --method POST \
  --input /tmp/deploy-payload.json \
  --jq '.id')
rm -f /tmp/deploy-payload.json
```

#### GitLeaks error: `The [pull_request_review] event is not yet supported`
**Síntoma**: CI falla en el step de GitLeaks con `ERROR: The [pull_request_review] event is not yet supported`. Todos los steps posteriores (Trivy, SBOM) se saltan y `trivy-fs.sarif` no se genera.
**Causa**: `gitleaks-action@v2` solo soporta eventos `push` y `pull_request`. El trigger `pull_request_review` causa un error fatal.
**Fix**: Remover el trigger `pull_request_review` de `triggerci.yml` y el job `validate-pr-approval`. La aprobación de PRs se controla via branch protection rules en Settings → Branches → Add rule → Require approvals.

#### GitLeaks warning: `Unexpected input(s) 'config-path'`
**Síntoma**: Warning amarillo en CI: `Unexpected input(s) 'config-path', valid inputs are ['']`.
**Causa**: `gitleaks-action@v2` no acepta el input `config-path` — era de v1. La v2 auto-detecta `.gitleaks.toml` del root del repositorio.
**Fix**: Remover el bloque `with:` del step de GitLeaks:
```yaml
# ANTES (v1 syntax):
uses: gitleaks/gitleaks-action@v2
with:
  config-path: .gitleaks.toml

# DESPUÉS (v2 correcto):
uses: gitleaks/gitleaks-action@v2
# Auto-detecta .gitleaks.toml del root
```

#### Trivy code scanning: 12 alertas HIGH en imagen Docker (tar, minimatch, glob, cross-spawn, zlib)
**Síntoma**: GitHub Security → Code scanning muestra 12 alertas HIGH de Trivy, todas en paquetes como `tar`, `node-tar`, `minimatch`, `glob`, `cross-spawn` dentro de `/usr/local/lib/node_modules/npm/`, más `zlib` en la imagen base alpine.
**Causa**: La imagen `node:20-alpine` incluye npm y sus ~300 dependencias transitivas. La app en producción solo necesita `node`, no `npm`.
**Fix**: Eliminar npm del runtime stage del Dockerfile y actualizar paquetes del sistema:
```dockerfile
# En la etapa runtime, ANTES de crear el usuario
RUN apk update && apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack && \
    rm -rf /root/.npm /tmp/* /var/cache/apk/*
```
Esto elimina las 11 vulnerabilidades de npm + corrige zlib via `apk upgrade`.

#### cd-verify.yml: warnings "Context access might be invalid: DEPLOY_APP_URL"
**Síntoma**: VS Code muestra 3 warnings en `cd-verify.yml` sobre acceso a `secrets.DEPLOY_APP_URL`.
**Causa**: La extensión de GitHub Actions no puede verificar que el secret exista (es un secret opcional). Además, interpolar secrets directamente en scripts shell (`${{ secrets.X }}`) es un riesgo de inyección.
**Fix**: Mover el secret a una variable de entorno a nivel de job y referenciarla como `${DEPLOY_URL}` en los scripts:
```yaml
jobs:
  deploy-verify:
    env:
      DEPLOY_URL: ${{ secrets.DEPLOY_APP_URL }}  # única referencia al secret
    steps:
      - run: |
          if [ -z "${DEPLOY_URL}" ]; then  # usar env var, no secret directo
```
Reduce las advertencias de 3 a 1 (la referencia en `env:` del job es inevitable).

#### GitOps PR no se crea
**Causa**: Permisos insuficientes en GitHub Actions.
**Fix**: Settings → Actions → General → Workflow permissions → **Read and write permissions** + ✅ Allow GitHub Actions to create pull requests.

---

## Variables de Entorno y Logging

### Variables de la App

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor Express |
| `NODE_ENV` | `production` | `development` = logs con color, `production` = JSON |
| `LOG_LEVEL` | `info` | Niveles: `trace` < `debug` < `info` < `warn` < `error` < `fatal` |
| `APP_NAME` | `demo-app` | Identificador en logs |

### Formato de Logs

**Producción** (JSON — compatible con Fluent Bit, Loki, Datadog):
```json
{"timestamp":"2026-03-25T...","level":"info","message":"http_request","method":"GET","path":"/health","status":200,"duration_ms":2}
```

**Desarrollo** (coloreado, human-readable):
```
[2026-03-25T...] INFO  http_request method=GET path=/health status=200 duration_ms=2
```

### Cambiar log level en Kubernetes

```bash
kubectl set env deployment/demo-app LOG_LEVEL=debug -n demo-app
# Esto trigger rolling update automático
```

---

## Mantenimiento y Operaciones

### Actualizar versiones de herramientas

| Herramienta | Dónde actualizar | Frecuencia |
|------------|------------------|-----------|
| Trivy | `TRIVY_VERSION` en `triggerci.yml` (actual: v0.69.3) | Mensual |
| ArgoCD CLI | `ARGOCD_CLI_VERSION` en ambos workflows | Trimestral |
| Docker base | `FROM node:20-alpine` en `Dockerfile` | Mensual |
| GitHub Actions | Versiones de `uses:` en workflows | Al recibir deprecation warnings |

### Revisar suppressions

```bash
# Cada trimestre, revisar si las excepciones siguen siendo válidas:
cat .trivyignore      # Vulnerabilidades suprimidas
cat .gitleaks.toml    # Excepciones de secret scanning
cat .zap/rules.tsv    # Alertas DAST suprimidas
```

### Escalar la app vía GitOps

Editar `gitops/values.yaml`:
```yaml
replicaCount: 3
```

Commit y push → ArgoCD aplicará el cambio automáticamente.

### Comandos útiles de operación

```bash
# Estado general
kubectl get all -n demo-app
kubectl top pods -n demo-app  # (requiere metrics-server)

# ArgoCD
argocd app list --plaintext
argocd app get demo-app --plaintext
argocd app history demo-app --plaintext
argocd app rollback demo-app --plaintext  # rollback manual

# Helm
helm list -n demo-app
helm history demo-app -n demo-app
helm rollback demo-app 1 -n demo-app  # rollback a revisión 1
```
