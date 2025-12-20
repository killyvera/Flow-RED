# Configuración de Node-RED en Modo Headless (Solo API)

Para ejecutar Node-RED sin la UI antigua y solo exponer la API REST, necesitas configurar Node-RED con `httpAdminRoot: false`.

## Opción 1: Usar el archivo settings.js existente

Si ya tienes un archivo `settings.js` en tu directorio `.node-red`, edítalo y añade:

```javascript
module.exports = {
    // ... otras configuraciones ...
    
    // Deshabilitar la UI del editor, pero mantener la API
    httpAdminRoot: false,
    
    // El puerto sigue siendo el mismo
    uiPort: process.env.PORT || 1880,
    
    // ... resto de configuraciones ...
}
```

## Opción 2: Crear un archivo settings.js personalizado

1. Crea un archivo `settings.js` en tu directorio `.node-red` (normalmente `~/.node-red/settings.js` en Linux/Mac o `%USERPROFILE%\.node-red\settings.js` en Windows)

2. Añade esta configuración mínima:

```javascript
module.exports = {
    // Deshabilitar la UI del editor
    httpAdminRoot: false,
    
    // Puerto donde escucha Node-RED
    uiPort: process.env.PORT || 1880,
    
    // Host (opcional, por defecto escucha en todas las interfaces)
    // uiHost: "127.0.0.1",  // Solo localhost
    // uiHost: "::",         // Todas las interfaces IPv6
    
    // Otras configuraciones opcionales
    // flowFile: 'flows.json',  // Archivo donde se guardan los flows
    // userDir: './.node-red',  // Directorio de usuario
}
```

## Opción 3: Usar variables de entorno

También puedes crear un archivo de configuración que lea variables de entorno:

```javascript
module.exports = {
    httpAdminRoot: process.env.NODE_RED_DISABLE_UI === 'true' ? false : undefined,
    uiPort: process.env.PORT || 1880,
}
```

Y luego ejecutar:
```bash
NODE_RED_DISABLE_UI=true node-red
```

## Ejecutar Node-RED

### Desde el repositorio (desarrollo)
```bash
npm start
```

### Desde instalación global
```bash
node-red
```

### Con archivo de configuración personalizado
```bash
node-red --settings=/ruta/a/tu/settings.js
```

## Verificar que funciona

Una vez que Node-RED esté corriendo en modo headless:

1. **La UI antigua NO debería estar disponible** en `http://localhost:1880`
2. **La API REST SÍ debería estar disponible**:
   - `GET http://localhost:1880/flows` - Obtener flows
   - `GET http://localhost:1880/nodes` - Obtener nodos disponibles
   - `POST http://localhost:1880/flows` - Guardar flows
   - etc.

Puedes probar la API con:
```bash
curl http://localhost:1880/flows
```

O abrir `http://localhost:1880/flows` en el navegador (debería retornar JSON).

## Notas Importantes

- Cuando `httpAdminRoot: false`, Node-RED entra en "headless-mode"
- La API REST sigue funcionando completamente
- Los flows siguen ejecutándose normalmente
- Solo se deshabilita la interfaz web del editor
- Tu nuevo frontend en `editor-frontend` puede usar la API normalmente

## Solución de Problemas

Si la API no responde:
1. Verifica que Node-RED esté corriendo: `ps aux | grep node-red` (Linux/Mac) o revisa el Task Manager (Windows)
2. Verifica el puerto: `netstat -an | grep 1880` (Linux/Mac) o `netstat -an | findstr 1880` (Windows)
3. Revisa los logs de Node-RED para ver si hay errores
4. Asegúrate de que no haya otro proceso usando el puerto 1880

