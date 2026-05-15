
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/library.js')


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

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

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




  const path = require('path')

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
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/tomaszuscinski/Projects/Lexaro/apps/pmos/src/generated/prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/Users/tomaszuscinski/Projects/Lexaro/apps/pmos/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// This is your Prisma schema file for Leaxaro PMOS\n// Using Neon Postgres (PostgreSQL)\n// https://pris.ly/d/prisma-schema\n\ngenerator client {\n  provider = \"prisma-client-js\"\n  output   = \"../src/generated/prisma\"\n}\n\ndatasource db {\n  provider  = \"postgresql\"\n  url       = env(\"DATABASE_URL\")\n  directUrl = env(\"DIRECT_URL\")\n}\n\n// ─── Enums ───────────────────────────────────────────────────────────────────\n\nenum NodeStatus {\n  backlog\n  in_progress\n  blocked\n  done\n  archived\n}\n\nenum Priority {\n  low\n  medium\n  high\n}\n\nenum CanonicalAlignment {\n  high\n  medium\n  low\n}\n\nenum WarningSeverity {\n  low\n  medium\n  high\n  critical\n}\n\nenum WarningType {\n  dashboard_gravity\n  runtime_boundary\n  business_logic_leak\n  orchestration_drift\n  overengineering\n  prompt_coupling\n  architecture_debt\n}\n\nenum NodeScope {\n  active\n  strategic_backlog\n}\n\nenum PromptStatus {\n  queued\n  running\n  completed\n  failed\n  archived\n}\n\nenum BlueprintSourceType {\n  document\n  specification\n  decision_record\n  principle_set\n}\n\nenum ChangeType {\n  created\n  updated\n  deleted\n  renamed\n  migrated\n}\n\nenum ImpactLevel {\n  low\n  medium\n  high\n  critical\n}\n\nenum TemplateType {\n  implementation\n  refactor\n  migration\n  architecture\n  debugging\n  runtime_analysis\n  performance\n  infra\n  warning_resolution\n}\n\nenum ConversationType {\n  implementation\n  architecture\n  debugging\n  philosophy\n  runtime_analysis\n  orchestration\n  ux\n  continuity\n  governance\n  infrastructure\n}\n\nenum ImportanceLevel {\n  low\n  medium\n  high\n  foundational\n}\n\n// ─── Core Models ─────────────────────────────────────────────────────────────\n\nmodel RoadmapNode {\n  id          String     @id @default(cuid())\n  parentId    String?    @map(\"parent_id\")\n  title       String\n  description String?    @db.Text\n  status      NodeStatus @default(backlog)\n  priority    Priority   @default(medium)\n  order       Int        @default(0)\n  sortKey     String     @default(\"\") @map(\"sort_key\")\n  scope       NodeScope  @default(active)\n  createdAt   DateTime   @default(now()) @map(\"created_at\")\n  updatedAt   DateTime   @updatedAt @map(\"updated_at\")\n\n  parent   RoadmapNode?  @relation(\"NodeChildren\", fields: [parentId], references: [id], onDelete: SetNull)\n  children RoadmapNode[] @relation(\"NodeChildren\")\n\n  tags             RoadmapNodeTag[]\n  logs             RoadmapNodeLog[]\n  decisions        RoadmapNodeDecision[]\n  warnings         ArchitectureWarning[]\n  principles       RoadmapNodePrinciple[]\n  promptExecutions PromptExecution[]\n  conversations    ConversationRoadmapNode[]\n\n  @@map(\"roadmap_nodes\")\n}\n\nmodel ExecutionLog {\n  id                  String             @id @default(cuid())\n  title               String\n  summary             String?            @db.Text\n  prompt              String?            @db.Text\n  changedFiles        String[]           @map(\"changed_files\")\n  architecturalImpact String?            @map(\"architectural_impact\") @db.Text\n  blockers            String?            @db.Text\n  nextSteps           String?            @map(\"next_steps\") @db.Text\n  canonicalAlignment  CanonicalAlignment @default(medium) @map(\"canonical_alignment\")\n  createdAt           DateTime           @default(now()) @map(\"created_at\")\n\n  tags               LogTag[]\n  nodes              RoadmapNodeLog[]\n  warnings           ArchitectureWarning[]\n  promptExecution    PromptExecution?\n  changedFileEntries ChangedFile[]\n  conversations      ConversationLog[]\n\n  @@map(\"execution_logs\")\n}\n\nmodel Decision {\n  id              String   @id @default(cuid())\n  number          Int      @unique @default(autoincrement())\n  title           String\n  decision        String   @db.Text\n  reason          String?  @db.Text\n  impact          String?  @db.Text\n  affectedSystems String[] @map(\"affected_systems\")\n  createdAt       DateTime @default(now()) @map(\"created_at\")\n\n  nodes         RoadmapNodeDecision[]\n  principles    DecisionPrinciple[]\n  conversations ConversationDecision[]\n\n  @@map(\"decisions\")\n}\n\nmodel Tag {\n  id   String @id @default(cuid())\n  name String @unique\n\n  roadmapNodes RoadmapNodeTag[]\n  logs         LogTag[]\n\n  @@map(\"tags\")\n}\n\n// ─── Junction Tables ──────────────────────────────────────────────────────────\n\nmodel RoadmapNodeTag {\n  nodeId String @map(\"node_id\")\n  tagId  String @map(\"tag_id\")\n\n  node RoadmapNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)\n  tag  Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)\n\n  @@id([nodeId, tagId])\n  @@map(\"roadmap_node_tags\")\n}\n\nmodel LogTag {\n  logId String @map(\"log_id\")\n  tagId String @map(\"tag_id\")\n\n  log ExecutionLog @relation(fields: [logId], references: [id], onDelete: Cascade)\n  tag Tag          @relation(fields: [tagId], references: [id], onDelete: Cascade)\n\n  @@id([logId, tagId])\n  @@map(\"log_tags\")\n}\n\nmodel RoadmapNodeLog {\n  nodeId String @map(\"node_id\")\n  logId  String @map(\"log_id\")\n\n  node RoadmapNode  @relation(fields: [nodeId], references: [id], onDelete: Cascade)\n  log  ExecutionLog @relation(fields: [logId], references: [id], onDelete: Cascade)\n\n  @@id([nodeId, logId])\n  @@map(\"roadmap_node_logs\")\n}\n\nmodel RoadmapNodeDecision {\n  nodeId     String @map(\"node_id\")\n  decisionId String @map(\"decision_id\")\n\n  node     RoadmapNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)\n  decision Decision    @relation(fields: [decisionId], references: [id], onDelete: Cascade)\n\n  @@id([nodeId, decisionId])\n  @@map(\"roadmap_node_decisions\")\n}\n\n// ─── Architecture Warnings ────────────────────────────────────────────────────\n\nmodel ArchitectureWarning {\n  id           String          @id @default(cuid())\n  title        String\n  description  String          @db.Text\n  severity     WarningSeverity @default(medium)\n  type         WarningType\n  affectedArea String?         @map(\"affected_area\")\n  resolved     Boolean         @default(false)\n  resolvedAt   DateTime?       @map(\"resolved_at\")\n\n  relatedLogId         String? @map(\"related_log_id\")\n  relatedRoadmapNodeId String? @map(\"related_roadmap_node_id\")\n  relatedPrincipleId   String? @map(\"related_principle_id\")\n\n  relatedLog         ExecutionLog?         @relation(fields: [relatedLogId], references: [id], onDelete: SetNull)\n  relatedRoadmapNode RoadmapNode?          @relation(fields: [relatedRoadmapNodeId], references: [id], onDelete: SetNull)\n  relatedPrinciple   CanonicalPrinciple?   @relation(fields: [relatedPrincipleId], references: [id], onDelete: SetNull)\n  conversations      ConversationWarning[]\n\n  createdAt DateTime @default(now()) @map(\"created_at\")\n\n  @@map(\"architecture_warnings\")\n}\n\n// ─── Canonical Principles ─────────────────────────────────────────────────────\n\nmodel CanonicalPrinciple {\n  id          String   @id @default(cuid())\n  title       String\n  description String   @db.Text\n  reason      String?  @db.Text\n  priority    Priority @default(medium)\n  createdAt   DateTime @default(now()) @map(\"created_at\")\n\n  nodes         RoadmapNodePrinciple[]\n  decisions     DecisionPrinciple[]\n  warnings      ArchitectureWarning[]\n  conversations ConversationPrinciple[]\n\n  @@map(\"canonical_principles\")\n}\n\nmodel RoadmapNodePrinciple {\n  nodeId      String @map(\"node_id\")\n  principleId String @map(\"principle_id\")\n\n  node      RoadmapNode        @relation(fields: [nodeId], references: [id], onDelete: Cascade)\n  principle CanonicalPrinciple @relation(fields: [principleId], references: [id], onDelete: Cascade)\n\n  @@id([nodeId, principleId])\n  @@map(\"roadmap_node_principles\")\n}\n\nmodel DecisionPrinciple {\n  decisionId  String @map(\"decision_id\")\n  principleId String @map(\"principle_id\")\n\n  decision  Decision           @relation(fields: [decisionId], references: [id], onDelete: Cascade)\n  principle CanonicalPrinciple @relation(fields: [principleId], references: [id], onDelete: Cascade)\n\n  @@id([decisionId, principleId])\n  @@map(\"decision_principles\")\n}\n\n// ─── Prompt Execution ─────────────────────────────────────────────────────────\n\nmodel PromptExecution {\n  id                  String       @id @default(cuid())\n  title               String\n  etap                String?\n  subetap             String?\n  node                String?\n  domain              String?\n  promptType          String?      @map(\"prompt_type\")\n  promptContent       String       @map(\"prompt_content\") @db.Text\n  executionSummary    String?      @map(\"execution_summary\") @db.Text\n  architecturalImpact String?      @map(\"architectural_impact\") @db.Text\n  changedFiles        String[]     @map(\"changed_files\")\n  blockers            String?      @db.Text\n  nextSteps           String?      @map(\"next_steps\") @db.Text\n  status              PromptStatus @default(queued)\n  roadmapNodeId       String?      @map(\"roadmap_node_id\")\n  executionLogId      String?      @unique @map(\"execution_log_id\")\n  createdAt           DateTime     @default(now()) @map(\"created_at\")\n  updatedAt           DateTime     @updatedAt @map(\"updated_at\")\n\n  roadmapNode        RoadmapNode?         @relation(fields: [roadmapNodeId], references: [id], onDelete: SetNull)\n  executionLog       ExecutionLog?        @relation(fields: [executionLogId], references: [id], onDelete: SetNull)\n  changedFileEntries ChangedFile[]\n  conversations      ConversationPrompt[]\n\n  @@map(\"prompt_executions\")\n}\n\n// ─── Blueprint Sources ────────────────────────────────────────────────────────\n\nmodel BlueprintSource {\n  id          String              @id @default(cuid())\n  title       String\n  description String?             @db.Text\n  sourceType  BlueprintSourceType @map(\"source_type\")\n  version     String              @default(\"v1\")\n  createdAt   DateTime            @default(now()) @map(\"created_at\")\n\n  @@map(\"blueprint_sources\")\n}\n\n// ─── Changed Files ────────────────────────────────────────────────────────────\n\nmodel ChangedFile {\n  id                String      @id @default(cuid())\n  path              String\n  changeType        ChangeType  @default(updated) @map(\"change_type\")\n  impactLevel       ImpactLevel @default(medium) @map(\"impact_level\")\n  notes             String?     @db.Text\n  executionLogId    String?     @map(\"execution_log_id\")\n  promptExecutionId String?     @map(\"prompt_execution_id\")\n  createdAt         DateTime    @default(now()) @map(\"created_at\")\n\n  executionLog    ExecutionLog?    @relation(fields: [executionLogId], references: [id], onDelete: Cascade)\n  promptExecution PromptExecution? @relation(fields: [promptExecutionId], references: [id], onDelete: Cascade)\n\n  @@index([path])\n  @@index([impactLevel])\n  @@index([changeType])\n  @@map(\"changed_files\")\n}\n\n// ─── Prompt Templates ─────────────────────────────────────────────────────────\n\nmodel PromptTemplate {\n  id              String       @id @default(cuid())\n  name            String\n  description     String?      @db.Text\n  templateType    TemplateType @map(\"template_type\")\n  templateContent String       @map(\"template_content\") @db.Text\n  createdAt       DateTime     @default(now()) @map(\"created_at\")\n\n  @@map(\"prompt_templates\")\n}\n\n// ─── Conversation Artifacts ───────────────────────────────────────────────────\n\nmodel ConversationArtifact {\n  id               String           @id @default(cuid())\n  conversationId   String           @unique @map(\"conversation_id\")\n  timestamp        DateTime\n  project          String           @default(\"leaxaro\")\n  taskId           String?          @map(\"task_id\")\n  etap             String?\n  subetap          String?\n  domains          String[]\n  conversationType ConversationType @map(\"conversation_type\")\n  importanceLevel  ImportanceLevel  @map(\"importance_level\")\n  userPrompt       String           @map(\"user_prompt\") @db.Text\n  llmResponse      String           @map(\"llm_response\") @db.Text\n  summary          String           @db.Text\n  tags             String[]\n  chronologyOrder  Int              @default(0) @map(\"chronology_order\")\n  filesPath        String?          @map(\"files_path\")\n  createdAt        DateTime         @default(now()) @map(\"created_at\")\n\n  linkedDecisions  ConversationDecision[]\n  linkedWarnings   ConversationWarning[]\n  linkedNodes      ConversationRoadmapNode[]\n  linkedLogs       ConversationLog[]\n  linkedPrinciples ConversationPrinciple[]\n  linkedPrompts    ConversationPrompt[]\n\n  @@index([timestamp])\n  @@index([etap])\n  @@index([importanceLevel])\n  @@index([conversationType])\n  @@map(\"conversation_artifacts\")\n}\n\nmodel ConversationDecision {\n  conversationId String @map(\"conversation_id\")\n  decisionId     String @map(\"decision_id\")\n\n  conversation ConversationArtifact @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  decision     Decision             @relation(fields: [decisionId], references: [id], onDelete: Cascade)\n\n  @@id([conversationId, decisionId])\n  @@map(\"conversation_decisions\")\n}\n\nmodel ConversationWarning {\n  conversationId String @map(\"conversation_id\")\n  warningId      String @map(\"warning_id\")\n\n  conversation ConversationArtifact @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  warning      ArchitectureWarning  @relation(fields: [warningId], references: [id], onDelete: Cascade)\n\n  @@id([conversationId, warningId])\n  @@map(\"conversation_warnings\")\n}\n\nmodel ConversationRoadmapNode {\n  conversationId String @map(\"conversation_id\")\n  nodeId         String @map(\"node_id\")\n\n  conversation ConversationArtifact @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  node         RoadmapNode          @relation(fields: [nodeId], references: [id], onDelete: Cascade)\n\n  @@id([conversationId, nodeId])\n  @@map(\"conversation_roadmap_nodes\")\n}\n\nmodel ConversationLog {\n  conversationId String @map(\"conversation_id\")\n  logId          String @map(\"log_id\")\n\n  conversation ConversationArtifact @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  log          ExecutionLog         @relation(fields: [logId], references: [id], onDelete: Cascade)\n\n  @@id([conversationId, logId])\n  @@map(\"conversation_logs\")\n}\n\nmodel ConversationPrinciple {\n  conversationId String @map(\"conversation_id\")\n  principleId    String @map(\"principle_id\")\n\n  conversation ConversationArtifact @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  principle    CanonicalPrinciple   @relation(fields: [principleId], references: [id], onDelete: Cascade)\n\n  @@id([conversationId, principleId])\n  @@map(\"conversation_principles\")\n}\n\nmodel ConversationPrompt {\n  conversationId    String @map(\"conversation_id\")\n  promptExecutionId String @map(\"prompt_execution_id\")\n\n  conversation    ConversationArtifact @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  promptExecution PromptExecution      @relation(fields: [promptExecutionId], references: [id], onDelete: Cascade)\n\n  @@id([conversationId, promptExecutionId])\n  @@map(\"conversation_prompts\")\n}\n",
  "inlineSchemaHash": "6b0f909611993a63a3625cb4ad59b50b5ae46437b964a4e9630cad52e2925348",
  "copyEngine": true
}

const fs = require('fs')

config.dirname = __dirname
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = [
    "src/generated/prisma",
    "generated/prisma",
  ]
  
  const alternativePath = alternativePaths.find((altPath) => {
    return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))
  }) ?? alternativePaths[0]

  config.dirname = path.join(process.cwd(), alternativePath)
  config.isBundled = true
}

config.runtimeDataModel = JSON.parse("{\"models\":{\"RoadmapNode\":{\"dbName\":\"roadmap_nodes\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parentId\",\"dbName\":\"parent_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"NodeStatus\",\"default\":\"backlog\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Priority\",\"default\":\"medium\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"order\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sortKey\",\"dbName\":\"sort_key\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scope\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"NodeScope\",\"default\":\"active\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"parent\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"NodeChildren\",\"relationFromFields\":[\"parentId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"SetNull\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"children\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"NodeChildren\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tags\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodeTag\",\"relationName\":\"RoadmapNodeToRoadmapNodeTag\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"logs\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodeLog\",\"relationName\":\"RoadmapNodeToRoadmapNodeLog\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decisions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodeDecision\",\"relationName\":\"RoadmapNodeToRoadmapNodeDecision\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warnings\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ArchitectureWarning\",\"relationName\":\"ArchitectureWarningToRoadmapNode\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principles\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodePrinciple\",\"relationName\":\"RoadmapNodeToRoadmapNodePrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptExecutions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PromptExecution\",\"relationName\":\"PromptExecutionToRoadmapNode\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationRoadmapNode\",\"relationName\":\"ConversationRoadmapNodeToRoadmapNode\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ExecutionLog\":{\"dbName\":\"execution_logs\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"summary\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"prompt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"changedFiles\",\"dbName\":\"changed_files\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"architecturalImpact\",\"dbName\":\"architectural_impact\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"blockers\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nextSteps\",\"dbName\":\"next_steps\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"canonicalAlignment\",\"dbName\":\"canonical_alignment\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"CanonicalAlignment\",\"default\":\"medium\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tags\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"LogTag\",\"relationName\":\"ExecutionLogToLogTag\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodeLog\",\"relationName\":\"ExecutionLogToRoadmapNodeLog\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warnings\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ArchitectureWarning\",\"relationName\":\"ArchitectureWarningToExecutionLog\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptExecution\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PromptExecution\",\"relationName\":\"ExecutionLogToPromptExecution\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"changedFileEntries\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ChangedFile\",\"relationName\":\"ChangedFileToExecutionLog\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationLog\",\"relationName\":\"ConversationLogToExecutionLog\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Decision\":{\"dbName\":\"decisions\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"number\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decision\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"impact\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"affectedSystems\",\"dbName\":\"affected_systems\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodeDecision\",\"relationName\":\"DecisionToRoadmapNodeDecision\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principles\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DecisionPrinciple\",\"relationName\":\"DecisionToDecisionPrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationDecision\",\"relationName\":\"ConversationDecisionToDecision\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Tag\":{\"dbName\":\"tags\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"roadmapNodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodeTag\",\"relationName\":\"RoadmapNodeTagToTag\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"logs\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"LogTag\",\"relationName\":\"LogTagToTag\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"RoadmapNodeTag\":{\"dbName\":\"roadmap_node_tags\",\"fields\":[{\"name\":\"nodeId\",\"dbName\":\"node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagId\",\"dbName\":\"tag_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"node\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"RoadmapNodeToRoadmapNodeTag\",\"relationFromFields\":[\"nodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tag\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tag\",\"relationName\":\"RoadmapNodeTagToTag\",\"relationFromFields\":[\"tagId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"nodeId\",\"tagId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"LogTag\":{\"dbName\":\"log_tags\",\"fields\":[{\"name\":\"logId\",\"dbName\":\"log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagId\",\"dbName\":\"tag_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"log\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ExecutionLog\",\"relationName\":\"ExecutionLogToLogTag\",\"relationFromFields\":[\"logId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tag\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tag\",\"relationName\":\"LogTagToTag\",\"relationFromFields\":[\"tagId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"logId\",\"tagId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"RoadmapNodeLog\":{\"dbName\":\"roadmap_node_logs\",\"fields\":[{\"name\":\"nodeId\",\"dbName\":\"node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"logId\",\"dbName\":\"log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"node\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"RoadmapNodeToRoadmapNodeLog\",\"relationFromFields\":[\"nodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"log\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ExecutionLog\",\"relationName\":\"ExecutionLogToRoadmapNodeLog\",\"relationFromFields\":[\"logId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"nodeId\",\"logId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"RoadmapNodeDecision\":{\"dbName\":\"roadmap_node_decisions\",\"fields\":[{\"name\":\"nodeId\",\"dbName\":\"node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decisionId\",\"dbName\":\"decision_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"node\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"RoadmapNodeToRoadmapNodeDecision\",\"relationFromFields\":[\"nodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decision\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decision\",\"relationName\":\"DecisionToRoadmapNodeDecision\",\"relationFromFields\":[\"decisionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"nodeId\",\"decisionId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ArchitectureWarning\":{\"dbName\":\"architecture_warnings\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"severity\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"WarningSeverity\",\"default\":\"medium\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"WarningType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"affectedArea\",\"dbName\":\"affected_area\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resolved\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resolvedAt\",\"dbName\":\"resolved_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"relatedLogId\",\"dbName\":\"related_log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"relatedRoadmapNodeId\",\"dbName\":\"related_roadmap_node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"relatedPrincipleId\",\"dbName\":\"related_principle_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"relatedLog\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ExecutionLog\",\"relationName\":\"ArchitectureWarningToExecutionLog\",\"relationFromFields\":[\"relatedLogId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"SetNull\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"relatedRoadmapNode\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"ArchitectureWarningToRoadmapNode\",\"relationFromFields\":[\"relatedRoadmapNodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"SetNull\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"relatedPrinciple\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CanonicalPrinciple\",\"relationName\":\"ArchitectureWarningToCanonicalPrinciple\",\"relationFromFields\":[\"relatedPrincipleId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"SetNull\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationWarning\",\"relationName\":\"ArchitectureWarningToConversationWarning\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"CanonicalPrinciple\":{\"dbName\":\"canonical_principles\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Priority\",\"default\":\"medium\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNodePrinciple\",\"relationName\":\"CanonicalPrincipleToRoadmapNodePrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decisions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DecisionPrinciple\",\"relationName\":\"CanonicalPrincipleToDecisionPrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warnings\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ArchitectureWarning\",\"relationName\":\"ArchitectureWarningToCanonicalPrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationPrinciple\",\"relationName\":\"CanonicalPrincipleToConversationPrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"RoadmapNodePrinciple\":{\"dbName\":\"roadmap_node_principles\",\"fields\":[{\"name\":\"nodeId\",\"dbName\":\"node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principleId\",\"dbName\":\"principle_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"node\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"RoadmapNodeToRoadmapNodePrinciple\",\"relationFromFields\":[\"nodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principle\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CanonicalPrinciple\",\"relationName\":\"CanonicalPrincipleToRoadmapNodePrinciple\",\"relationFromFields\":[\"principleId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"nodeId\",\"principleId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DecisionPrinciple\":{\"dbName\":\"decision_principles\",\"fields\":[{\"name\":\"decisionId\",\"dbName\":\"decision_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principleId\",\"dbName\":\"principle_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decision\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decision\",\"relationName\":\"DecisionToDecisionPrinciple\",\"relationFromFields\":[\"decisionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principle\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CanonicalPrinciple\",\"relationName\":\"CanonicalPrincipleToDecisionPrinciple\",\"relationFromFields\":[\"principleId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"decisionId\",\"principleId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"PromptExecution\":{\"dbName\":\"prompt_executions\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"etap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"subetap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"node\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"domain\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptType\",\"dbName\":\"prompt_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptContent\",\"dbName\":\"prompt_content\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"executionSummary\",\"dbName\":\"execution_summary\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"architecturalImpact\",\"dbName\":\"architectural_impact\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"changedFiles\",\"dbName\":\"changed_files\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"blockers\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nextSteps\",\"dbName\":\"next_steps\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"PromptStatus\",\"default\":\"queued\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"roadmapNodeId\",\"dbName\":\"roadmap_node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"executionLogId\",\"dbName\":\"execution_log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":true,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"roadmapNode\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"PromptExecutionToRoadmapNode\",\"relationFromFields\":[\"roadmapNodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"SetNull\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"executionLog\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ExecutionLog\",\"relationName\":\"ExecutionLogToPromptExecution\",\"relationFromFields\":[\"executionLogId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"SetNull\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"changedFileEntries\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ChangedFile\",\"relationName\":\"ChangedFileToPromptExecution\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationPrompt\",\"relationName\":\"ConversationPromptToPromptExecution\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"BlueprintSource\":{\"dbName\":\"blueprint_sources\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sourceType\",\"dbName\":\"source_type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BlueprintSourceType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"version\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"v1\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ChangedFile\":{\"dbName\":\"changed_files\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"path\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"changeType\",\"dbName\":\"change_type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"ChangeType\",\"default\":\"updated\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"impactLevel\",\"dbName\":\"impact_level\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"ImpactLevel\",\"default\":\"medium\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"notes\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"executionLogId\",\"dbName\":\"execution_log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptExecutionId\",\"dbName\":\"prompt_execution_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"executionLog\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ExecutionLog\",\"relationName\":\"ChangedFileToExecutionLog\",\"relationFromFields\":[\"executionLogId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptExecution\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PromptExecution\",\"relationName\":\"ChangedFileToPromptExecution\",\"relationFromFields\":[\"promptExecutionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"PromptTemplate\":{\"dbName\":\"prompt_templates\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"templateType\",\"dbName\":\"template_type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TemplateType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"templateContent\",\"dbName\":\"template_content\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationArtifact\":{\"dbName\":\"conversation_artifacts\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"timestamp\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"project\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"leaxaro\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"taskId\",\"dbName\":\"task_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"etap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"subetap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"domains\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversationType\",\"dbName\":\"conversation_type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"importanceLevel\",\"dbName\":\"importance_level\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ImportanceLevel\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userPrompt\",\"dbName\":\"user_prompt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"llmResponse\",\"dbName\":\"llm_response\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"summary\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tags\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"chronologyOrder\",\"dbName\":\"chronology_order\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"filesPath\",\"dbName\":\"files_path\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"linkedDecisions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationDecision\",\"relationName\":\"ConversationArtifactToConversationDecision\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"linkedWarnings\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationWarning\",\"relationName\":\"ConversationArtifactToConversationWarning\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"linkedNodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationRoadmapNode\",\"relationName\":\"ConversationArtifactToConversationRoadmapNode\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"linkedLogs\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationLog\",\"relationName\":\"ConversationArtifactToConversationLog\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"linkedPrinciples\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationPrinciple\",\"relationName\":\"ConversationArtifactToConversationPrinciple\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"linkedPrompts\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationPrompt\",\"relationName\":\"ConversationArtifactToConversationPrompt\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationDecision\":{\"dbName\":\"conversation_decisions\",\"fields\":[{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decisionId\",\"dbName\":\"decision_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversation\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationArtifact\",\"relationName\":\"ConversationArtifactToConversationDecision\",\"relationFromFields\":[\"conversationId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"decision\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decision\",\"relationName\":\"ConversationDecisionToDecision\",\"relationFromFields\":[\"decisionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"conversationId\",\"decisionId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationWarning\":{\"dbName\":\"conversation_warnings\",\"fields\":[{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warningId\",\"dbName\":\"warning_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversation\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationArtifact\",\"relationName\":\"ConversationArtifactToConversationWarning\",\"relationFromFields\":[\"conversationId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"warning\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ArchitectureWarning\",\"relationName\":\"ArchitectureWarningToConversationWarning\",\"relationFromFields\":[\"warningId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"conversationId\",\"warningId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationRoadmapNode\":{\"dbName\":\"conversation_roadmap_nodes\",\"fields\":[{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nodeId\",\"dbName\":\"node_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversation\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationArtifact\",\"relationName\":\"ConversationArtifactToConversationRoadmapNode\",\"relationFromFields\":[\"conversationId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"node\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RoadmapNode\",\"relationName\":\"ConversationRoadmapNodeToRoadmapNode\",\"relationFromFields\":[\"nodeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"conversationId\",\"nodeId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationLog\":{\"dbName\":\"conversation_logs\",\"fields\":[{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"logId\",\"dbName\":\"log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversation\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationArtifact\",\"relationName\":\"ConversationArtifactToConversationLog\",\"relationFromFields\":[\"conversationId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"log\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ExecutionLog\",\"relationName\":\"ConversationLogToExecutionLog\",\"relationFromFields\":[\"logId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"conversationId\",\"logId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationPrinciple\":{\"dbName\":\"conversation_principles\",\"fields\":[{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principleId\",\"dbName\":\"principle_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversation\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationArtifact\",\"relationName\":\"ConversationArtifactToConversationPrinciple\",\"relationFromFields\":[\"conversationId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"principle\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CanonicalPrinciple\",\"relationName\":\"CanonicalPrincipleToConversationPrinciple\",\"relationFromFields\":[\"principleId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"conversationId\",\"principleId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConversationPrompt\":{\"dbName\":\"conversation_prompts\",\"fields\":[{\"name\":\"conversationId\",\"dbName\":\"conversation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptExecutionId\",\"dbName\":\"prompt_execution_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"conversation\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConversationArtifact\",\"relationName\":\"ConversationArtifactToConversationPrompt\",\"relationFromFields\":[\"conversationId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"promptExecution\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PromptExecution\",\"relationName\":\"ConversationPromptToPromptExecution\",\"relationFromFields\":[\"promptExecutionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"conversationId\",\"promptExecutionId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"NodeStatus\":{\"values\":[{\"name\":\"backlog\",\"dbName\":null},{\"name\":\"in_progress\",\"dbName\":null},{\"name\":\"blocked\",\"dbName\":null},{\"name\":\"done\",\"dbName\":null},{\"name\":\"archived\",\"dbName\":null}],\"dbName\":null},\"Priority\":{\"values\":[{\"name\":\"low\",\"dbName\":null},{\"name\":\"medium\",\"dbName\":null},{\"name\":\"high\",\"dbName\":null}],\"dbName\":null},\"CanonicalAlignment\":{\"values\":[{\"name\":\"high\",\"dbName\":null},{\"name\":\"medium\",\"dbName\":null},{\"name\":\"low\",\"dbName\":null}],\"dbName\":null},\"WarningSeverity\":{\"values\":[{\"name\":\"low\",\"dbName\":null},{\"name\":\"medium\",\"dbName\":null},{\"name\":\"high\",\"dbName\":null},{\"name\":\"critical\",\"dbName\":null}],\"dbName\":null},\"WarningType\":{\"values\":[{\"name\":\"dashboard_gravity\",\"dbName\":null},{\"name\":\"runtime_boundary\",\"dbName\":null},{\"name\":\"business_logic_leak\",\"dbName\":null},{\"name\":\"orchestration_drift\",\"dbName\":null},{\"name\":\"overengineering\",\"dbName\":null},{\"name\":\"prompt_coupling\",\"dbName\":null},{\"name\":\"architecture_debt\",\"dbName\":null}],\"dbName\":null},\"NodeScope\":{\"values\":[{\"name\":\"active\",\"dbName\":null},{\"name\":\"strategic_backlog\",\"dbName\":null}],\"dbName\":null},\"PromptStatus\":{\"values\":[{\"name\":\"queued\",\"dbName\":null},{\"name\":\"running\",\"dbName\":null},{\"name\":\"completed\",\"dbName\":null},{\"name\":\"failed\",\"dbName\":null},{\"name\":\"archived\",\"dbName\":null}],\"dbName\":null},\"BlueprintSourceType\":{\"values\":[{\"name\":\"document\",\"dbName\":null},{\"name\":\"specification\",\"dbName\":null},{\"name\":\"decision_record\",\"dbName\":null},{\"name\":\"principle_set\",\"dbName\":null}],\"dbName\":null},\"ChangeType\":{\"values\":[{\"name\":\"created\",\"dbName\":null},{\"name\":\"updated\",\"dbName\":null},{\"name\":\"deleted\",\"dbName\":null},{\"name\":\"renamed\",\"dbName\":null},{\"name\":\"migrated\",\"dbName\":null}],\"dbName\":null},\"ImpactLevel\":{\"values\":[{\"name\":\"low\",\"dbName\":null},{\"name\":\"medium\",\"dbName\":null},{\"name\":\"high\",\"dbName\":null},{\"name\":\"critical\",\"dbName\":null}],\"dbName\":null},\"TemplateType\":{\"values\":[{\"name\":\"implementation\",\"dbName\":null},{\"name\":\"refactor\",\"dbName\":null},{\"name\":\"migration\",\"dbName\":null},{\"name\":\"architecture\",\"dbName\":null},{\"name\":\"debugging\",\"dbName\":null},{\"name\":\"runtime_analysis\",\"dbName\":null},{\"name\":\"performance\",\"dbName\":null},{\"name\":\"infra\",\"dbName\":null},{\"name\":\"warning_resolution\",\"dbName\":null}],\"dbName\":null},\"ConversationType\":{\"values\":[{\"name\":\"implementation\",\"dbName\":null},{\"name\":\"architecture\",\"dbName\":null},{\"name\":\"debugging\",\"dbName\":null},{\"name\":\"philosophy\",\"dbName\":null},{\"name\":\"runtime_analysis\",\"dbName\":null},{\"name\":\"orchestration\",\"dbName\":null},{\"name\":\"ux\",\"dbName\":null},{\"name\":\"continuity\",\"dbName\":null},{\"name\":\"governance\",\"dbName\":null},{\"name\":\"infrastructure\",\"dbName\":null}],\"dbName\":null},\"ImportanceLevel\":{\"values\":[{\"name\":\"low\",\"dbName\":null},{\"name\":\"medium\",\"dbName\":null},{\"name\":\"high\",\"dbName\":null},{\"name\":\"foundational\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined


const { warnEnvConflicts } = require('./runtime/library.js')

warnEnvConflicts({
    rootEnvPath: config.relativeEnvPaths.rootEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
    schemaEnvPath: config.relativeEnvPaths.schemaEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath)
})

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-darwin-arm64.dylib.node");
path.join(process.cwd(), "src/generated/prisma/libquery_engine-darwin-arm64.dylib.node")
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "src/generated/prisma/schema.prisma")
