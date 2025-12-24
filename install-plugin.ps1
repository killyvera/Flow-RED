# Script de instalación para node-red-runtime-observability
# Este script:
# 1. Crea un npm link del plugin a la carpeta .node-red del usuario
# 2. Modifica o crea el settings.js en .node-red con la configuración del plugin

param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# Colores para mensajes
function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

# Obtener rutas
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginDir = Join-Path $ScriptDir "plugins\node-red-runtime-observability"
$NodeRedUserDir = Join-Path $env:USERPROFILE ".node-red"
$SettingsExample = Join-Path $PluginDir "settings.example.js"
$SettingsFile = Join-Path $NodeRedUserDir "settings.js"

Write-Info "=========================================="
Write-Info "Instalador de node-red-runtime-observability"
Write-Info "=========================================="
Write-Host ""

# Verificar que el plugin existe
if (-not (Test-Path $PluginDir)) {
    Write-Error "ERROR: No se encontró el directorio del plugin: $PluginDir"
    exit 1
}

# Verificar que settings.example.js existe
if (-not (Test-Path $SettingsExample)) {
    Write-Error "ERROR: No se encontró settings.example.js en: $SettingsExample"
    exit 1
}

# Verificar que npm está instalado
try {
    $npmVersion = npm --version
    Write-Info "npm versión: $npmVersion"
} catch {
    Write-Error "ERROR: npm no está instalado o no está en el PATH"
    exit 1
}

Write-Host ""
Write-Info "Paso 1: Creando npm link en el plugin..."
Set-Location $PluginDir

# Verificar que package.json existe
if (-not (Test-Path "package.json")) {
    Write-Error "ERROR: No se encontró package.json en el directorio del plugin"
    exit 1
}

# Ejecutar npm link
try {
    Write-Info "Ejecutando: npm link"
    npm link
    if ($LASTEXITCODE -ne 0) {
        throw "npm link falló con código de salida $LASTEXITCODE"
    }
    Write-Success "✓ npm link creado exitosamente"
} catch {
    Write-Error "ERROR al ejecutar npm link: $_"
    exit 1
}

Write-Host ""
Write-Info "Paso 2: Creando directorio .node-red si no existe..."
if (-not (Test-Path $NodeRedUserDir)) {
    New-Item -ItemType Directory -Path $NodeRedUserDir -Force | Out-Null
    Write-Success "✓ Directorio .node-red creado: $NodeRedUserDir"
} else {
    Write-Info "✓ Directorio .node-red ya existe: $NodeRedUserDir"
}

Write-Host ""
Write-Info "Paso 3: Enlazando el plugin en .node-red..."
Set-Location $NodeRedUserDir

try {
    Write-Info "Ejecutando: npm link node-red-runtime-observability"
    npm link node-red-runtime-observability
    if ($LASTEXITCODE -ne 0) {
        throw "npm link falló con código de salida $LASTEXITCODE"
    }
    Write-Success "✓ Plugin enlazado exitosamente en .node-red"
} catch {
    Write-Error "ERROR al enlazar el plugin: $_"
    exit 1
}

Write-Host ""
Write-Info "Paso 4: Configurando settings.js..."

# Leer el contenido del ejemplo
$SettingsExampleContent = Get-Content $SettingsExample -Raw

# Extraer solo la configuración de observability del ejemplo
# Buscar la posición de "observability:"
$ObservabilityStart = $SettingsExampleContent.IndexOf("observability:")
if ($ObservabilityStart -ge 0) {
    # Encontrar el inicio del objeto (después de ":")
    $ObjectStart = $SettingsExampleContent.IndexOf("{", $ObservabilityStart)
    if ($ObjectStart -ge 0) {
        # Contar llaves para encontrar el cierre correcto
        $BraceCount = 0
        $Pos = $ObjectStart
        $ConfigEnd = -1
        
        while ($Pos -lt $SettingsExampleContent.Length) {
            $Char = $SettingsExampleContent[$Pos]
            if ($Char -eq '{') {
                $BraceCount++
            } elseif ($Char -eq '}') {
                $BraceCount--
                if ($BraceCount -eq 0) {
                    $ConfigEnd = $Pos + 1
                    break
                }
            }
            $Pos++
        }
        
        if ($ConfigEnd -gt 0) {
            # Extraer la configuración completa
            $ObservabilityConfig = $SettingsExampleContent.Substring($ObservabilityStart, $ConfigEnd - $ObservabilityStart)
            # Remover coma final si existe
            $ObservabilityConfig = $ObservabilityConfig.TrimEnd().TrimEnd(',')
            # Agregar indentación de 4 espacios a cada línea
            $Lines = $ObservabilityConfig -split "`n"
            $ObservabilityConfig = "    " + ($Lines -join "`n    ")
        } else {
            Write-Warning "No se pudo encontrar el cierre del objeto observability"
            $ObservabilityConfig = $null
        }
    } else {
        Write-Warning "No se pudo encontrar el inicio del objeto observability"
        $ObservabilityConfig = $null
    }
} else {
    Write-Warning "No se encontró 'observability:' en el archivo de ejemplo"
    $ObservabilityConfig = $null
}

# Si no se pudo extraer, usar configuración por defecto
if (-not $ObservabilityConfig) {
    Write-Warning "Usando configuración por defecto..."
    $ObservabilityConfig = @"
    observability: {
        enabled: false,
        sampling: {
            mode: "first-n",
            maxPerNode: 3,
            probability: 0.1
        },
        limits: {
            maxPayloadBytes: 50000,
            maxDepth: 6,
            maxKeys: 50,
            maxArrayItems: 20,
            maxStringLength: 5000
        },
        websocket: {
            heartbeatInterval: 15000,
            maxConnections: 10
        }
    }
"@
}

if (Test-Path $SettingsFile) {
    Write-Info "settings.js ya existe. Verificando configuración..."
    
    $SettingsContent = Get-Content $SettingsFile -Raw
    
    # Verificar si ya tiene la configuración de observability
    if ($SettingsContent -match "observability\s*:\s*\{") {
        if ($Force) {
            Write-Warning "La configuración de observability ya existe. Reemplazando (modo -Force)..."
            
            # Crear backup
            $BackupFile = "$SettingsFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Copy-Item $SettingsFile $BackupFile
            Write-Info "Backup creado: $BackupFile"
            
            # Encontrar y reemplazar la configuración existente
            $ObservabilityStart = $SettingsContent.IndexOf("observability:")
            if ($ObservabilityStart -ge 0) {
                $ObjectStart = $SettingsContent.IndexOf("{", $ObservabilityStart)
                if ($ObjectStart -ge 0) {
                    $BraceCount = 0
                    $Pos = $ObjectStart
                    $ConfigEnd = -1
                    
                    while ($Pos -lt $SettingsContent.Length) {
                        $Char = $SettingsContent[$Pos]
                        if ($Char -eq '{') {
                            $BraceCount++
                        } elseif ($Char -eq '}') {
                            $BraceCount--
                            if ($BraceCount -eq 0) {
                                $ConfigEnd = $Pos + 1
                                # Buscar coma después del cierre
                                while ($ConfigEnd -lt $SettingsContent.Length -and 
                                       ($SettingsContent[$ConfigEnd] -match '\s' -or $SettingsContent[$ConfigEnd] -eq ',')) {
                                    if ($SettingsContent[$ConfigEnd] -eq ',') {
                                        $ConfigEnd++
                                        break
                                    }
                                    $ConfigEnd++
                                }
                                break
                            }
                        }
                        $Pos++
                    }
                    
                    if ($ConfigEnd -gt 0) {
                        # Reemplazar la configuración
                        $Before = $SettingsContent.Substring(0, $ObservabilityStart)
                        $After = $SettingsContent.Substring($ConfigEnd)
                        $SettingsContent = $Before + $ObservabilityConfig + "," + "`n" + $After
                        Set-Content -Path $SettingsFile -Value $SettingsContent -NoNewline
                        Write-Success "✓ Configuración de observability actualizada en settings.js"
                    } else {
                        Write-Error "No se pudo encontrar el cierre de la configuración existente"
                        exit 1
                    }
                }
            }
        } else {
            Write-Warning "La configuración de observability ya existe en settings.js"
            Write-Info "Si deseas reemplazarla, ejecuta el script con el parámetro -Force"
            Write-Success "✓ settings.js ya está configurado"
        }
    } else {
        Write-Info "Agregando configuración de observability a settings.js existente..."
        
        # Buscar el cierre de module.exports y agregar la configuración antes
        $ModuleExportsEnd = $SettingsContent.LastIndexOf("};")
        if ($ModuleExportsEnd -ge 0) {
            # Encontrar la posición antes del cierre
            $InsertPos = $ModuleExportsEnd
            # Retroceder para encontrar el inicio de la línea
            while ($InsertPos -gt 0 -and $SettingsContent[$InsertPos - 1] -ne "`n") {
                $InsertPos--
            }
            
            # Obtener la indentación de la línea anterior
            $IndentMatch = [regex]::Match($SettingsContent.Substring(0, $InsertPos), '(\s+)(\}\s*;\s*$)')
            $Indent = if ($IndentMatch.Success) { $IndentMatch.Groups[1].Value } else { "    " }
            
            # Insertar la configuración
            $Before = $SettingsContent.Substring(0, $InsertPos)
            $After = $SettingsContent.Substring($InsertPos)
            $SettingsContent = $Before + $ObservabilityConfig + ",`n" + $Indent + $After
            Set-Content -Path $SettingsFile -Value $SettingsContent -NoNewline
            Write-Success "✓ Configuración de observability agregada a settings.js"
        } else {
            Write-Warning "No se pudo encontrar el cierre de module.exports. Creando backup y agregando al final..."
            $BackupFile = "$SettingsFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Copy-Item $SettingsFile $BackupFile
            Write-Info "Backup creado: $BackupFile"
            
            # Agregar al final del archivo antes del cierre
            if ($SettingsContent.TrimEnd().EndsWith("}")) {
                $SettingsContent = $SettingsContent.TrimEnd()
                $SettingsContent = $SettingsContent.Substring(0, $SettingsContent.Length - 1) + "`n" + $ObservabilityConfig + ",`n};"
            } else {
                $SettingsContent = $SettingsContent.TrimEnd() + "`n" + $ObservabilityConfig + ",`n};"
            }
            Set-Content -Path $SettingsFile -Value $SettingsContent -NoNewline
            Write-Success "✓ Configuración agregada a settings.js"
        }
    }
} else {
    Write-Info "settings.js no existe. Creando uno nuevo basado en el ejemplo..."
    
    # Crear un settings.js básico con la configuración de observability
    $NewSettingsContent = @"
/**
 * Node-RED Settings
 * Generated by install-plugin.ps1
 */

module.exports = {
    // ... your other Node-RED settings ...

$ObservabilityConfig

    // ... your other Node-RED settings ...
};
"@
    
    Set-Content -Path $SettingsFile -Value $NewSettingsContent
    Write-Success "✓ settings.js creado con la configuración de observability"
}

Write-Host ""
Write-Info "=========================================="
Write-Success "¡Instalación completada exitosamente!"
Write-Info "=========================================="
Write-Host ""
Write-Info "Resumen:"
Write-Info "  - Plugin enlazado: $PluginDir -> $NodeRedUserDir"
Write-Info "  - Settings configurado: $SettingsFile"
Write-Host ""
Write-Warning "IMPORTANTE:"
Write-Info "  1. El plugin está deshabilitado por defecto (enabled: false)"
Write-Info "  2. Para habilitarlo, edita $SettingsFile y cambia 'enabled: false' a 'enabled: true'"
Write-Info "  3. Reinicia Node-RED para que los cambios surtan efecto"
Write-Host ""

