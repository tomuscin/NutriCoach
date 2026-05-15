
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.RoadmapNodeScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  order: 'order',
  sortKey: 'sortKey',
  scope: 'scope',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExecutionLogScalarFieldEnum = {
  id: 'id',
  title: 'title',
  summary: 'summary',
  prompt: 'prompt',
  changedFiles: 'changedFiles',
  architecturalImpact: 'architecturalImpact',
  blockers: 'blockers',
  nextSteps: 'nextSteps',
  canonicalAlignment: 'canonicalAlignment',
  createdAt: 'createdAt'
};

exports.Prisma.DecisionScalarFieldEnum = {
  id: 'id',
  number: 'number',
  title: 'title',
  decision: 'decision',
  reason: 'reason',
  impact: 'impact',
  affectedSystems: 'affectedSystems',
  createdAt: 'createdAt'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.RoadmapNodeTagScalarFieldEnum = {
  nodeId: 'nodeId',
  tagId: 'tagId'
};

exports.Prisma.LogTagScalarFieldEnum = {
  logId: 'logId',
  tagId: 'tagId'
};

exports.Prisma.RoadmapNodeLogScalarFieldEnum = {
  nodeId: 'nodeId',
  logId: 'logId'
};

exports.Prisma.RoadmapNodeDecisionScalarFieldEnum = {
  nodeId: 'nodeId',
  decisionId: 'decisionId'
};

exports.Prisma.ArchitectureWarningScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  severity: 'severity',
  type: 'type',
  affectedArea: 'affectedArea',
  resolved: 'resolved',
  resolvedAt: 'resolvedAt',
  relatedLogId: 'relatedLogId',
  relatedRoadmapNodeId: 'relatedRoadmapNodeId',
  relatedPrincipleId: 'relatedPrincipleId',
  createdAt: 'createdAt'
};

exports.Prisma.CanonicalPrincipleScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  reason: 'reason',
  priority: 'priority',
  createdAt: 'createdAt'
};

exports.Prisma.RoadmapNodePrincipleScalarFieldEnum = {
  nodeId: 'nodeId',
  principleId: 'principleId'
};

exports.Prisma.DecisionPrincipleScalarFieldEnum = {
  decisionId: 'decisionId',
  principleId: 'principleId'
};

exports.Prisma.PromptExecutionScalarFieldEnum = {
  id: 'id',
  title: 'title',
  etap: 'etap',
  subetap: 'subetap',
  node: 'node',
  domain: 'domain',
  promptType: 'promptType',
  promptContent: 'promptContent',
  executionSummary: 'executionSummary',
  architecturalImpact: 'architecturalImpact',
  changedFiles: 'changedFiles',
  blockers: 'blockers',
  nextSteps: 'nextSteps',
  status: 'status',
  roadmapNodeId: 'roadmapNodeId',
  executionLogId: 'executionLogId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BlueprintSourceScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  sourceType: 'sourceType',
  version: 'version',
  createdAt: 'createdAt'
};

exports.Prisma.ChangedFileScalarFieldEnum = {
  id: 'id',
  path: 'path',
  changeType: 'changeType',
  impactLevel: 'impactLevel',
  notes: 'notes',
  executionLogId: 'executionLogId',
  promptExecutionId: 'promptExecutionId',
  createdAt: 'createdAt'
};

exports.Prisma.PromptTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  templateType: 'templateType',
  templateContent: 'templateContent',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationArtifactScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  timestamp: 'timestamp',
  project: 'project',
  taskId: 'taskId',
  etap: 'etap',
  subetap: 'subetap',
  domains: 'domains',
  conversationType: 'conversationType',
  importanceLevel: 'importanceLevel',
  userPrompt: 'userPrompt',
  llmResponse: 'llmResponse',
  summary: 'summary',
  tags: 'tags',
  chronologyOrder: 'chronologyOrder',
  filesPath: 'filesPath',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationDecisionScalarFieldEnum = {
  conversationId: 'conversationId',
  decisionId: 'decisionId'
};

exports.Prisma.ConversationWarningScalarFieldEnum = {
  conversationId: 'conversationId',
  warningId: 'warningId'
};

exports.Prisma.ConversationRoadmapNodeScalarFieldEnum = {
  conversationId: 'conversationId',
  nodeId: 'nodeId'
};

exports.Prisma.ConversationLogScalarFieldEnum = {
  conversationId: 'conversationId',
  logId: 'logId'
};

exports.Prisma.ConversationPrincipleScalarFieldEnum = {
  conversationId: 'conversationId',
  principleId: 'principleId'
};

exports.Prisma.ConversationPromptScalarFieldEnum = {
  conversationId: 'conversationId',
  promptExecutionId: 'promptExecutionId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.NodeStatus = exports.$Enums.NodeStatus = {
  backlog: 'backlog',
  in_progress: 'in_progress',
  blocked: 'blocked',
  done: 'done',
  archived: 'archived'
};

exports.Priority = exports.$Enums.Priority = {
  low: 'low',
  medium: 'medium',
  high: 'high'
};

exports.NodeScope = exports.$Enums.NodeScope = {
  active: 'active',
  strategic_backlog: 'strategic_backlog'
};

exports.CanonicalAlignment = exports.$Enums.CanonicalAlignment = {
  high: 'high',
  medium: 'medium',
  low: 'low'
};

exports.WarningSeverity = exports.$Enums.WarningSeverity = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical'
};

exports.WarningType = exports.$Enums.WarningType = {
  dashboard_gravity: 'dashboard_gravity',
  runtime_boundary: 'runtime_boundary',
  business_logic_leak: 'business_logic_leak',
  orchestration_drift: 'orchestration_drift',
  overengineering: 'overengineering',
  prompt_coupling: 'prompt_coupling',
  architecture_debt: 'architecture_debt'
};

exports.PromptStatus = exports.$Enums.PromptStatus = {
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  archived: 'archived'
};

exports.BlueprintSourceType = exports.$Enums.BlueprintSourceType = {
  document: 'document',
  specification: 'specification',
  decision_record: 'decision_record',
  principle_set: 'principle_set'
};

exports.ChangeType = exports.$Enums.ChangeType = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  renamed: 'renamed',
  migrated: 'migrated'
};

exports.ImpactLevel = exports.$Enums.ImpactLevel = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical'
};

exports.TemplateType = exports.$Enums.TemplateType = {
  implementation: 'implementation',
  refactor: 'refactor',
  migration: 'migration',
  architecture: 'architecture',
  debugging: 'debugging',
  runtime_analysis: 'runtime_analysis',
  performance: 'performance',
  infra: 'infra',
  warning_resolution: 'warning_resolution'
};

exports.ConversationType = exports.$Enums.ConversationType = {
  implementation: 'implementation',
  architecture: 'architecture',
  debugging: 'debugging',
  philosophy: 'philosophy',
  runtime_analysis: 'runtime_analysis',
  orchestration: 'orchestration',
  ux: 'ux',
  continuity: 'continuity',
  governance: 'governance',
  infrastructure: 'infrastructure'
};

exports.ImportanceLevel = exports.$Enums.ImportanceLevel = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  foundational: 'foundational'
};

exports.Prisma.ModelName = {
  RoadmapNode: 'RoadmapNode',
  ExecutionLog: 'ExecutionLog',
  Decision: 'Decision',
  Tag: 'Tag',
  RoadmapNodeTag: 'RoadmapNodeTag',
  LogTag: 'LogTag',
  RoadmapNodeLog: 'RoadmapNodeLog',
  RoadmapNodeDecision: 'RoadmapNodeDecision',
  ArchitectureWarning: 'ArchitectureWarning',
  CanonicalPrinciple: 'CanonicalPrinciple',
  RoadmapNodePrinciple: 'RoadmapNodePrinciple',
  DecisionPrinciple: 'DecisionPrinciple',
  PromptExecution: 'PromptExecution',
  BlueprintSource: 'BlueprintSource',
  ChangedFile: 'ChangedFile',
  PromptTemplate: 'PromptTemplate',
  ConversationArtifact: 'ConversationArtifact',
  ConversationDecision: 'ConversationDecision',
  ConversationWarning: 'ConversationWarning',
  ConversationRoadmapNode: 'ConversationRoadmapNode',
  ConversationLog: 'ConversationLog',
  ConversationPrinciple: 'ConversationPrinciple',
  ConversationPrompt: 'ConversationPrompt'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
