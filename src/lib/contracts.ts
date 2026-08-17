// Response types for the BFF endpoints this app consumes.

export type AnalyticsMode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type AnalyticsKpis = {
  totalTvlUsd: number;
  activeVaultCount: number;
  yield30dUsd: number;
  projectedApyBps: number;
  weightedAvgApyBps: number;
  // protocol roi since open, realized yield over deposit, percent
  roiPct?: number;
  apy30dMedianBps?: number;
  tvl30dGrowthPct: number;
  tvl30dGrowthUsd?: number;
  vaults30dDelta: number;
  // all time total yield generated, usd
  totalYieldGeneratedUsd?: number;
  // all time total yield claimed to users, usd
  totalYieldClaimedUsd?: number;
};

export type StrategyBreakdownRow = {
  mode: AnalyticsMode;
  vaultCount: number;
  tvlUsd: number;
  // total sol deposited in the mode, price independent twin of tvlUsd
  tvlSol?: number;
  projectedApyBps: number;
  // mode roi since open, active realized yield over active deposit, percent
  roiPct?: number;
  meanVaultApyBps?: number | null;
  apy30dMedianBps?: number | null;
  // trailing 30d all components yield over mode equity, annualized, bps
  rolling30dApyBps?: number;
  pendingUsdcUsd?: number | null;
  yield30dUsd: number;
  // lifetime all components yield, the total yield made, usd
  lifetimeYieldUsd?: number;
  // same lifetime yield in sol, price independent, read this for the total yield box
  lifetimeYieldSol?: number;
  utilization: number;
  // average kamino multiply forward net carry apy across the mode open vaults, bps
  avgMultiplyNetCarryBps?: number | null;
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

// The step that stopped an open, when one failed.
export type FailedStepRef = {
  stepNumber: number;
  kind: string;
  error: string | null;
};

export type VaultSummary = {
  id: string;
  // Vault wallet. Use it to match a vault to its perp position.
  walletAddress: string;
  state: VaultExecutionState;
  equityLamports: string;
  ltvBps: number;
  // Multiply leverage the vault was opened with.
  multiplyLeverageBps: number;
  leverageBps: number;
  // Strategy tier the vault was opened with. Null on rows opened before the
  // column existed. Read those as 'safe'.
  tier: Tier | null;
  createdAt: number;
  updatedAt: number;
  // Open progress. Drives the building state on create and portfolio.
  stepsTotal: number;
  stepsCompleted: number;
  failedStep: FailedStepRef | null;
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
