/**
 * Utilidades para almacenar y gestionar proyectos
 * 
 * Los proyectos son contenedores que agrupan flujos de trabajo.
 * Se almacenan en localStorage con fallback a IndexedDB si está disponible.
 */

export interface Project {
  id: string
  name: string
  description?: string
  flowIds: string[] // IDs de los flujos que pertenecen a este proyecto
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'flow-red-projects'
const STORE_NAME = 'projects'

/**
 * Abre la base de datos IndexedDB para proyectos
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FlowREDProjects', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Obtiene todos los proyectos
 */
export async function getProjects(): Promise<Project[]> {
  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const projects = await new Promise<Project[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(new Error('Error al obtener proyectos desde IndexedDB'))
    })
    db.close()
    return projects.sort((a, b) => b.updatedAt - a.updatedAt) // Más recientes primero
  } catch (error) {
    // Fallback a localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const projects = JSON.parse(stored) as Project[]
        return projects.sort((a, b) => b.updatedAt - a.updatedAt)
      }
    } catch (localError) {
      console.error('Error al obtener proyectos desde localStorage:', localError)
    }
    return []
  }
}

/**
 * Guarda un proyecto
 */
export async function saveProject(project: Project): Promise<void> {
  const updatedProject = {
    ...project,
    updatedAt: Date.now(),
  }

  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.put(updatedProject)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Error al guardar proyecto en IndexedDB'))
    })
    db.close()
  } catch (error) {
    // Fallback a localStorage
    try {
      const projects = await getProjects()
      const existingIndex = projects.findIndex(p => p.id === project.id)
      if (existingIndex >= 0) {
        projects[existingIndex] = updatedProject
      } else {
        projects.push(updatedProject)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    } catch (localError) {
      console.error('Error al guardar proyecto en localStorage:', localError)
    }
  }
}

/**
 * Crea un nuevo proyecto
 */
export async function createProject(name: string, description?: string): Promise<Project> {
  const project: Project = {
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    flowIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await saveProject(project)
  return project
}

/**
 * Elimina un proyecto
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(projectId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Error al eliminar proyecto desde IndexedDB'))
    })
    db.close()
  } catch (error) {
    // Fallback a localStorage
    try {
      const projects = await getProjects()
      const filtered = projects.filter(p => p.id !== projectId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (localError) {
      console.error('Error al eliminar proyecto desde localStorage:', localError)
    }
  }
}

/**
 * Obtiene un proyecto por ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const project = await new Promise<Project | null>((resolve, reject) => {
      const request = store.get(projectId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(new Error('Error al obtener proyecto desde IndexedDB'))
    })
    db.close()
    return project
  } catch (error) {
    // Fallback a localStorage
    try {
      const projects = await getProjects()
      return projects.find(p => p.id === projectId) || null
    } catch (localError) {
      console.error('Error al obtener proyecto desde localStorage:', localError)
      return null
    }
  }
}

/**
 * Agrega un flujo a un proyecto
 */
export async function addFlowToProject(projectId: string, flowId: string): Promise<void> {
  const project = await getProject(projectId)
  if (!project) {
    throw new Error(`Proyecto con ID ${projectId} no encontrado`)
  }

  if (!project.flowIds.includes(flowId)) {
    project.flowIds.push(flowId)
    await saveProject(project)
  }
}

/**
 * Elimina un flujo de un proyecto
 */
export async function removeFlowFromProject(projectId: string, flowId: string): Promise<void> {
  const project = await getProject(projectId)
  if (!project) {
    throw new Error(`Proyecto con ID ${projectId} no encontrado`)
  }

  project.flowIds = project.flowIds.filter(id => id !== flowId)
  await saveProject(project)
}

/**
 * Obtiene los flujos de un proyecto
 */
export async function getProjectFlows(projectId: string): Promise<string[]> {
  const project = await getProject(projectId)
  return project?.flowIds || []
}

