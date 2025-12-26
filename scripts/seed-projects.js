/**
 * Script para crear proyectos y asignar flujos a proyectos
 * 
 * Este script debe ejecutarse desde el navegador (consola del navegador)
 * después de ejecutar seed-flows.js
 * 
 * INSTRUCCIONES:
 * 1. Ejecuta seed-flows.js primero para crear los flows con projectId
 * 2. Abre http://localhost:5173 en tu navegador
 * 3. Abre la consola del navegador (F12)
 * 4. Copia y pega este código completo en la consola
 * 5. Ejecuta: await seedProjects()
 * 
 * O simplemente ejecuta este código directamente en la consola del navegador
 */

// Función para crear proyectos (ejecutar desde la consola del navegador)
async function seedProjects() {
  try {
    console.log('🌱 Iniciando seed de proyectos...')
    
    // Importar funciones de projectStorage dinámicamente
    // En el navegador, estas funciones están disponibles a través del módulo
    const projectStorageModule = await import('/src/utils/projectStorage.ts')
    const { createProject, addFlowToProject, getProjects } = projectStorageModule
    
    // Definir proyectos y sus flujos (debe coincidir con seed-flows.js)
    const projectCategories = {
      'proyecto-basicos': {
        name: 'Flujos Básicos',
        description: 'Flujos de ejemplo básicos para aprender Node-RED',
        flowIds: ['flow1', 'flow2', 'flow3', 'flow4']
      },
      'proyecto-apis': {
        name: 'APIs y HTTP',
        description: 'Flujos que demuestran integración con APIs y HTTP',
        flowIds: ['flow5', 'flow7', 'flow8', 'flow9']
      },
      'proyecto-transformaciones': {
        name: 'Transformaciones de Datos',
        description: 'Flujos para transformar y procesar datos',
        flowIds: ['flow10']
      },
      'proyecto-avanzados': {
        name: 'Funcionalidades Avanzadas',
        description: 'Subflows, links y otras funcionalidades avanzadas',
        flowIds: ['flow11', 'flow12']
      },
      'proyecto-ia': {
        name: 'Inteligencia Artificial',
        description: 'Flujos con Agent Core y modelos de IA',
        flowIds: ['flow13', 'flow14']
      }
    }
    
    // Verificar proyectos existentes
    const existingProjects = await getProjects()
    const existingProjectIds = new Set(existingProjects.map(p => p.id))
    
    // Crear proyectos y asignar flujos
    for (const [projectId, project] of Object.entries(projectCategories)) {
      let targetProjectId = projectId
      
      // Si el proyecto ya existe, usar el existente
      if (existingProjectIds.has(projectId)) {
        console.log(`⚠️ Proyecto ${project.name} ya existe, usando el existente...`)
        const existingProject = existingProjects.find(p => p.id === projectId)
        targetProjectId = existingProject.id
      } else {
        console.log(`📁 Creando proyecto: ${project.name}...`)
        const createdProject = await createProject(project.name, project.description)
        targetProjectId = createdProject.id
      }
      
      // Asignar flujos al proyecto
      let addedCount = 0
      for (const flowId of project.flowIds) {
        try {
          await addFlowToProject(targetProjectId, flowId)
          console.log(`   ✅ Flujo ${flowId} agregado a ${project.name}`)
          addedCount++
        } catch (err) {
          console.warn(`   ⚠️ No se pudo agregar flujo ${flowId}:`, err.message)
        }
      }
      
      console.log(`✅ Proyecto ${project.name} configurado con ${addedCount}/${project.flowIds.length} flujos`)
    }
    
    console.log('\n✅ Seed de proyectos completado exitosamente!')
    console.log('📊 Resumen:')
    const finalProjects = await getProjects()
    finalProjects.forEach(project => {
      console.log(`   - ${project.name}: ${project.flowIds.length} flujos`)
    })
    console.log('\n💡 Recarga la página para ver los proyectos en el sidebar')
  } catch (error) {
    console.error('❌ Error al crear proyectos:', error.message)
    console.error(error.stack)
    console.log('\n💡 Asegúrate de ejecutar este código en la consola del navegador (F12)')
  }
}

// Exportar para uso en consola del navegador
if (typeof window !== 'undefined') {
  window.seedProjects = seedProjects
  console.log('✅ Función seedProjects() disponible. Ejecuta: await seedProjects()')
} else {
  console.log('⚠️ Este script debe ejecutarse desde la consola del navegador')
  console.log('   Abre http://localhost:5173 y ejecuta: await seedProjects()')
}

