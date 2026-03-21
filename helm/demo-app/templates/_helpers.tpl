{{/*
Nombre del chart (truncado a 63 chars — límite de DNS de K8s)
*/}}
{{- define "demo-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Nombre completo del release (con soporte de override)
*/}}
{{- define "demo-app.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- include "demo-app.name" . -}}
{{- end -}}
{{- end -}}

{{/*
Nombre del ServiceAccount
Si serviceAccount.name está definido, usarlo.
Si no, usar el fullname del release.
*/}}
{{- define "demo-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
  {{- default (include "demo-app.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
  {{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
Labels comunes — aplicar a todos los recursos del chart
Permiten seleccionar recursos por app, versión y chart.
*/}}
{{- define "demo-app.labels" -}}
app.kubernetes.io/name: {{ include "demo-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end -}}

{{/*
Selector labels — usados en matchLabels y selectors.
MÁS ESTABLE que labels completas (no cambian entre upgrades).
NUNCA incluir la versión del chart en los selector labels.
*/}}
{{- define "demo-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "demo-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
