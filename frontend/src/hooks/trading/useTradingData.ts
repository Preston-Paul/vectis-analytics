import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { tradingApi } from '../../lib/trading/api'

type UseTradingDataOptions = {
  symbol?: string
  daysToExpiry?: number
  autoLoad?: boolean
}

type ExpectedMoveData = {
  symbol: string
  daysToExpiry: number
  expectedMove: number
  upperBound: number
  lowerBound: number
}

type TradingDataState = {
  chain: OptionsChain | null
  expectedMove: ExpectedMoveData | null
  flow: FlowRecord[]
  positions: Position[]
  portfolioRisk: PortfolioRiskSnapshot | null
  loading: boolean
  error: string | null
  refreshAll: () => Promise<void>
  refreshChain: () => Promise<void>
  refreshFlow: () => Promise<void>
  refreshPortfolio: () => Promise<void>
  runMonteCarloAnalysis: (inputs: MonteCarloInputs) => Promise<MonteCarloSummary>
  analyzeStrategy: (strategy: StrategyDefinition) => Promise<StrategyAnalysis>
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong while loading trading data.'
}

export function useTradingData(
  options: UseTradingDataOptions = {},
): TradingDataState {
  const {
    symbol = 'SPY',
    daysToExpiry = 30,
    autoLoad = true,
  } = options

  const [chain, setChain] = useState<OptionsChain | null>(null)
  const [expectedMove, setExpectedMove] = useState<ExpectedMoveData | null>(null)
  const [flow, setFlow] = useState<FlowRecord[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [portfolioRisk, setPortfolioRisk] = useState<PortfolioRiskSnapshot | null>(null)
  const [loading, setLoading] = useState<boolean>(autoLoad)
  const [error, setError] = useState<string | null>(null)

  const refreshChain = useCallback(async () => {
    const [nextChain, nextExpectedMove] = await Promise.all([
      tradingApi.getOptionsChain(symbol),
      tradingApi.getExpectedMove(symbol, daysToExpiry),
    ])

    setChain(nextChain)
    setExpectedMove(nextExpectedMove)
  }, [symbol, daysToExpiry])

  const refreshFlow = useCallback(async () => {
    const nextFlow = await tradingApi.getFlow(symbol)
    setFlow(nextFlow)
  }, [symbol])

  const refreshPortfolio = useCallback(async () => {
    const [nextPositions, nextPortfolioRisk] = await Promise.all([
      tradingApi.getPositions(symbol),
      tradingApi.getPortfolioRisk(symbol),
    ])

    setPositions(nextPositions)
    setPortfolioRisk(nextPortfolioRisk)
  }, [symbol])

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      await Promise.all([
        refreshChain(),
        refreshFlow(),
        refreshPortfolio(),
      ])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [refreshChain, refreshFlow, refreshPortfolio])

  const runMonteCarloAnalysis = useCallback(
    async (inputs: MonteCarloInputs) => {
      try {
        setError(null)
        return await tradingApi.runMonteCarloAnalysis(inputs)
      } catch (err) {
        const message = getErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [],
  )

  const analyzeStrategy = useCallback(
    async (strategy: StrategyDefinition) => {
      try {
        setError(null)
        return await tradingApi.analyzeOptionsStrategy(strategy)
      } catch (err) {
        const message = getErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [],
  )

  useEffect(() => {
    if (!autoLoad) return
    void refreshAll()
  }, [autoLoad, refreshAll])

  return useMemo(
    () => ({
      chain,
      expectedMove,
      flow,
      positions,
      portfolioRisk,
      loading,
      error,
      refreshAll,
      refreshChain,
      refreshFlow,
      refreshPortfolio,
      runMonteCarloAnalysis,
      analyzeStrategy,
    }),
    [
      chain,
      expectedMove,
      flow,
      positions,
      portfolioRisk,
      loading,
      error,
      refreshAll,
      refreshChain,
      refreshFlow,
      refreshPortfolio,
      runMonteCarloAnalysis,
      analyzeStrategy,
    ],
  )
}