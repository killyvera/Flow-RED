# Sistema de Logging

Este proyecto usa la librería [`debug`](https://github.com/debug-js/debug) para logging, que permite activar/desactivar logs fácilmente sin modificar código.

## Activación de Logs

### Opción 1: Variable de Entorno (Recomendado)

Edita `.env.local` y añade:

```bash
# Activar todos los logs
VITE_DEBUG=editor-frontend:*

# O activar logs específicos
VITE_DEBUG=editor-frontend:api,editor-frontend:flow
```

### Opción 2: Desde el Navegador (Consola)

Abre la consola del navegador y ejecuta:

```javascript
localStorage.setItem('debug', 'editor-frontend:*')
location.reload()
```

Para desactivar:

```javascript
localStorage.removeItem('debug')
location.reload()
```

## Namespaces Disponibles

- `editor-frontend:api` - Logs del cliente API (requests/responses)
- `editor-frontend:flow` - Logs de carga y renderizado de flows
- `editor-frontend:mapper` - Logs de transformación Node-RED → React Flow
- `editor-frontend:store` - Logs del store de Zustand
- `editor-frontend:app` - Logs generales de la aplicación

## Ejemplos de Uso

### Activar solo logs de API

```bash
VITE_DEBUG=editor-frontend:api
```

### Activar logs de API y flows

```bash
VITE_DEBUG=editor-frontend:api,editor-frontend:flow
```

### Activar todos los logs

```bash
VITE_DEBUG=editor-frontend:*
```

### Desactivar todos los logs

Simplemente no definas `VITE_DEBUG` o déjala vacía en `.env.local`.

## Logs que Verás

Cuando los logs están activados, verás información como:

- 🔄 Inicio de carga de flows
- 📥 Requests HTTP a Node-RED
- ✓ Responses exitosas
- ❌ Errores de conexión
- 🎨 Renderizado de flows
- ✨ Transformaciones de datos
- 💾 Actualizaciones del store

## Ventajas de `debug`

1. **No afecta el rendimiento**: Los logs se compilan fuera en producción
2. **Fácil de activar/desactivar**: Sin cambiar código
3. **Namespaces organizados**: Puedes activar solo lo que necesitas
4. **Colores en consola**: Fácil de leer
5. **Estándar de la industria**: Usado por Express, Socket.io, etc.

## Notas

- Los logs solo aparecen en desarrollo (navegador)
- En producción, los logs están deshabilitados automáticamente
- Puedes cambiar el nivel de logging sin reiniciar el servidor (usando localStorage)

