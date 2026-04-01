// packages/shared/src/types/agent.ts
import type {
  AgentStatus,
  TeamRole,
  MemberType,
  IdleBehavior,
  CapabilityKey,
} from "../constants.js";

export interface Agent {
  id: string;
  companyId: string;
  projectId: string | null;
  name: string;
  adapterId: string;
  teamRole: TeamRole;
  memberType: MemberType | null;
  status: AgentStatus;
  autonomyLevel: number;
  reportsTo: string | null;
  hiredByAgentId: string | null;
  firedByAgentId: string | null;
  firedAt: Date | null;
  fireReason: string | null;
  specialization: string[];
  performanceScore: number;
  idleBehavior: IdleBehavior;
  maxConcurrentTasks: number;
  systemPrompt: string | null;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCapability {
  id: string;
  companyId: string;
  agentId: string;
  capabilityKey: CapabilityKey;
  granted: boolean;
  grantedByAgentId: string | null;
  grantedByUserId: string | null;
  conditions: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateAgentInput {
  name: string;
  adapterId: string;
  teamRole: TeamRole;
  memberType?: MemberType;
  projectId?: string;
  systemPrompt?: string;
  config?: Record<string, unknown>;
}
