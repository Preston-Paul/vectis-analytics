import type {
  FlowRecord,
  IvSnapshot,
  OptionContract,
  OptionExpirySummary,
  OptionsChain,
  OptionRight,
  PortfolioRiskSnapshot,
  Position,
  SkewPoint,
  TermStructurePoint,
  UnderlyingQuote,
} from '../../types/trading'
import {
  calculateExpectedMove,
  calculateIvPercentile,
  calculateIvRank,
  extrinsicValue,
  intrinsicValue,
  priceOption,
} from './pricing'

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function normalNoise(scale = 1) {
  return (Math.random() - 0.5) * 2 * scale
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildIvHistory(baseIv: number, points = 252) {
  const history: number[] = []
  let current = baseIv * 0.92

  for (let i = 0; i < points; i += 1) {
    current = clamp(current + normalNoise(0.015), 0.12, 0.65)
    history.push(round(current, 4))
  }

  return history
}

function buildUnderlying(symbol = 'SPY'): UnderlyingQuote {
  const price = 534.18

  return {
    symbol,
    name: 'SPDR S&P 500 ETF Trust',
    price,
    change: 3.42,
    changePercent: 0.64,
    dayOpen: 531.22,
    dayHigh: 535.1,
    dayLow: 529.88,
    previousClose: 530.76,
    volume: 72450123,
    averageVolume: 81234000,
    beta: 0.98,
    marketCap: 492_000_000_000,
    earningsDate: '2026-07-25',
    dividendDate: '2026-06-28',
    session: 'regular',
    updatedAt: new Date().toISOString(),
  }
}

function buildStrikes(spot: number) {
  const start = Math.round((spot * 0.8) / 5) * 5
  const end = Math.round((spot * 1.2) / 5) * 5
  const strikes: number[] = []

  for (let strike = start; strike <= end; strike += 5) {
    strikes.push(strike)
  }

  return strikes
}

function buildBaseIv(daysToExpiry: number) {
  if (daysToExpiry <= 14) return 0.26
  if (daysToExpiry <= 45) return 0.235
  if (daysToExpiry <= 90) return 0.222
  if (daysToExpiry <= 180) return 0.215
  return 0.21
}

function buildContractSymbol(
  underlying: string,
  expiry: string,
  right: OptionRight,
  strike: number,
) {
  const yymmdd = expiry.slice(2, 4) + expiry.slice(5, 7) + expiry.slice(8, 10)
  const rightCode = right === 'call' ? 'C' : 'P'
  const strikeCode = String(Math.round(strike * 1000)).padStart(8, '0')
  return `${underlying}${yymmdd}${rightCode}${strikeCode}`
}

function generateContract(
  underlying: UnderlyingQuote,
  expiry: string,
  daysToExpiry: number,
  strike: number,
  right: OptionRight,
): OptionContract {
  const spot = underlying.price
  const moneyness = strike / spot - 1
  const baseIv = buildBaseIv(daysToExpiry)

  const skewAdjustment =
    right === 'put'
      ? Math.abs(Math.min(moneyness, 0)) * 0.35
      : Math.max(moneyness, 0) * 0.18

  const smileAdjustment = Math.abs(moneyness) * 0.1
  const eventAdjustment = daysToExpiry < 10 ? 0.02 : 0

  const impliedVolatility = round(
    clamp(baseIv + skewAdjustment + smileAdjustment + eventAdjustment, 0.12, 0.95),
    4,
  )

  const pricing = priceOption({
    spot,
    strike,
    timeToExpiry: daysToExpiry / 365,
    rate: 0.045,
    volatility: impliedVolatility,
    right,
    dividendYield: 0.012,
  })

  const theoretical = Math.max(pricing.theoreticalPrice, 0.01)
  const spread = Math.max(theoretical * 0.03, 0.02)
  const mid = round(theoretical + normalNoise(0.05), 2)
  const bid = round(Math.max(mid - spread / 2, 0.01), 2)
  const ask = round(Math.max(mid + spread / 2, bid + 0.01), 2)
  const mark = round((bid + ask) / 2, 2)
  const last = round(mark + normalNoise(0.08), 2)
  const intrinsic = round(intrinsicValue(spot, strike, right), 2)
  const extrinsic = round(extrinsicValue(mark, spot, strike, right), 2)
  const contractSymbol = buildContractSymbol(underlying.symbol, expiry, right, strike)

  const distanceFromAtm = Math.abs(strike - spot)
  const liquidityFactor = Math.max(1, 14 - distanceFromAtm / 5)

  return {
    symbol: contractSymbol,
    underlyingSymbol: underlying.symbol,
    expiry,
    strike,
    right,
    bid,
    ask,
    mid: round(mid, 2),
    last,
    mark,
    change: round(normalNoise(0.35), 2),
    changePercent: round(normalNoise(4), 2),
    volume: Math.round(150 * liquidityFactor + Math.random() * 3000),
    openInterest: Math.round(500 * liquidityFactor + Math.random() * 10000),
    impliedVolatility,
    intrinsicValue: intrinsic,
    extrinsicValue: extrinsic,
    inTheMoney: intrinsic > 0,
    daysToExpiry,
    multiplier: 100,
    greeks: {
      delta: round(pricing.greeks.delta, 4),
      gamma: round(pricing.greeks.gamma, 4),
      theta: round(pricing.greeks.theta, 4),
      vega: round(pricing.greeks.vega, 4),
      rho: round(pricing.greeks.rho, 4),
    },
  }
}

function buildExpiries(spot: number) {
  const today = new Date()
  const dtes = [7, 14, 30, 45, 60, 90, 120, 180, 270, 365]

  return dtes.map((days) => {
    const expiry = formatDate(addDays(today, days))
    return {
      expiry,
      daysToExpiry: days,
      atmStrike: Math.round(spot / 5) * 5,
    }
  })
}

function buildChain(symbol = 'SPY') {
  const underlying = buildUnderlying(symbol)
  const strikes = buildStrikes(underlying.price)
  const expiriesMeta = buildExpiries(underlying.price)

  const contracts: OptionContract[] = []

  for (const expiryMeta of expiriesMeta) {
    for (const strike of strikes) {
      contracts.push(
        generateContract(
          underlying,
          expiryMeta.expiry,
          expiryMeta.daysToExpiry,
          strike,
          'call',
        ),
      )
      contracts.push(
        generateContract(
          underlying,
          expiryMeta.expiry,
          expiryMeta.daysToExpiry,
          strike,
          'put',
        ),
      )
    }
  }

  const expiries: OptionExpirySummary[] = expiriesMeta.map((meta) => {
    const expiryContracts = contracts.filter((contract) => contract.expiry === meta.expiry)
    const calls = expiryContracts.filter((contract) => contract.right === 'call')
    const puts = expiryContracts.filter((contract) => contract.right === 'put')

    const atmCall =
      calls.reduce((closest, contract) => {
        const currentDiff = Math.abs(contract.strike - underlying.price)
        const prevDiff = Math.abs(closest.strike - underlying.price)
        return currentDiff < prevDiff ? contract : closest
      }, calls[0]) ?? calls[0]

    const atmPut =
      puts.reduce((closest, contract) => {
        const currentDiff = Math.abs(contract.strike - underlying.price)
        const prevDiff = Math.abs(closest.strike - underlying.price)
        return currentDiff < prevDiff ? contract : closest
      }, puts[0]) ?? puts[0]

    return {
      expiry: meta.expiry,
      daysToExpiry: meta.daysToExpiry,
      contractCount: expiryContracts.length,
      atmStrike: meta.atmStrike,
      atmIv: round(((atmCall?.impliedVolatility ?? 0) + (atmPut?.impliedVolatility ?? 0)) / 2, 4),
      callIv: round(atmCall?.impliedVolatility ?? 0, 4),
      putIv: round(atmPut?.impliedVolatility ?? 0, 4),
      totalCallVolume: calls.reduce((sum, contract) => sum + contract.volume, 0),
      totalPutVolume: puts.reduce((sum, contract) => sum + contract.volume, 0),
      totalCallOi: calls.reduce((sum, contract) => sum + contract.openInterest, 0),
      totalPutOi: puts.reduce((sum, contract) => sum + contract.openInterest, 0),
    }
  })

  const ivHistory = buildIvHistory(0.228)
  const currentIv = expiries[2]?.atmIv ?? 0.228
  const high52Week = Math.max(...ivHistory, currentIv)
  const low52Week = Math.min(...ivHistory, currentIv)

  const ivSnapshot: IvSnapshot = {
    currentIv,
    ivRank: round(calculateIvRank(currentIv, high52Week, low52Week), 2),
    ivPercentile: round(calculateIvPercentile(currentIv, ivHistory), 2),
    high52Week: round(high52Week, 4),
    low52Week: round(low52Week, 4),
    realizedVol20d: 0.182,
    realizedVol60d: 0.169,
    history: ivHistory,
  }

  const skew: Record<string, SkewPoint[]> = {}

  for (const expiry of expiries) {
    const expiryContracts = contracts.filter((contract) => contract.expiry === expiry.expiry)
    const calls = expiryContracts.filter((contract) => contract.right === 'call')
    const puts = expiryContracts.filter((contract) => contract.right === 'put')

    skew[expiry.expiry] = strikes.map((strike) => {
      const call = calls.find((contract) => contract.strike === strike)
      const put = puts.find((contract) => contract.strike === strike)

      return {
        strike,
        moneyness: round(strike / underlying.price, 4),
        callIv: call?.impliedVolatility,
        putIv: put?.impliedVolatility,
      }
    })
  }

  const termStructure: TermStructurePoint[] = expiries.map((expiry) => ({
    expiry: expiry.expiry,
    daysToExpiry: expiry.daysToExpiry,
    atmIv: expiry.atmIv,
  }))

  const optionsChain: OptionsChain = {
    underlying,
    expiries,
    contracts,
    ivSnapshot,
    skew,
    termStructure,
  }

  return optionsChain
}

function flowSentimentFromContract(contract: OptionContract): 'bullish' | 'bearish' | 'neutral' {
  if (contract.right === 'call' && contract.greeks.delta > 0.35) return 'bullish'
  if (contract.right === 'put' && contract.greeks.delta < -0.35) return 'bearish'
  return 'neutral'
}

export function getMockOptionsChain(symbol = 'SPY'): OptionsChain {
  return buildChain(symbol)
}

export function getMockExpectedMove(symbol = 'SPY', daysToExpiry = 30) {
  const chain = buildChain(symbol)
  const expectedMove = calculateExpectedMove(
    chain.underlying.price,
    chain.ivSnapshot.currentIv,
    daysToExpiry,
  )

  return {
    symbol,
    daysToExpiry,
    expectedMove: round(expectedMove, 2),
    upperBound: round(chain.underlying.price + expectedMove, 2),
    lowerBound: round(chain.underlying.price - expectedMove, 2),
  }
}

export function getMockFlow(symbol = 'SPY'): FlowRecord[] {
  const chain = buildChain(symbol)
  const sampleContracts = chain.contracts
    .filter((contract) => contract.daysToExpiry <= 45)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 18)

  return sampleContracts.map((contract, index) => {
    const premium = round(contract.mark, 2)
    const size = Math.round(50 + Math.random() * 450)
    const notional = round(premium * size * contract.multiplier, 2)

    return {
      id: `flow-${index + 1}`,
      timestamp: new Date(Date.now() - index * 1000 * 60 * 7).toISOString(),
      underlyingSymbol: symbol,
      contractSymbol: contract.symbol,
      expiry: contract.expiry,
      strike: contract.strike,
      right: contract.right,
      premium,
      size,
      notional,
      side: flowSentimentFromContract(contract),
      tradeType: index % 3 === 0 ? 'sweep' : index % 4 === 0 ? 'block' : 'split',
      sentimentScore:
        contract.right === 'call'
          ? round(60 + Math.random() * 35, 1)
          : round(20 + Math.random() * 35, 1),
    }
  })
}

export function getMockPositions(symbol = 'SPY'): Position[] {
  const chain = buildChain(symbol)
  const selected = [
    chain.contracts.find(
      (contract) =>
        contract.expiry === chain.expiries[1].expiry &&
        contract.strike === 530 &&
        contract.right === 'call',
    ),
    chain.contracts.find(
      (contract) =>
        contract.expiry === chain.expiries[2].expiry &&
        contract.strike === 540 &&
        contract.right === 'call',
    ),
    chain.contracts.find(
      (contract) =>
        contract.expiry === chain.expiries[2].expiry &&
        contract.strike === 520 &&
        contract.right === 'put',
    ),
    chain.contracts.find(
      (contract) =>
        contract.expiry === chain.expiries[4].expiry &&
        contract.strike === 550 &&
        contract.right === 'call',
    ),
  ].filter(Boolean) as OptionContract[]

  return selected.map((contract, index) => {
    const quantity = index === 2 ? -3 : index === 1 ? 2 : 1
    const averagePrice = round(contract.mark * (0.92 + Math.random() * 0.12), 2)
    const marketPrice = contract.mark
    const marketValue = round(marketPrice * quantity * contract.multiplier, 2)
    const unrealizedPnl = round((marketPrice - averagePrice) * quantity * contract.multiplier, 2)

    return {
      id: `position-${index + 1}`,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlyingSymbol,
      quantity,
      averagePrice,
      marketPrice,
      marketValue,
      unrealizedPnl,
      greeks: {
        delta: round(contract.greeks.delta * quantity * contract.multiplier, 2),
        gamma: round(contract.greeks.gamma * quantity * contract.multiplier, 2),
        theta: round(contract.greeks.theta * quantity * contract.multiplier, 2),
        vega: round(contract.greeks.vega * quantity * contract.multiplier, 2),
        rho: round(contract.greeks.rho * quantity * contract.multiplier, 2),
      },
      daysToExpiry: contract.daysToExpiry,
    }
  })
}

export function getMockPortfolioRisk(symbol = 'SPY'): PortfolioRiskSnapshot {
  const positions = getMockPositions(symbol)
  const totalMarketValue = round(positions.reduce((sum, pos) => sum + pos.marketValue, 0), 2)
  const totalUnrealizedPnl = round(positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0), 2)

  const grouped = positions.reduce<Record<string, number>>((acc, pos) => {
    acc[pos.underlyingSymbol] = (acc[pos.underlyingSymbol] ?? 0) + pos.marketValue
    return acc
  }, {})

  return {
    totalMarketValue,
    totalUnrealizedPnl,
    netDelta: round(positions.reduce((sum, pos) => sum + pos.greeks.delta, 0), 2),
    netGamma: round(positions.reduce((sum, pos) => sum + pos.greeks.gamma, 0), 2),
    netTheta: round(positions.reduce((sum, pos) => sum + pos.greeks.theta, 0), 2),
    netVega: round(positions.reduce((sum, pos) => sum + pos.greeks.vega, 0), 2),
    netRho: round(positions.reduce((sum, pos) => sum + pos.greeks.rho, 0), 2),
    concentrationByUnderlying: Object.entries(grouped).map(([ticker, marketValue]) => ({
      symbol: ticker,
      marketValue: round(marketValue, 2),
      weight: totalMarketValue === 0 ? 0 : round((marketValue / totalMarketValue) * 100, 2),
    })),
    expiryBuckets: [
      {
        label: '0-30 DTE',
        value: round(
          positions
            .filter((pos) => (pos.daysToExpiry ?? 0) <= 30)
            .reduce((sum, pos) => sum + pos.marketValue, 0),
          2,
        ),
      },
      {
        label: '31-90 DTE',
        value: round(
          positions
            .filter((pos) => (pos.daysToExpiry ?? 0) > 30 && (pos.daysToExpiry ?? 0) <= 90)
            .reduce((sum, pos) => sum + pos.marketValue, 0),
          2,
        ),
      },
      {
        label: '90+ DTE',
        value: round(
          positions
            .filter((pos) => (pos.daysToExpiry ?? 0) > 90)
            .reduce((sum, pos) => sum + pos.marketValue, 0),
          2,
        ),
      },
    ],
  }
}