import type {
  FlowRecord,
  MonteCarloInputs,
  MonteCarloSummary,
  OptionsChain,
  PortfolioRiskSnapshot,
  Position,
  StrategyAnalysis,
  StrategyDefinition,
} from '../../types/trading'
import { analyzeStrategy, runMonteCarlo } from './pricing'
import {
  getMockExpectedMove,
  getMockFlow,
  getMockOptionsChain,
  getMockPortfolioRisk,
  getMockPositions,
} from './mockData'

type ExpectedMoveResponse = {
  symbol: string
  daysToExpiry: number
  expectedMove: number
  upperBound: number
  lowerBound: number
}

type TradingApiConfig = {
  useMockData?: boolean
  latencyMs?: number
}

const config: Required<TradingApiConfig> = {
  useMockData: true,
  latencyMs: 250,
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withLatency<T>(factory: () => T | Promise<T>): Promise<T> {
  await delay(config.latencyMs)
  return factory()
}

export function configureTradingApi(overrides: TradingApiConfig) {
  if (typeof overrides.useMockData === 'boolean') {
    config.useMockData = overrides.useMockData
  }

  if (typeof overrides.latencyMs === 'number') {
    config.latencyMs = overrides.latencyMs
  }
}

export async function getOptionsChain(symbol = 'SPY'): Promise<OptionsChain> {
  return withLatency(() => {
    if (config.useMockData) {
      return getMockOptionsChain(symbol)
    }

    throw new Error('Live options chain endpoint not implemented yet.')
  })
}

export async function getExpectedMove(
  symbol = 'SPY',
  daysToExpiry = 30,
): Promise<ExpectedMoveResponse> {
  return withLatency(() => {
    if (config.useMockData) {
      return getMockExpectedMove(symbol, daysToExpiry)
    }

    throw new Error('Live expected move endpoint not implemented yet.')
  })
}

export async function getFlow(symbol = 'SPY'): Promise<FlowRecord[]> {
  return withLatency(() => {
    if (config.useMockData) {
      return getMockFlow(symbol)
    }

    throw new Error('Live options flow endpoint not implemented yet.')
  })
}

export async function getPositions(symbol = 'SPY'): Promise<Position[]> {
  return withLatency(() => {
    if (config.useMockData) {
      return getMockPositions(symbol)
    }

    throw new Error('Live positions endpoint not implemented yet.')
  })
}

export async function getPortfolioRisk(symbol = 'SPY'): Promise<PortfolioRiskSnapshot> {
  return withLatency(() => {
    if (config.useMockData) {
      return getMockPortfolioRisk(symbol)
    }

    throw new Error('Live portfolio risk endpoint not implemented yet.')
  })
}

export async function runMonteCarloAnalysis(
  inputs: MonteCarloInputs,
): Promise<MonteCarloSummary> {
  return withLatency(() => runMonteCarlo(inputs))
}

export async function analyzeOptionsStrategy(
  strategy: StrategyDefinition,
): Promise<StrategyAnalysis> {
  return withLatency(() => analyzeStrategy(strategy))
}

export const tradingApi = {
  configure: configureTradingApi,
  getOptionsChain,
  getExpectedMove,
  getFlow,
  getPositions,
  getPortfolioRisk,
  runMonteCarloAnalysis,
  analyzeOptionsStrategy,
}