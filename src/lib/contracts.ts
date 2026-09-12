// Response types for the BFF endpoints this app consumes.

export type AnalyticsMode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type AnalyticsKpis = {
  totalTvlUsd: number;
  activeVaultCount: number;
  yield30dUsd: number;
  projectedApyBps: number;
  weightedAvgApyBps: number;
  roiPct?: number;
  apy30dMedianBps?: number;
  tvl30dGrowthPct: number;
  tvl30dGrowthUsd?: number;
  vaults30dDelta: number;
  totalYieldGeneratedUsd?: number;
  totalYieldClaimedUsd?: number;
};

export type StrategyBreakdownRow = {
  mode: AnalyticsMode;
  vaultCount: number;
  tvlUsd: number;
  tvlSol?: number;
  projectedApyBps: number;
  roiPct?: number;
  meanVaultApyBps?: number | null;
  apy30dMedianBps?: number | null;
  rolling30dApyBps?: number;
  pendingUsdcUsd?: number | null;
  yield30dUsd: number;
  lifetimeYieldUsd?: number;
  lifetimeYieldSol?: number;
  utilization: number;
  avgMultiplyNetCarryBps?: number | null;
};

export type Tier =
  | 'safe'
  | 'conservative'
  | 'balanced'
  | 'optimistic'
  | 'aggressive'
  | 'yolo';

export const TIER_ORDER: Tier[] = [
  'safe',
  'conservative',
  'balanced',
  'optimistic',
  'aggressive',
  'yolo',
];

export const TIER_DEPOSIT_BOUNDS: Record<Tier, { minSol: number; maxSol: number }> = {
  safe: { minSol: 6, maxSol: 1111 },
  conservative: { minSol: 6, maxSol: 1111 },
  balanced: { minSol: 8, maxSol: 1111 },
  optimistic: { minSol: 11, maxSol: 1112 },
  aggressive: { minSol: 9, maxSol: 1111 },
  yolo: { minSol: 8, maxSol: 1111 },
};

export function minDepositSol(t: Tier): number {
  return TIER_DEPOSIT_BOUNDS[t].minSol;
}

export function maxDepositSol(t: Tier): number {
  return TIER_DEPOSIT_BOUNDS[t].maxSol;
}

export function isDepositWithinBounds(t: Tier, sol: number): boolean {
  return sol >= minDepositSol(t) && sol <= maxDepositSol(t);
}

export const OPEN_FEE_BUFFER_SOL = 0.06;

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

export type FailedStepRef = {
  stepNumber: number;
  kind: string;
  error: string | null;
};

export type VaultSummary = {
  id: string;
  walletAddress: string;
  state: VaultExecutionState;
  equityLamports: string;
  ltvBps: number;
  multiplyLeverageBps: number;
  leverageBps: number;
  tier: Tier | null;
  createdAt: number;
  updatedAt: number;
  stepsTotal: number;
  stepsCompleted: number;
  failedStep: FailedStepRef | null;
  latestClaim: ChildExecutionRef | null;
  latestClose: ChildExecutionRef | null;
  latestDismantle: ChildExecutionRef | null;
  metrics: VaultMetrics | null;
};

export type ListVaultsResponse = { vaults: VaultSummary[] };

export type AmountSol = { lamports: string; sol: string; usd: number | null };

export type TokenAmount = {
  mint: string;
  decimals: number;
  amountUi: string;
  amountLamports: string;
  valueLamports: string;
};

export type ClaimBreakdown = {
  lpRewardsSol: AmountSol & {
    rewards: { mint: string; amountUi: string; quotedSol: string }[];
  };
  fundingReceivedSol: AmountSol;
  fundingPaidSol: AmountSol;
  scalpProfitsSol: AmountSol;
  preScalpProfitsSol: AmountSol;
  withdrawablePerpProfitsSol?: AmountSol;
  claimableFundingProfitsSol?: AmountSol;
  grossClaimableLamports: string;
  serviceFeeBps: number;
  serviceFeeLamports: string;
  netUserYieldLamports: string;
  netUserYieldUsd: number | null;
  releasableNowGrossLamports?: string;
  releasableNowNetLamports?: string;
  carryAutocompoundedSol: AmountSol;
  lpFeesAutocompoundedSol: AmountSol;
  interestPaidSol: AmountSol;
  partial: boolean;
  computedAtMs: number;
};

export type JitoStakingPosition = {
  jitoSolBalance: string;
  currentRate: number;
  solValueLamports: string;
  totalSolStakedLamports: string;
  totalJitoSolReceivedLamports: string;
  totalJitoSolHeldLamports: string;
};

export type KaminoLendLeg = {
  supply: {
    marketAddress: string;
    reserveAddress: string;
    token: string;
    decimals: number;
    collateral: string;
    supplyApyBps: number;
    amountEarned: string;
  };
  borrow: {
    marketAddress: string;
    reserveAddress: string;
    token: string;
    decimals: number;
    debt: string;
    ltvBps: number;
    borrowCapacityLtvBps: number;
    healthFactor: number;
    borrowApyBps: number;
  };
  netApyBps: number | null;
};

export type KaminoMultiplyPosition = {
  obligationAddress: string;
  collateralJitoSolLamports: string;
  debtSolLamports: string;
  ltvBps: number;
  liquidationLtvBps: number;
  userTotalDepositUsd: number;
  userTotalBorrowUsd: number;
  netValueUsd: number;
  leverage: number;
  multiplyTargetLeverage: number;
  netCarryApyBps: number | null;
  solBorrowApyBps?: number | null;
  jitoYieldBps?: number | null;
};

export type KliquidityPosition = {
  strategyAddress: string;
  poolAddress: string;
  dex: 'ORCA' | 'RAYDIUM' | 'METEORA';
  tokenA: TokenAmount;
  tokenB: TokenAmount;
  ratioBps: number;
  apyBps: number;
  apyMode: '7d' | '24h';
  incentivesApyBps: number;
  withdrawableFees: {
    tokenA: TokenAmount;
    tokenB: TokenAmount;
    rewards: (TokenAmount & {
      vaultAddress: string;
      apyBps: number;
      weeklyEmissionsLamports: string;
    })[];
  };
};

export type PerpsPosition = {
  venue: 'hyperliquid' | 'pacifica';
  symbol: string;
  side: 'LONG' | 'SHORT';
  sizeBase: string;
  leverage: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  collateralLamports: string;
  spotBalanceLamports: string;
  accruedFundingPnlUsd?: number;
  fundingRateApr?: number | null;
};

export type VaultStatus =
  | 'OPENING'
  | 'OPEN'
  | 'OPEN_FAILED'
  | 'CLOSING'
  | 'CLOSED'
  | 'CLOSE_FAILED';

export type VaultPositions = {
  vaultId: string;
  status: VaultStatus;
  openedAt: number;
  closedAt: number | null;
  baseline: 'open' | 'lastClaim';
  equityLamports: string;
  currentEquityLamports: string;
  equityNavLamports: string | null;
  pnlLamports: string;
  pnlBps: number;
  apyBps: number;
  apy30dBps?: number;
  activeUpsideBorrowCount: number;
  daysHeld: number;
  realizedYieldLamports: string;
  realizedYieldBps: number;
  yieldHistorySol?: { ts: number; earnedSol: number }[];
  usdcHistoryUsd?: { ts: number; usd: number }[];
  positions: {
    jitoStaking: JitoStakingPosition;
    kaminoLend: KaminoLendLeg[];
    kaminoMultiply: KaminoMultiplyPosition | null;
    kaminoLiquidity: KliquidityPosition;
    perps: PerpsPosition | null;
  };
  claimPreview: ClaimBreakdown | null;
  earlyClose: { penaltyBps: number; startBps: number; decaySeconds: number };
  closeUnlockAtMs?: number | null;
  claimNextAllowedAtMs?: number | null;
  claimableSol?: number | null;
  pendingRecycleUsd?: number | null;
  carryLpEarnedSolLamports?: string;
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
