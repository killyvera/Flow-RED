# Instalación del Plugin node-red-runtime-observability

## Descripción

Este script automatiza la instalación del plugin `node-red-runtime-observability` en tu entorno Node-RED.

## Requisitos

- Windows con PowerShell
- Node.js y npm instalados
- Acceso a la carpeta de usuario (`.node-red`)

## Uso

### Instalación Normal

Ejecuta el script desde la raíz del proyecto:

```powershell
.\install-plugin.ps1
```

### Reinstalación Forzada

Si ya tienes el plugin instalado y quieres reemplazar la configuración:

```powershell
.\install-plugin.ps1 -Force
```

## ¿Qué hace el script?

1. **Crea un npm link** del plugin en `plugins\node-red-runtime-observability`
2. **Enlaza el plugin** en tu carpeta de usuario `.node-red` (normalmente `C:\Users\TuUsuario\.node-red`)
3. **Configura settings.js**:
   - Si `settings.js` no existe, lo crea con la configuración del plugin
   - Si `settings.js` existe, agrega la configuración de observability
   - Si la configuración ya existe, muestra un mensaje (usa `-Force` para reemplazarla)

## Después de la instalación

1. **Habilitar el plugin**: Edita `C:\Users\TuUsuario\.node-red\settings.js` y cambia:
   ```javascript
   enabled: false,
   ```
   a:
   ```javascript
   enabled: true,
   ```

2. **Reinicia Node-RED** para que los cambios surtan efecto.

## Ubicaciones

- **Plugin**: `plugins\node-red-runtime-observability`
- **Carpeta Node-RED**: `C:\Users\TuUsuario\.node-red`
- **Settings**: `C:\Users\TuUsuario\.node-red\settings.js`
- **Ejemplo de configuración**: `plugins\node-red-runtime-observability\settings.example.js`

## Notas

- El plugin está **deshabilitado por defecto** (`enabled: false`)
- El script crea backups automáticos si modifica un `settings.js` existente
- Si algo sale mal, revisa los mensajes de error en la consola

