/**
 * Punto de entrada de la aplicación
 * 
 * Renderiza el componente App en el DOM y configura
 * el entorno básico de React.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
// Inicializar sistema de logging
import '@/utils/logger'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

