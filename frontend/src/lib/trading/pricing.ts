import type {
  Greeks,
  MonteCarloInputs,
  MonteCarloSummary,
  OptionRight,
  PayoffPoint,
  PricingInputs,
  PricingResult,
  StrategyAnalysis,
  StrategyDefinition,
} from '../../types/trading'

const SQRT_2PI = Math.sqrt(2 * Math.PI)

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalPdf(x: number) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI
}

function normalCdf(x: number) {
  const sign = x < 0 ? -1 : 1
  const z = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * z)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const erf =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-z * z)

  return 0.5 * (1 + sign * erf)
}

function safeTime(t: number) {
  return Math.max(t, 1 / 3650)
}

function safeVol(vol: number) {
  return Math.max(vol, 0.0001)
}

export function calculateD1({
  spot,
  strike,
  timeToExpiry,
  rate,
  volatility,
  dividendYield = 0,
}: Omit<PricingInputs, 'right'>) {
  const t = safeTime(timeToExpiry)
  const sigma = safeVol(volatility)

  return (
    (Math.log(spot / strike) + (rate - dividendYield + 0.5 * sigma * sigma) * t) /
    (sigma * Math.sqrt(t))
  )
}

export function calculateD2(inputs: Omit<PricingInputs, 'right'>) {
  const t = safeTime(inputs.timeToExpiry)
  const sigma = safeVol(inputs.volatility)
  return calculateD1(inputs) - sigma * Math.sqrt(t)
}

export function blackScholesPrice(inputs: PricingInputs) {
  const {
    spot,
    strike,
    timeToExpiry,
    rate,
    volatility,
    right,
    dividendYield = 0,
  } = inputs

  const t = safeTime(timeToExpiry)
  const sigma = safeVol(volatility)
  const d1 = calculateD1({ spot, strike, timeToExpiry: t, rate, volatility: sigma, dividendYield })
  const d2 = d1 - sigma * Math.sqrt(t)

  const discountedSpot = spot * Math.exp(-dividendYield * t)
  const discountedStrike = strike * Math.exp(-rate * t)

  if (right === 'call') {
    return discountedSpot * normalCdf(d1) - discountedStrike * normalCdf(d2)
  }

  return discountedStrike * normalCdf(-d2) - discountedSpot * normalCdf(-d1)
}

export function calculateGreeks(inputs: PricingInputs): Greeks {
  const {
    spot,
    strike,
    timeToExpiry,
    rate,
    volatility,
    right,
    dividendYield = 0,
  } = inputs

  const t = safeTime(timeToExpiry)
  const sigma = safeVol(volatility)
  const d1 = calculateD1({ spot, strike, timeToExpiry: t, rate, volatility: sigma, dividendYield })
  const d2 = d1 - sigma * Math.sqrt(t)
  const pdf = normalPdf(d1)

  const discountedSpot = spot * Math.exp(-dividendYield * t)
  const discountedStrike = strike * Math.exp(-rate * t)

  const delta =
    right === 'call'
      ? Math.exp(-dividendYield * t) * normalCdf(d1)
      : Math.exp(-dividendYield * t) * (normalCdf(d1) - 1)

  const gamma = (Math.exp(-dividendYield * t) * pdf) / (spot * sigma * Math.sqrt(t))
  const vega = (discountedSpot * pdf * Math.sqrt(t)) / 100

  const thetaCall =
    (-discountedSpot * pdf * sigma) / (2 * Math.sqrt(t)) -
    rate * discountedStrike * normalCdf(d2) +
    dividendYield * discountedSpot * normalCdf(d1)

  const thetaPut =
    (-discountedSpot * pdf * sigma) / (2 * Math.sqrt(t)) +
    rate * discountedStrike * normalCdf(-d2) -
    dividendYield * discountedSpot * normalCdf(-d1)

  const theta = (right === 'call' ? thetaCall : thetaPut) / 365

  const rho =
    right === 'call'
      ? (strike * t * discountedStrike * normalCdf(d2)) / 100
      : (-strike * t * discountedStrike * normalCdf(-d2)) / 100

  return {
    delta,
    gamma,
    theta,
    vega,
    rho,
  }
}

export function priceOption(inputs: PricingInputs): PricingResult {
  const d1 = calculateD1(inputs)
  const d2 = calculateD2(inputs)
  const theoreticalPrice = blackScholesPrice(inputs)
  const greeks = calculateGreeks(inputs)

  return {
    theoreticalPrice,
    d1,
    d2,
    greeks,
  }
}

export function intrinsicValue(spot: number, strike: number, right: OptionRight) {
  return right === 'call' ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0)
}

export function extrinsicValue(price: number, spot: number, strike: number, right: OptionRight) {
  return Math.max(price - intrinsicValue(spot, strike, right), 0)
}

export function calculateExpectedMove(spot: number, iv: number, daysToExpiry: number) {
  return spot * iv * Math.sqrt(daysToExpiry / 365)
}

export function calculateIvRank(currentIv: number, high52Week: number, low52Week: number) {
  if (high52Week === low52Week) return 0
  return clamp(((currentIv - low52Week) / (high52Week - low52Week)) * 100, 0, 100)
}

export function calculateIvPercentile(currentIv: number, ivHistory: number[]) {
  if (!ivHistory.length) return 0
  const lowerDays = ivHistory.filter((value) => value < currentIv).length
  return clamp((lowerDays / ivHistory.length) * 100, 0, 100)
}

function randomNormal() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function runMonteCarlo(inputs: MonteCarloInputs): MonteCarloSummary {
  const {
    spot,
    drift,
    volatility,
    days,
    simulations,
  } = inputs

  const dt = 1 / 252
  const steps = Math.max(days, 1)
  const paths: number[][] = []
  const terminalPrices: number[] = []

  for (let i = 0; i < simulations; i += 1) {
    const path = [spot]
    let current = spot

    for (let step = 0; step < steps; step += 1) {
      const shock = randomNormal()
      current =
        current *
        Math.exp((drift - 0.5 * volatility * volatility) * dt + volatility * Math.sqrt(dt) * shock)
      path.push(current)
    }

    paths.push(path)
    terminalPrices.push(current)
  }

  const sorted = [...terminalPrices].sort((a, b) => a - b)
  const avg = terminalPrices.reduce((sum, value) => sum + value, 0) / terminalPrices.length
  const median = sorted[Math.floor(sorted.length * 0.5)]
  const p05 = sorted[Math.floor(sorted.length * 0.05)]
  const p25 = sorted[Math.floor(sorted.length * 0.25)]
  const p75 = sorted[Math.floor(sorted.length * 0.75)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const above = terminalPrices.filter((price) => price > spot).length / terminalPrices.length
  const below = terminalPrices.filter((price) => price < spot).length / terminalPrices.length

  return {
    expectedPrice: avg,
    medianPrice: median,
    p05,
    p25,
    p75,
    p95,
    probabilityAboveSpot: above,
    probabilityBelowSpot: below,
    expectedMove: Math.abs(avg - spot),
    paths,
  }
}

export function aggregateGreeks(greeksList: Greeks[]): Greeks {
  return greeksList.reduce(
    (acc, greeks) => ({
      delta: acc.delta + greeks.delta,
      gamma: acc.gamma + greeks.gamma,
      theta: acc.theta + greeks.theta,
      vega: acc.vega + greeks.vega,
      rho: acc.rho + greeks.rho,
    }),
    {
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    },
  )
}

export function analyzeStrategy(strategy: StrategyDefinition): StrategyAnalysis {
  const multiplier = 100
  const prices: number[] = []

  const minStrike = Math.min(...strategy.legs.map((leg) => leg.strike))
  const maxStrike = Math.max(...strategy.legs.map((leg) => leg.strike))
  const low = Math.max(strategy.spotPrice * 0.5, minStrike * 0.75)
  const high = Math.max(strategy.spotPrice * 1.5, maxStrike * 1.25)
  const step = (high - low) / 80

  for (let price = low; price <= high; price += step) {
    prices.push(price)
  }

  const payoff: PayoffPoint[] = prices.map((price) => {
    const pnl = strategy.legs.reduce((sum, leg) => {
      const intrinsic =
        leg.right === 'call'
          ? Math.max(price - leg.strike, 0)
          : Math.max(leg.strike - price, 0)

      const signedIntrinsic = leg.side === 'buy' ? intrinsic : -intrinsic
      const signedPremium = leg.side === 'buy' ? -leg.premium : leg.premium

      return sum + (signedIntrinsic + signedPremium) * leg.quantity * multiplier
    }, 0)

    return {
      price,
      pnl,
    }
  })

  const pnls = payoff.map((point) => point.pnl)
  const maxProfit = Math.max(...pnls)
  const maxLoss = Math.min(...pnls)

  const breakevens: number[] = []
  for (let i = 1; i < payoff.length; i += 1) {
    const prev = payoff[i - 1]
    const curr = payoff[i]
    if ((prev.pnl <= 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl <= 0)) {
      breakevens.push((prev.price + curr.price) / 2)
    }
  }

  const greeks = aggregateGreeks(
    strategy.legs.map((leg) => {
      const sign = leg.side === 'buy' ? 1 : -1
      return {
        delta: (leg.greeks?.delta ?? 0) * leg.quantity * sign,
        gamma: (leg.greeks?.gamma ?? 0) * leg.quantity * sign,
        theta: (leg.greeks?.theta ?? 0) * leg.quantity * sign,
        vega: (leg.greeks?.vega ?? 0) * leg.quantity * sign,
        rho: (leg.greeks?.rho ?? 0) * leg.quantity * sign,
      }
    }),
  )

  const netPremium = strategy.legs.reduce((sum, leg) => {
    const signedPremium = leg.side === 'buy' ? -leg.premium : leg.premium
    return sum + signedPremium * leg.quantity * multiplier
  }, 0)

  return {
    netPremium,
    maxProfit: Number.isFinite(maxProfit) ? maxProfit : undefined,
    maxLoss: Number.isFinite(maxLoss) ? maxLoss : undefined,
    breakevens,
    payoff,
    greeks,
  }
}