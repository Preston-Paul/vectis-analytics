export type OptionRight = 'call' | 'put'

export type MarketSession = 'pre' | 'regular' | 'post' | 'closed'

export type StrategyLegSide = 'buy' | 'sell'

export type StrategyKind =
  | 'single'
  | 'vertical'
  | 'straddle'
  | 'strangle'
  | 'iron-condor'
  | 'butterfly'
  | 'calendar'
  | 'custom'

export type FlowSide = 'bullish' | 'bearish' | 'neutral'

export interface UnderlyingQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  dayOpen: number
  dayHigh: number
  dayLow: number
  previousClose: number
  volume: number
  averageVolume: number
  beta?: number
  marketCap?: number
  earningsDate?: string
  dividendDate?: string
  session: MarketSession
  updatedAt: string
}

export interface Greeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  vomma?: number
  charm?: number
  vanna?: number
}

export interface OptionContract {
  symbol: string
  underlyingSymbol: string
  expiry: string
  strike: number
  right: OptionRight
  bid: number
  ask: number
  mid: number
  last: number
  mark: number
  change: number
  changePercent: number
  volume: number
  openInterest: number
  impliedVolatility: number
  intrinsicValue: number
  extrinsicValue: number
  inTheMoney: boolean
  daysToExpiry: number
  multiplier: number
  greeks: Greeks
}

export interface OptionExpirySummary {
  expiry: string
  daysToExpiry: number
  contractCount: number
  atmStrike: number
  atmIv: number
  callIv: number
  putIv: number
  totalCallVolume: number
  totalPutVolume: number
  totalCallOi: number
  totalPutOi: number
}

export interface IvSnapshot {
  currentIv: number
  ivRank: number
  ivPercentile: number
  high52Week: number
  low52Week: number
  realizedVol20d?: number
  realizedVol60d?: number
  history: number[]
}

export interface SkewPoint {
  strike: number
  moneyness: number
  callIv?: number
  putIv?: number
}

export interface TermStructurePoint {
  expiry: string
  daysToExpiry: number
  atmIv: number
}

export interface PricingInputs {
  spot: number
  strike: number
  timeToExpiry: number
  rate: number
  volatility: number
  right: OptionRight
  dividendYield?: number
}

export interface PricingResult {
  theoreticalPrice: number
  d1: number
  d2: number
  greeks: Greeks
}

export interface MonteCarloInputs {
  spot: number
  drift: number
  volatility: number
  days: number
  simulations: number
  rate?: number
}

export interface MonteCarloSummary {
  expectedPrice: number
  medianPrice: number
  p05: number
  p25: number
  p75: number
  p95: number
  probabilityAboveSpot: number
  probabilityBelowSpot: number
  expectedMove: number
  paths: number[][]
}

export interface StrategyLeg {
  id: string
  contractSymbol?: string
  side: StrategyLegSide
  quantity: number
  right: OptionRight
  strike: number
  expiry: string
  premium: number
  multiplier: number
  impliedVolatility?: number
  greeks?: Greeks
}

export interface StrategyDefinition {
  name: string
  kind: StrategyKind
  underlyingSymbol: string
  spotPrice: number
  legs: StrategyLeg[]
}

export interface PayoffPoint {
  price: number
  pnl: number
}

export interface StrategyAnalysis {
  netPremium: number
  maxProfit?: number
  maxLoss?: number
  breakevens: number[]
  payoff: PayoffPoint[]
  greeks: Greeks
}

export interface Position {
  id: string
  symbol: string
  underlyingSymbol: string
  quantity: number
  averagePrice: number
  marketPrice: number
  marketValue: number
  unrealizedPnl: number
  realizedPnl?: number
  greeks: Greeks
  daysToExpiry?: number
}

export interface PortfolioRiskSnapshot {
  totalMarketValue: number
  totalUnrealizedPnl: number
  netDelta: number
  netGamma: number
  netTheta: number
  netVega: number
  netRho: number
  concentrationByUnderlying: Array<{
    symbol: string
    marketValue: number
    weight: number
  }>
  expiryBuckets: Array<{
    label: string
    value: number
  }>
}

export interface FlowRecord {
  id: string
  timestamp: string
  underlyingSymbol: string
  contractSymbol: string
  expiry: string
  strike: number
  right: OptionRight
  premium: number
  size: number
  notional: number
  side: FlowSide
  tradeType: 'sweep' | 'block' | 'split' | 'cross'
  sentimentScore: number
}

export interface OptionsChain {
  underlying: UnderlyingQuote
  expiries: OptionExpirySummary[]
  contracts: OptionContract[]
  ivSnapshot: IvSnapshot
  skew: Record<string, SkewPoint[]>
  termStructure: TermStructurePoint[]
}