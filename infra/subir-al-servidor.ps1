# subir-al-servidor.ps1
# Ejecutar desde PowerShell:
#   cd "C:\Users\RG\Desktop\Cubo Digital\Proyecto ClicUp\cowork-agency"
#   .\infra\subir-al-servidor.ps1

$SERVER     = "root@178.105.111.188"
$REMOTE_DIR = "/opt/cowork"
$LOCAL_DIR  = Split-Path -Parent $PSScriptRoot

Write-Host "=== Subiendo Cowork Agency al servidor ===" -ForegroundColor Cyan

# 1. Crear directorio en servidor
Write-Host "`n[1/4] Preparando servidor..." -ForegroundColor Yellow
ssh $SERVER "mkdir -p $REMOTE_DIR"

# 2. Subir carpetas
Write-Host "[2/4] Subiendo carpetas..." -ForegroundColor Yellow
$carpetas = @("app","components","lib","types","public","store","infra")
foreach ($c in $carpetas) {
    $ruta = Join-Path $LOCAL_DIR $c
    if (Test-Path $ruta) {
        Write-Host "  -> $c"
        scp -r $ruta "${SERVER}:${REMOTE_DIR}/"
    }
}

# 3. Subir archivos sueltos
Write-Host "[3/4] Subiendo archivos de configuracion..." -ForegroundColor Yellow
$archivos = @(
    "package.json",
    "pnpm-lock.yaml",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "Dockerfile",
    ".dockerignore",
    "docker-compose.yml",
    ".env.production"
)
foreach ($a in $archivos) {
    $ruta = Join-Path $LOCAL_DIR $a
    if (Test-Path $ruta) {
        scp $ruta "${SERVER}:${REMOTE_DIR}/"
    }
}
$tw = Join-Path $LOCAL_DIR "tailwind.config.ts"
if (Test-Path $tw) {
    scp $tw "${SERVER}:${REMOTE_DIR}/"
}

Write-Host "OK - Codigo subido" -ForegroundColor Green

# 4. Primera instalacion o actualizacion
Write-Host "[4/4] Verificando instalacion previa..." -ForegroundColor Yellow
ssh $SERVER 'test -d /opt/cowork/infra/certbot/conf/live'
$tieneSSL = ($LASTEXITCODE -eq 0)

if ($tieneSSL) {
    Write-Host "Actualizando aplicacion..." -ForegroundColor Yellow
    ssh $SERVER 'bash /opt/cowork/infra/deploy.sh'
} else {
    Write-Host "Primera instalacion - configurando servidor (aprox 5 min)..." -ForegroundColor Yellow
    ssh $SERVER 'bash /opt/cowork/infra/setup-server.sh'
}

Write-Host ""
Write-Host "=== LISTO ===" -ForegroundColor Green
Write-Host "App disponible en: https://app.somosdex.com" -ForegroundColor Green
