/**
 * Chat Node - Plugin para interactuar con Agent Core mediante chat
 * 
 * Este nodo permite:
 * - Enviar mensajes al Agent Core
 * - Recibir respuestas del modelo en tiempo real
 * - Mostrar historial de conversación
 * 
 * Conexiones:
 * - Input: Conectado al Agent Core (output 4 - model_response)
 * - Output: Conectado al Agent Core (input)
 */

module.exports = function(RED) {
  // HTTP endpoints para el frontend (registrados ANTES del constructor del nodo)
  // Esto asegura que estén disponibles cuando Node-RED carga el plugin
  if (RED.httpAdmin) {
    // Obtener historial
    RED.httpAdmin.get('/chat-node/:nodeId/history', function(req, res) {
      const nodeId = req.params.nodeId;
      const chatNode = RED.nodes.getNode(nodeId);
      if (!chatNode || chatNode.type !== 'chat-node') {
        return res.status(404).json({ error: 'Chat node not found' });
      }
      res.json({
        nodeId: nodeId,
        history: chatNode.messageHistory || [],
        count: (chatNode.messageHistory || []).length
      });
    });

    // Enviar mensaje (desde el frontend)
    RED.httpAdmin.post('/chat-node/:nodeId/send', function(req, res) {
      const nodeId = req.params.nodeId;
      
      // Debug: Log para ver qué nodeId se está buscando
      RED.log.info(`[chat-node] POST /chat-node/${nodeId}/send - Buscando nodo...`);
      
      // Intentar obtener el nodo
      let chatNode = RED.nodes.getNode(nodeId);
      
      // Si no se encuentra, intentar buscar por todos los nodos (puede que el nodo no esté desplegado aún)
      if (!chatNode) {
        RED.log.warn(`[chat-node] Nodo no encontrado con ID: ${nodeId}`);
        
        // Listar todos los nodos chat-node disponibles para debug
        const allNodes = RED.nodes.getAllNodes();
        const chatNodes = allNodes.filter(n => n.type === 'chat-node');
        
        RED.log.info(`[chat-node] Total de nodos en runtime: ${allNodes.length}`);
        RED.log.info(`[chat-node] Nodos chat-node desplegados: ${chatNodes.length}`);
        if (chatNodes.length > 0) {
          RED.log.info(`[chat-node] IDs de nodos chat-node disponibles: ${chatNodes.map(n => n.id).join(', ')}`);
        }
        
        // Verificar si el nodo existe en el flow pero no está desplegado
        const flows = RED.nodes.getFlows();
        let nodeInFlow = null;
        for (const flow of flows) {
          if (flow.id === nodeId || (flow.nodes && flow.nodes.find(n => n.id === nodeId))) {
            nodeInFlow = flow.nodes ? flow.nodes.find(n => n.id === nodeId) : flow;
            break;
          }
        }
        
        // Buscar en todos los flows
        if (!nodeInFlow) {
          for (const flow of flows) {
            if (flow.nodes) {
              nodeInFlow = flow.nodes.find(n => n.id === nodeId && n.type === 'chat-node');
              if (nodeInFlow) break;
            }
          }
        }
        
        if (nodeInFlow) {
          RED.log.warn(`[chat-node] Nodo encontrado en flow pero no desplegado aún. ID: ${nodeId}, Type: ${nodeInFlow.type}`);
          return res.status(503).json({ 
            error: 'Chat node not deployed yet',
            message: 'El nodo existe en el flow pero aún no está desplegado. Intenta guardar el flow nuevamente.',
            requestedId: nodeId,
            availableChatNodes: chatNodes.map(n => n.id)
          });
        }
        
        return res.status(404).json({ 
          error: 'Chat node not found',
          message: 'El nodo no existe en el flow o no está desplegado.',
          requestedId: nodeId,
          availableChatNodes: chatNodes.map(n => n.id)
        });
      }
      
      if (chatNode.type !== 'chat-node') {
        RED.log.warn(`[chat-node] Nodo encontrado pero tipo incorrecto: ${chatNode.type} (esperado: chat-node)`);
        return res.status(404).json({ error: 'Chat node not found (wrong type)' });
      }
      
      RED.log.info(`[chat-node] ✅ Nodo encontrado y desplegado: ${nodeId}`);

      const { message, chatMessage } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Crear mensaje para enviar al Agent Core
      // IMPORTANTE: NO incluir _agentCore aquí - el Agent Core debe procesarlo como un nuevo input
      const msg = {
        payload: message,
        chatEvent: 'message_sent',
        chatMessage: chatMessage || {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'user',
          content: message,
          timestamp: Date.now(),
        }
        // NO incluir _agentCore - esto es un mensaje nuevo del usuario, no una respuesta del modelo
      };

      // Buscar Agent Core conectado automáticamente
      // 1. Primero intentar usar los wires del nodo (si hay conexión física)
      let agentCoreNode = null;
      if (chatNode.wires && chatNode.wires[0] && chatNode.wires[0].length > 0) {
        // Hay wires conectados, buscar el primer nodo conectado
        const connectedNodeId = chatNode.wires[0][0];
        const connectedNode = RED.nodes.getNode(connectedNodeId);
        if (connectedNode && connectedNode.type === 'agent-core') {
          agentCoreNode = connectedNode;
          RED.log.info(`[chat-node] ✅ Agent Core encontrado por wires: ${connectedNodeId}`);
        }
      }

      // 2. Si no hay wires, buscar Agent Core en el mismo flow
      if (!agentCoreNode) {
        const flowId = chatNode.z; // ID del flow al que pertenece el chat node
        const allNodes = RED.nodes.getAllNodes();
        agentCoreNode = allNodes.find(n => n.type === 'agent-core' && n.z === flowId);
        
        if (agentCoreNode) {
          RED.log.info(`[chat-node] ✅ Agent Core encontrado automáticamente en el mismo flow: ${agentCoreNode.id}`);
        } else {
          RED.log.warn(`[chat-node] ⚠️ No se encontró Agent Core en el flow ${flowId}`);
        }
      }

      if (!agentCoreNode) {
        return res.status(500).json({ 
          error: 'Agent Core not found',
          message: 'No se encontró un nodo Agent Core conectado o en el mismo flow. Asegúrate de tener un Agent Core en el flow.'
        });
      }

      // Enviar mensaje directamente al Agent Core
      // El Agent Core procesará este mensaje como un nuevo input
      // En Node-RED, usar receive() si está disponible, sino emitir 'input' con send y done
      if (typeof agentCoreNode.receive === 'function') {
        agentCoreNode.receive(msg);
      } else {
        // Fallback: usar el sistema de send del Agent Core directamente
        // Crear funciones send y done para el Agent Core
        const send = function(msgs) {
          // El Agent Core enviará sus outputs normalmente
        };
        const done = function(err) {
          if (err) {
            RED.log.error(`[chat-node] Error en Agent Core: ${err.message}`);
          }
        };
        agentCoreNode.emit('input', msg, send, done);
      }

      res.json({ success: true, message: 'Message sent to Agent Core', agentCoreId: agentCoreNode.id });
    });

    // Limpiar historial
    RED.httpAdmin.post('/chat-node/:nodeId/clear', function(req, res) {
      const nodeId = req.params.nodeId;
      const chatNode = RED.nodes.getNode(nodeId);
      if (!chatNode || chatNode.type !== 'chat-node') {
        return res.status(404).json({ error: 'Chat node not found' });
      }
      chatNode.messageHistory = [];
      res.json({ success: true, message: 'Historial limpiado' });
    });
  }

  function ChatNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Configuración
    node.name = config.name || 'Chat';
    node.maxHistory = parseInt(config.maxHistory || 100); // Máximo de mensajes en historial

    // Historial de mensajes (se puede persistir después)
    node.messageHistory = [];

    // Estado del nodo
    node.status({ fill: 'green', shape: 'dot', text: 'Listo' });

    // Manejar mensajes entrantes (desde Agent Core - output 4)
    node.on('input', function(msg) {
      try {
        // Verificar si es una respuesta del modelo
        if (msg._agentCore && msg._agentCore.type === 'model_response') {
          // Extraer el mensaje del modelo
          let modelMessage = null;
          
          if (msg.payload) {
            // Intentar extraer el mensaje de diferentes formatos
            if (typeof msg.payload === 'string') {
              modelMessage = msg.payload;
            } else if (msg.payload.message) {
              modelMessage = msg.payload.message;
            } else if (msg.payload.content) {
              modelMessage = msg.payload.content;
            } else if (msg.agentResult && msg.agentResult.message) {
              modelMessage = msg.agentResult.message;
            } else {
              // Si no hay mensaje claro, usar el payload completo como string
              modelMessage = JSON.stringify(msg.payload, null, 2);
            }
          }

          if (modelMessage) {
            // Agregar mensaje al historial
            const chatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'agent',
              content: modelMessage,
              timestamp: Date.now(),
              traceId: msg._agentCore.traceId,
              iteration: msg._agentCore.iteration
            };

            node.messageHistory.push(chatMessage);

            // Limitar historial
            if (node.messageHistory.length > node.maxHistory) {
              node.messageHistory.shift();
            }

            // Enviar mensaje al frontend (si está conectado)
            node.send({
              ...msg,
              chatMessage: chatMessage,
              chatEvent: 'message_received'
            });

            // Actualizar estado
            node.status({ fill: 'green', shape: 'dot', text: 'Respuesta recibida' });
          }
        } else if (msg.chatEvent === 'message_sent') {
          // Mensaje enviado desde el frontend
          if (msg.chatMessage) {
            node.messageHistory.push(msg.chatMessage);
            
            // Limitar historial
            if (node.messageHistory.length > node.maxHistory) {
              node.messageHistory.shift();
            }

            // Enviar mensaje al Agent Core (output)
            // El mensaje debe ir al input del Agent Core
            node.send({
              payload: msg.chatMessage.content,
              chatMessage: msg.chatMessage,
              chatEvent: 'message_sent'
            });

            // Actualizar estado
            node.status({ fill: 'yellow', shape: 'ring', text: 'Enviando...' });
          }
        } else if (msg.payload) {
          // Mensaje directo (sin chatEvent), reenviar al Agent Core
          node.send(msg);
        } else {
          // Otro tipo de mensaje, reenviar tal cual
          node.send(msg);
        }
      } catch (error) {
        node.error(`Error en Chat Node: ${error.message}`, msg);
        node.status({ fill: 'red', shape: 'ring', text: 'Error' });
      }
    });

    // Limpiar al cerrar
    node.on('close', function() {
      // Aquí se puede guardar el historial si se implementa persistencia
    });
  }

  RED.nodes.registerType('chat-node', ChatNode);
  RED.log.info('[chat-node] Nodo chat-node registrado exitosamente');
};

