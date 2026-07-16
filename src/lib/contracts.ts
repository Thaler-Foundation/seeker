// Response types for the BFF endpoints this app consumes.

export type AnalyticsMode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type AnalyticsKpis = {
  totalTvlUsd: number;
  activeVaultCount: number;
  yield30dUsd: number;
  projectedApyBps: number;
  apy30dMedianBps?: number;
};

export type StrategyBreakdownRow = {
  mode: AnalyticsMode;
  vaultCount: number;
  tvlUsd: number;
  tvlSol?: number;
  projectedApyBps: number;
  apy30dMedianBps?: number | null;
  pendingUsdcUsd?: number | null;
  yield30dUsd: number;
  lifetimeYieldSol?: number;
  utilization: number;
};

export type Tier =
  | 'safe'
  | 'conservative'
  | 'balanced'
  | 'optimistic'
  | 'aggressive'
  | 'yolo';

export type VaultExecutionState =
  | 'PENDING'
  | 'RUNNING'
  | 'DISMANTLING'
  | 'DISMANTLED'
  | 'DONE'
  | 'FAILED';

export type ChildExecutionRef = {
  id: string;
  state: string;
  amountLamports?: string | null;
};

export type VaultMetrics = {
  apyBps: number;
  apy30dBps?: number | null;
  healthFactor: number;
  claimableLamports: string;
  pnlBps: number;
  claimableSol?: number | null;
  pendingRecycleUsd?: number | null;
};

export type VaultSummary = {
  id: string;
  state: VaultExecutionState;
  equityLamports: string;
  ltvBps: number;
  tier: Tier | null;
  createdAt: number;
  updatedAt: number;
  latestClaim: ChildExecutionRef | null;
  latestClose: ChildExecutionRef | null;
  latestDismantle: ChildExecutionRef | null;
  metrics: VaultMetrics | null;
};

export type ListVaultsResponse = { vaults: VaultSummary[] };

export type VaultPositions = {
  equityNavLamports: string | null;
  apyBps: number;
  daysHeld: number;
};

export type UserVaultStatRow = {
  vaultExecutionId: string;
  tier: string;
  equityNavLamports: string;
  realizedYieldLamports: string;
  netCarryApyBps: number | null;
  pendingRecycleUsd: number | null;
  claimableSol: number;
  claimableNetSol?: number;
  daysHeld: number;
  cached: boolean;
};

export type UserVaultStatsView = {
  vaults: UserVaultStatRow[];
  claimableNetTotalSol?: number;
  asOf: number;
};
