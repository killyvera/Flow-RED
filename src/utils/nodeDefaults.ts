/**
 * Mapeo de propiedades conocidas para nodos comunes de Node-RED
 * 
 * Como el endpoint /nodes no devuelve defaults, usamos este mapeo
 * como fallback para nodos conocidos.
 * 
 * Revisado y corregido comparando con la UI legacy de Node-RED
 */

import type { PropertyDefinition } from './nodeSchema'

/**
 * Propiedades conocidas por tipo de nodo
 */
const knownNodeProperties: Record<string, PropertyDefinition[]> = {
  // ===== NODOS COMUNES =====
  'inject': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'payload', type: 'str', label: 'Payload', default: '' },
    { id: 'payloadType', type: 'select', label: 'Payload Type', default: 'date', options: [
      { value: 'date', label: 'Date' },
      { value: 'num', label: 'Number' },
      { value: 'bool', label: 'Boolean' },
      { value: 'str', label: 'String' },
      { value: 'json', label: 'JSON' },
      { value: 'bin', label: 'Binary' },
      { value: 'flow', label: 'Flow' },
      { value: 'global', label: 'Global' },
      { value: 'msg', label: 'Message' },
      { value: 'env', label: 'Environment' },
    ]},
    { id: 'topic', type: 'str', label: 'Topic', default: '' },
    { id: 'repeat', type: 'str', label: 'Repeat', default: '' },
    { id: 'crontab', type: 'str', label: 'Crontab', default: '' },
    { id: 'once', type: 'bool', label: 'Once', default: false },
    { id: 'onceDelay', type: 'num', label: 'Once Delay', default: 0.1 },
    // props es un array complejo que se maneja como JSON
    { id: 'props', type: 'json', label: 'Properties (JSON)', default: '[]' },
  ],
  'debug': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'complete', type: 'select', label: 'Output', default: 'false', options: [
      { value: 'false', label: 'msg.payload' },
      { value: 'true', label: 'Complete msg object' },
      { value: 'payload', label: 'msg.payload (JSON)' },
    ]},
    { id: 'targetType', type: 'select', label: 'Target', default: 'msg', options: [
      { value: 'msg', label: 'msg' },
      { value: 'flow', label: 'flow' },
      { value: 'global', label: 'global' },
    ]},
    { id: 'tosidebar', type: 'bool', label: 'To Sidebar', default: true },
    { id: 'console', type: 'bool', label: 'To Console', default: false },
    { id: 'tostatus', type: 'bool', label: 'To Status', default: false },
    { id: 'statusVal', type: 'str', label: 'Status Value', default: '' },
    { id: 'statusType', type: 'str', label: 'Status Type', default: 'auto' },
  ],
  'comment': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'info', type: 'str', label: 'Info', default: '' },
  ],

  // ===== NODOS DE FUNCIÓN =====
  'function': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'func', type: 'str', label: 'Function', default: '\nreturn msg;', required: true },
    { id: 'outputs', type: 'num', label: 'Outputs', default: 1 },
    { id: 'timeout', type: 'num', label: 'Timeout', default: 0 },
    { id: 'noerr', type: 'num', label: 'No Error', default: 0 },
    { id: 'initialize', type: 'str', label: 'Initialize', default: '' },
    { id: 'finalize', type: 'str', label: 'Finalize', default: '' },
    // libs es un array complejo que se maneja como JSON
    { id: 'libs', type: 'json', label: 'Libraries (JSON)', default: '[]' },
  ],
  'switch': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
    { id: 'propertyType', type: 'select', label: 'Property Type', default: 'msg', options: [
      { value: 'msg', label: 'msg' },
      { value: 'flow', label: 'flow' },
      { value: 'global', label: 'global' },
      { value: 'env', label: 'env' },
    ]},
    { id: 'checkall', type: 'bool', label: 'Check All', default: true },
    { id: 'repair', type: 'bool', label: 'Repair', default: false },
    { id: 'outputs', type: 'num', label: 'Outputs', default: 1 },
    // rules es un array complejo que se maneja como JSON
    { id: 'rules', type: 'json', label: 'Rules (JSON)', default: '[{"t":"eq","v":"","vt":"str"}]' },
  ],
  'change': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    // rules es un array complejo que se maneja como JSON
    { id: 'rules', type: 'json', label: 'Rules (JSON)', default: '[{"t":"set","p":"payload","pt":"msg","to":"","tot":"str"}]' },
    // Propiedades legacy
    { id: 'action', type: 'str', label: 'Action (legacy)', default: '' },
    { id: 'property', type: 'str', label: 'Property (legacy)', default: '' },
    { id: 'from', type: 'str', label: 'From (legacy)', default: '' },
    { id: 'to', type: 'str', label: 'To (legacy)', default: '' },
    { id: 'reg', type: 'bool', label: 'Reg (legacy)', default: false },
  ],
  'template': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'field', type: 'str', label: 'Field', default: 'payload' },
    { id: 'fieldType', type: 'select', label: 'Field Type', default: 'msg', options: [
      { value: 'msg', label: 'msg' },
      { value: 'flow', label: 'flow' },
      { value: 'global', label: 'global' },
    ]},
    { id: 'template', type: 'str', label: 'Template', default: 'This is the payload: {{payload}} !', required: true },
    { id: 'format', type: 'select', label: 'Format', default: 'handlebars', options: [
      { value: 'handlebars', label: 'Handlebars' },
      { value: 'html', label: 'HTML' },
      { value: 'json', label: 'JSON' },
      { value: 'javascript', label: 'JavaScript' },
      { value: 'css', label: 'CSS' },
      { value: 'markdown', label: 'Markdown' },
      { value: 'php', label: 'PHP' },
      { value: 'python', label: 'Python' },
      { value: 'sql', label: 'SQL' },
      { value: 'yaml', label: 'YAML' },
      { value: 'text', label: 'None' },
    ]},
    { id: 'syntax', type: 'select', label: 'Syntax', default: 'mustache', options: [
      { value: 'mustache', label: 'Mustache' },
      { value: 'plain', label: 'Plain' },
    ]},
    { id: 'output', type: 'select', label: 'Output', default: 'str', options: [
      { value: 'str', label: 'Plain' },
      { value: 'json', label: 'JSON' },
      { value: 'yaml', label: 'YAML' },
    ]},
  ],
  'range': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'minin', type: 'num', label: 'Min In', default: '', required: true },
    { id: 'maxin', type: 'num', label: 'Max In', default: '', required: true },
    { id: 'minout', type: 'num', label: 'Min Out', default: '', required: true },
    { id: 'maxout', type: 'num', label: 'Max Out', default: '', required: true },
    { id: 'action', type: 'select', label: 'Action', default: 'scale', options: [
      { value: 'scale', label: 'Scale' },
      { value: 'clamp', label: 'Clamp' },
    ]},
    { id: 'round', type: 'bool', label: 'Round Result', default: false },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
  ],
  'rbe': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'func', type: 'select', label: 'Function', default: 'rbe', options: [
      { value: 'rbe', label: 'RBE' },
      { value: 'rbei', label: 'RBEI' },
      { value: 'deadbandEq', label: 'Deadband Equal' },
      { value: 'deadband', label: 'Deadband' },
      { value: 'narrowbandEq', label: 'Narrowband Equal' },
      { value: 'narrowband', label: 'Narrowband' },
    ]},
    { id: 'gap', type: 'str', label: 'Gap', default: '' },
    { id: 'start', type: 'str', label: 'Start Value', default: '' },
    { id: 'inout', type: 'select', label: 'In/Out', default: 'out', options: [
      { value: 'out', label: 'Out' },
      { value: 'in', label: 'In' },
    ]},
    { id: 'septopics', type: 'bool', label: 'Separate Topics', default: true },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
    { id: 'topi', type: 'str', label: 'Topic', default: 'topic', required: true },
  ],
  'delay': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'pauseType', type: 'select', label: 'Action', default: 'delay', options: [
      { value: 'delay', label: 'Delay each message' },
      { value: 'rate', label: 'Rate limit' },
    ]},
    { id: 'timeout', type: 'num', label: 'Timeout', default: 5, required: true },
    { id: 'timeoutUnits', type: 'select', label: 'Timeout Units', default: 'seconds', options: [
      { value: 'milliseconds', label: 'Milliseconds' },
      { value: 'seconds', label: 'Seconds' },
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
    ]},
    { id: 'randomFirst', type: 'num', label: 'Random First', default: 1, required: true },
    { id: 'randomLast', type: 'num', label: 'Random Last', default: 5, required: true },
    { id: 'randomUnits', type: 'select', label: 'Random Units', default: 'seconds', options: [
      { value: 'milliseconds', label: 'Milliseconds' },
      { value: 'seconds', label: 'Seconds' },
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
    ]},
    { id: 'rate', type: 'num', label: 'Rate', default: 1, required: true },
    { id: 'rateUnits', type: 'select', label: 'Rate Units', default: 'second', options: [
      { value: 'second', label: 'Per Second' },
      { value: 'minute', label: 'Per Minute' },
      { value: 'hour', label: 'Per Hour' },
      { value: 'day', label: 'Per Day' },
    ]},
    { id: 'nbRateUnits', type: 'num', label: 'Number of Rate Units', default: 1 },
    { id: 'drop', type: 'bool', label: 'Drop', default: false },
    { id: 'allowrate', type: 'bool', label: 'Allow Rate Override', default: false },
    { id: 'outputs', type: 'num', label: 'Outputs', default: 1 },
  ],
  'trigger': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'op1', type: 'str', label: 'Send', default: '1' },
    { id: 'op1type', type: 'str', label: 'Op1 Type', default: '' },
    { id: 'then', type: 'select', label: 'Then', default: 'block', options: [
      { value: 'block', label: 'Wait and reset' },
      { value: 'wait', label: 'Wait for' },
      { value: 'loop', label: 'Wait in loop' },
    ]},
    { id: 'duration', type: 'num', label: 'Duration', default: 0 },
    { id: 'units', type: 'select', label: 'Units', default: 'ms', options: [
      { value: 'ms', label: 'Milliseconds' },
      { value: 's', label: 'Seconds' },
      { value: 'min', label: 'Minutes' },
      { value: 'hr', label: 'Hours' },
    ]},
    { id: 'extend', type: 'bool', label: 'Extend', default: false },
    { id: 'overrideDelay', type: 'bool', label: 'Override Delay', default: false },
    { id: 'op2', type: 'str', label: 'Then Send', default: '0' },
    { id: 'op2type', type: 'str', label: 'Op2 Type', default: '' },
    { id: 'second', type: 'bool', label: 'Second Output', default: false },
    { id: 'reset', type: 'str', label: 'Reset Payload', default: '' },
    { id: 'bytopic', type: 'select', label: 'By Topic', default: 'all', options: [
      { value: 'all', label: 'All Topics' },
      { value: 'topic', label: 'By Topics' },
    ]},
    { id: 'topic', type: 'str', label: 'Topic', default: '' },
    { id: 'outputs', type: 'num', label: 'Outputs', default: 1 },
  ],
  'exec': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'command', type: 'str', label: 'Command', default: '', required: true },
    { id: 'addpay', type: 'str', label: 'Add Payload', default: '' },
    { id: 'append', type: 'str', label: 'Append', default: '' },
    { id: 'useSpawn', type: 'select', label: 'Use Spawn', default: 'false', options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ]},
    { id: 'timer', type: 'str', label: 'Timer', default: '' },
    { id: 'winHide', type: 'bool', label: 'Windows Hide', default: false },
    { id: 'oldrc', type: 'bool', label: 'Old Return Code', default: false },
  ],

  // ===== NODOS DE SECUENCIA =====
  'split': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
    { id: 'splt', type: 'str', label: 'Split Using', default: '\\n' },
    { id: 'spltType', type: 'select', label: 'Split Type', default: 'str', options: [
      { value: 'str', label: 'String' },
      { value: 'bin', label: 'Binary' },
      { value: 'len', label: 'Length' },
    ]},
    { id: 'arraySplt', type: 'num', label: 'Array Split', default: 1 },
    { id: 'arraySpltType', type: 'select', label: 'Array Split Type', default: 'len', options: [
      { value: 'len', label: 'Length' },
    ]},
    { id: 'stream', type: 'bool', label: 'Stream', default: false },
    { id: 'addname', type: 'str', label: 'Add Name', default: '' },
  ],
  'join': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'mode', type: 'select', label: 'Mode', default: 'auto', options: [
      { value: 'auto', label: 'Auto' },
      { value: 'custom', label: 'Custom' },
      { value: 'reduce', label: 'Reduce' },
    ]},
    { id: 'property', type: 'str', label: 'Property', default: '' },
    { id: 'propertyType', type: 'str', label: 'Property Type', default: '' },
    { id: 'build', type: 'select', label: 'Build', default: 'string', options: [
      { value: 'string', label: 'String' },
      { value: 'buffer', label: 'Buffer' },
      { value: 'array', label: 'Array' },
      { value: 'object', label: 'Object' },
    ]},
    { id: 'join', type: 'str', label: 'Join', default: '' },
    { id: 'count', type: 'num', label: 'Count', default: 0 },
    { id: 'timeout', type: 'num', label: 'Timeout', default: 0 },
    { id: 'timeoutUnits', type: 'select', label: 'Timeout Units', default: 'milliseconds', options: [
      { value: 'milliseconds', label: 'Milliseconds' },
      { value: 'seconds', label: 'Seconds' },
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
    ]},
    { id: 'reduce', type: 'str', label: 'Reduce', default: '' },
    { id: 'reduceType', type: 'str', label: 'Reduce Type', default: '' },
    { id: 'reduceFix', type: 'bool', label: 'Reduce Fix', default: false },
  ],
  'batch': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'mode', type: 'select', label: 'Mode', default: 'count', options: [
      { value: 'count', label: 'Number of messages' },
      { value: 'interval', label: 'Time interval' },
      { value: 'concat', label: 'Concatenate messages' },
    ]},
    { id: 'count', type: 'num', label: 'Count', default: 0 },
    { id: 'overlap', type: 'num', label: 'Overlap', default: 0 },
    { id: 'honourParts', type: 'bool', label: 'Honour Parts', default: false },
    { id: 'interval', type: 'num', label: 'Interval', default: 0 },
    { id: 'retain', type: 'bool', label: 'Retain', default: false },
    { id: 'property', type: 'str', label: 'Property', default: '' },
    { id: 'propertyType', type: 'str', label: 'Property Type', default: '' },
    { id: 'start', type: 'str', label: 'Start', default: '' },
    { id: 'startType', type: 'str', label: 'Start Type', default: '' },
    { id: 'end', type: 'str', label: 'End', default: '' },
    { id: 'endType', type: 'str', label: 'End Type', default: '' },
  ],
  'sort': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'target', type: 'str', label: 'Target', default: '' },
    { id: 'targetType', type: 'str', label: 'Target Type', default: '' },
    { id: 'msgKey', type: 'str', label: 'Message Key', default: '' },
    { id: 'msgKeyType', type: 'str', label: 'Message Key Type', default: '' },
    { id: 'seqKey', type: 'str', label: 'Sequence Key', default: '' },
    { id: 'seqKeyType', type: 'str', label: 'Sequence Key Type', default: '' },
    { id: 'order', type: 'select', label: 'Order', default: 'ascending', options: [
      { value: 'ascending', label: 'Ascending' },
      { value: 'descending', label: 'Descending' },
    ]},
    { id: 'as_num', type: 'bool', label: 'As Number', default: false },
  ],

  // ===== NODOS PARSER =====
  'json': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
    { id: 'action', type: 'select', label: 'Action', default: '', options: [
      { value: '', label: 'Convert to JSON string' },
      { value: 'str', label: 'Convert to JSON string' },
      { value: 'obj', label: 'Parse JSON string' },
    ]},
    { id: 'pretty', type: 'bool', label: 'Pretty', default: false },
  ],
  'xml': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
    { id: 'attr', type: 'str', label: 'Attribute', default: '' },
    { id: 'chr', type: 'str', label: 'Character', default: '' },
  ],
  'csv': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'spec', type: 'select', label: 'Spec', default: 'rfc', options: [
      { value: 'rfc', label: 'RFC 4180' },
      { value: 'custom', label: 'Custom' },
    ]},
    { id: 'sep', type: 'str', label: 'Separator', default: ',', required: true },
    { id: 'hdrin', type: 'str', label: 'Header In', default: '' },
    { id: 'hdrout', type: 'select', label: 'Header Out', default: 'none', options: [
      { value: 'none', label: 'None' },
      { value: 'all', label: 'All' },
      { value: 'first', label: 'First' },
    ]},
    { id: 'multi', type: 'select', label: 'Multi', default: 'one', required: true, options: [
      { value: 'one', label: 'One' },
      { value: 'multi', label: 'Multi' },
    ]},
    { id: 'ret', type: 'str', label: 'Return', default: '\\r\\n' },
    { id: 'temp', type: 'str', label: 'Temp', default: '' },
    { id: 'skip', type: 'num', label: 'Skip', default: 0 },
    { id: 'strings', type: 'bool', label: 'Strings', default: true },
    { id: 'include_empty_strings', type: 'bool', label: 'Include Empty Strings', default: false },
    { id: 'include_null_values', type: 'bool', label: 'Include Null Values', default: false },
  ],
  'yaml': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'property', type: 'str', label: 'Property', default: 'payload', required: true },
  ],
  'html': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'property', type: 'str', label: 'Property', default: 'payload' },
    { id: 'tag', type: 'str', label: 'Tag', default: '' },
    { id: 'ret', type: 'select', label: 'Output', default: 'html', options: [
      { value: 'html', label: 'HTML' },
      { value: 'text', label: 'Text' },
      { value: 'attr', label: 'Attribute' },
      { value: 'compl', label: 'Complete' },
    ]},
    { id: 'as', type: 'select', label: 'As', default: 'single', options: [
      { value: 'single', label: 'Single' },
      { value: 'multi', label: 'Multi' },
    ]},
    { id: 'outproperty', type: 'str', label: 'Out Property', default: 'payload' },
    { id: 'chr', type: 'str', label: 'Character', default: '_' },
  ],

  // ===== NODOS DE RED =====
  'http request': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'method', type: 'select', label: 'Method', default: 'GET', options: [
      { value: 'GET', label: 'GET' },
      { value: 'POST', label: 'POST' },
      { value: 'PUT', label: 'PUT' },
      { value: 'DELETE', label: 'DELETE' },
      { value: 'HEAD', label: 'HEAD' },
      { value: 'use', label: 'Set by msg.method' },
    ]},
    { id: 'url', type: 'str', label: 'URL', default: '', required: true },
    { id: 'ret', type: 'select', label: 'Return', default: 'txt', options: [
      { value: 'txt', label: 'UTF-8 String' },
      { value: 'bin', label: 'Binary Buffer' },
      { value: 'obj', label: 'JSON Object' },
    ]},
    { id: 'paytoqs', type: 'select', label: 'Payload', default: 'ignore', options: [
      { value: 'ignore', label: 'Ignore' },
      { value: 'query', label: 'Query String' },
      { value: 'body', label: 'Body' },
    ]},
    { id: 'usetls', type: 'bool', label: 'Use TLS', default: false },
    { id: 'tls', type: 'str', label: 'TLS Config', default: '' },
    { id: 'useAuth', type: 'bool', label: 'Use Authentication', default: false },
    { id: 'authType', type: 'select', label: 'Auth Type', default: '', options: [
      { value: '', label: 'None' },
      { value: 'basic', label: 'Basic' },
      { value: 'digest', label: 'Digest' },
      { value: 'bearer', label: 'Bearer' },
    ]},
    { id: 'persist', type: 'bool', label: 'Persist Cookies', default: false },
    { id: 'useProxy', type: 'bool', label: 'Use Proxy', default: false },
    { id: 'proxy', type: 'str', label: 'Proxy Config', default: '' },
    { id: 'senderr', type: 'bool', label: 'Send Errors', default: false },
    { id: 'insecureHTTPParser', type: 'bool', label: 'Insecure HTTP Parser', default: false },
    // headers es un array complejo que se maneja como JSON
    { id: 'headers', type: 'json', label: 'Headers (JSON)', default: '[]' },
  ],
  'http in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'url', type: 'str', label: 'URL', default: '', required: true },
    { id: 'method', type: 'select', label: 'Method', default: 'get', options: [
      { value: 'get', label: 'GET' },
      { value: 'post', label: 'POST' },
      { value: 'put', label: 'PUT' },
      { value: 'patch', label: 'PATCH' },
      { value: 'delete', label: 'DELETE' },
    ]},
    { id: 'upload', type: 'bool', label: 'Upload', default: false },
    { id: 'skipBodyParsing', type: 'bool', label: 'Skip Body Parsing', default: false },
  ],
  'http out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'statusCode', type: 'num', label: 'Status Code', default: 200 },
    { id: 'headers', type: 'str', label: 'Headers', default: '' },
  ],
  'mqtt in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'topic', type: 'str', label: 'Topic', default: '', required: true },
    { id: 'qos', type: 'select', label: 'QoS', default: '2', options: [
      { value: '0', label: '0 - At most once' },
      { value: '1', label: '1 - At least once' },
      { value: '2', label: '2 - Exactly once' },
    ]},
    { id: 'broker', type: 'str', label: 'Broker', default: '', required: true },
  ],
  'mqtt out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'topic', type: 'str', label: 'Topic', default: '', required: true },
    { id: 'qos', type: 'select', label: 'QoS', default: '2', options: [
      { value: '0', label: '0 - At most once' },
      { value: '1', label: '1 - At least once' },
      { value: '2', label: '2 - Exactly once' },
    ]},
    { id: 'retain', type: 'bool', label: 'Retain', default: false },
    { id: 'respTopic', type: 'str', label: 'Response Topic', default: '' },
    { id: 'contentType', type: 'str', label: 'Content Type', default: '' },
    { id: 'userProps', type: 'str', label: 'User Properties', default: '' },
    { id: 'correl', type: 'str', label: 'Correlation Data', default: '' },
    { id: 'expiry', type: 'str', label: 'Message Expiry', default: '' },
    { id: 'broker', type: 'str', label: 'Broker', default: '', required: true },
  ],
  'websocket-listener': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'path', type: 'str', label: 'Path', default: '', required: true },
    { id: 'wholemsg', type: 'select', label: 'Send/Receive', default: 'false', options: [
      { value: 'false', label: 'Payload only' },
      { value: 'true', label: 'Complete message object' },
    ]},
    { id: 'subprotocol', type: 'str', label: 'Subprotocol', default: '' },
    { id: 'hb', type: 'num', label: 'Heartbeat (seconds)', default: 0 },
  ],
  'websocket-client': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'url', type: 'str', label: 'URL', default: '', required: true },
    { id: 'wholemsg', type: 'select', label: 'Send/Receive', default: 'false', options: [
      { value: 'false', label: 'Payload only' },
      { value: 'true', label: 'Complete message object' },
    ]},
    { id: 'subprotocol', type: 'str', label: 'Subprotocol', default: '' },
    { id: 'hb', type: 'num', label: 'Heartbeat (seconds)', default: 0 },
    { id: 'tls', type: 'str', label: 'TLS Config', default: '' },
  ],
  'websocket in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'server', type: 'str', label: 'Server', default: '' },
    { id: 'client', type: 'str', label: 'Client', default: '' },
  ],
  'websocket out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'server', type: 'str', label: 'Server', default: '' },
    { id: 'client', type: 'str', label: 'Client', default: '' },
  ],
  'tcp in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'server', type: 'select', label: 'Server', default: 'server', options: [
      { value: 'server', label: 'Server' },
      { value: 'client', label: 'Client' },
    ]},
    { id: 'host', type: 'str', label: 'Host', default: '' },
    { id: 'port', type: 'num', label: 'Port', default: '', required: true },
    { id: 'datamode', type: 'select', label: 'Data Mode', default: 'stream', options: [
      { value: 'stream', label: 'Stream' },
      { value: 'single', label: 'Single' },
    ]},
    { id: 'datatype', type: 'select', label: 'Data Type', default: 'buffer', options: [
      { value: 'buffer', label: 'Buffer' },
      { value: 'utf8', label: 'UTF-8 String' },
      { value: 'base64', label: 'Base64' },
    ]},
    { id: 'newline', type: 'str', label: 'Newline', default: '' },
    { id: 'topic', type: 'str', label: 'Topic', default: '' },
    { id: 'trim', type: 'bool', label: 'Trim', default: false },
    { id: 'usetls', type: 'bool', label: 'Use TLS', default: false },
    { id: 'tls', type: 'str', label: 'TLS Config', default: '' },
  ],
  'tcp out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'host', type: 'str', label: 'Host', default: '' },
    { id: 'port', type: 'num', label: 'Port', default: '' },
    { id: 'beserver', type: 'select', label: 'Be Server', default: 'client', required: true, options: [
      { value: 'client', label: 'Client' },
      { value: 'reply', label: 'Reply' },
    ]},
    { id: 'base64', type: 'bool', label: 'Base64', default: false, required: true },
    { id: 'end', type: 'bool', label: 'End', default: false },
    { id: 'tls', type: 'str', label: 'TLS Config', default: '' },
  ],
  'tcp request': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'server', type: 'str', label: 'Server', default: '', required: true },
    { id: 'host', type: 'str', label: 'Host', default: '' },
    { id: 'port', type: 'num', label: 'Port', default: '', required: true },
    { id: 'datatype', type: 'select', label: 'Data Type', default: 'buffer', options: [
      { value: 'buffer', label: 'Buffer' },
      { value: 'utf8', label: 'UTF-8 String' },
      { value: 'base64', label: 'Base64' },
    ]},
    { id: 'newline', type: 'str', label: 'Newline', default: '' },
    { id: 'topic', type: 'str', label: 'Topic', default: '' },
    { id: 'usetls', type: 'bool', label: 'Use TLS', default: false },
    { id: 'tls', type: 'str', label: 'TLS Config', default: '' },
  ],
  'udp in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'iface', type: 'str', label: 'Interface', default: '' },
    { id: 'port', type: 'num', label: 'Port', default: '', required: true },
    { id: 'ipv', type: 'select', label: 'IP Version', default: 'udp4', options: [
      { value: 'udp4', label: 'IPv4' },
      { value: 'udp6', label: 'IPv6' },
    ]},
    { id: 'multicast', type: 'select', label: 'Multicast', default: 'false', options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ]},
    { id: 'group', type: 'str', label: 'Group', default: '' },
    { id: 'datatype', type: 'select', label: 'Data Type', default: 'buffer', options: [
      { value: 'buffer', label: 'Buffer' },
      { value: 'utf8', label: 'UTF-8 String' },
      { value: 'base64', label: 'Base64' },
    ]},
  ],
  'udp out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'addr', type: 'str', label: 'Address', default: '' },
    { id: 'iface', type: 'str', label: 'Interface', default: '' },
    { id: 'port', type: 'str', label: 'Port', default: '' },
    { id: 'ipv', type: 'select', label: 'IP Version', default: 'udp4', options: [
      { value: 'udp4', label: 'IPv4' },
      { value: 'udp6', label: 'IPv6' },
    ]},
    { id: 'outport', type: 'str', label: 'Out Port', default: '' },
    { id: 'base64', type: 'bool', label: 'Base64', default: false, required: true },
    { id: 'multicast', type: 'select', label: 'Multicast', default: 'false', options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ]},
  ],

  // ===== NODOS DE ALMACENAMIENTO =====
  'file in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'filename', type: 'str', label: 'Filename', default: '', required: true },
    { id: 'filenameType', type: 'str', label: 'Filename Type', default: '' },
    { id: 'format', type: 'select', label: 'Output As', default: 'utf8', options: [
      { value: 'utf8', label: 'UTF-8 String' },
      { value: 'lines', label: 'Lines' },
      { value: '', label: 'Binary Buffer' },
      { value: 'stream', label: 'Stream' },
    ]},
    { id: 'allProps', type: 'bool', label: 'All Properties', default: false },
    { id: 'encoding', type: 'str', label: 'Encoding', default: '' },
  ],
  'file out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'filename', type: 'str', label: 'Filename', default: '', required: true },
    { id: 'filenameType', type: 'str', label: 'Filename Type', default: '' },
    { id: 'appendNewline', type: 'bool', label: 'Append Newline', default: true },
    { id: 'createDir', type: 'bool', label: 'Create Directory', default: false },
  ],
  'file': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'filename', type: 'str', label: 'Filename', default: '', required: true },
    { id: 'filenameType', type: 'str', label: 'Filename Type', default: '' },
    { id: 'operation', type: 'select', label: 'Operation', default: 'read', options: [
      { value: 'read', label: 'Read' },
      { value: 'write', label: 'Write' },
      { value: 'append', label: 'Append' },
      { value: 'delete', label: 'Delete' },
    ]},
  ],
  'watch': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'files', type: 'str', label: 'Files', default: '', required: true },
    { id: 'recursive', type: 'bool', label: 'Recursive', default: false },
  ],

  // ===== NODOS DE CONTROL DE FLUJO =====
  'junction': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'catch': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'scope', type: 'select', label: 'Scope', default: '0', options: [
      { value: '0', label: 'All nodes' },
      { value: '1', label: 'Nodes in same flow' },
      { value: '2', label: 'Nodes in same group' },
      { value: '3', label: 'Node' },
    ]},
    { id: 'uncaught', type: 'bool', label: 'Uncaught', default: false },
  ],
  'status': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'scope', type: 'select', label: 'Scope', default: '0', options: [
      { value: '0', label: 'All nodes' },
      { value: '1', label: 'Nodes in same flow' },
      { value: '2', label: 'Nodes in same group' },
      { value: '3', label: 'Node' },
    ]},
  ],
  'complete': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'scope', type: 'select', label: 'Scope', default: '0', options: [
      { value: '0', label: 'All nodes' },
      { value: '1', label: 'Nodes in same flow' },
      { value: '2', label: 'Nodes in same group' },
      { value: '3', label: 'Node' },
    ]},
  ],
  'link call': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'links', type: 'str', label: 'Links', default: '' },
  ],
  'link out': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'links', type: 'str', label: 'Links', default: '' },
    { id: 'mode', type: 'select', label: 'Mode', default: 'link', options: [
      { value: 'link', label: 'Link' },
      { value: 'return', label: 'Return' },
    ]},
  ],
  'link in': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'links', type: 'str', label: 'Links', default: '' },
  ],

  // ===== NODOS DE CONFIGURACIÓN =====
  'global-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'flow-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'subflow-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'group-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'mqtt-broker': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'broker', type: 'str', label: 'Broker', default: '' },
    { id: 'port', type: 'num', label: 'Port', default: 1883 },
    { id: 'clientid', type: 'str', label: 'Client ID', default: '' },
    { id: 'usetls', type: 'bool', label: 'Use TLS', default: false },
  ],
  'http-request-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'tls-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'http-proxy': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
  ],
  'mongodb-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'host', type: 'str', label: 'Host', default: 'localhost' },
    { id: 'port', type: 'num', label: 'Port', default: 27017 },
    { id: 'db', type: 'str', label: 'Database', default: '' },
  ],
  'mysql-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'host', type: 'str', label: 'Host', default: 'localhost' },
    { id: 'port', type: 'num', label: 'Port', default: 3306 },
    { id: 'database', type: 'str', label: 'Database', default: '' },
  ],
  'postgresql-config': [
    { id: 'name', type: 'str', label: 'Name', default: '' },
    { id: 'host', type: 'str', label: 'Host', default: 'localhost' },
    { id: 'port', type: 'num', label: 'Port', default: 5432 },
    { id: 'database', type: 'str', label: 'Database', default: '' },
  ],
}

/**
 * Obtiene propiedades conocidas para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo
 * @returns Array de propiedades conocidas o null si no hay mapeo
 */
export function getKnownNodeProperties(nodeType: string): PropertyDefinition[] | null {
  const normalizedType = nodeType.toLowerCase().trim()
  return knownNodeProperties[normalizedType] || null
}

/**
 * Registra propiedades conocidas para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo
 * @param properties Propiedades conocidas
 */
export function registerKnownNodeProperties(
  nodeType: string,
  properties: PropertyDefinition[]
): void {
  const normalizedType = nodeType.toLowerCase().trim()
  knownNodeProperties[normalizedType] = properties
}
