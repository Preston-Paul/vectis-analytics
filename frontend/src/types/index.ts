// ─── Domain types ──────────────────────────────────────────────

export interface User {
  id: number
  email: string
  full_name: string
  company_name?: string
}

export interface Company {
  id: number
  name: string
  industry: string
  location: string
  revenue_range: string
  description?: string
}

export interface LineItem {
  id?: number
  category: string
  subcategory?: string
  description: string
  amount: number
  budget_amount?: number | null
}

export interface FinancialPeriod {
  id: number
  company_id: number
  period_type: string
  period_date: string
  line_items?: LineItem[]
}

export interface IncomeStatement {
  revenue?: { total?: number } | number
  gross_profit?: number
  operating_income?: number
  net_income?: number
}

export interface Scenario {
  id: number
  name: string
  description?: string
  company_id: number
  base_period_id?: number
  revenue_growth_pct: number
  cogs_change_pct: number
  opex_change_pct: number
  created_at?: string
}

export interface ScenarioPnL {
  scenario_id: number
  scenario_name: string
  base_revenue: number
  projected_revenue: number
  base_gross_profit: number
  projected_gross_profit: number
  base_operating_income: number
  projected_operating_income: number
  base_net_income: number
  projected_net_income: number
  revenue_change_pct: number
  gross_profit_change_pct: number
  operating_income_change_pct: number
  net_income_change_pct: number
}

export interface CommodityPrice {
  symbol: string
  name: string
  price: number
  change_pct: number
  unit?: string
  category?: string
}

// ─── Utility types ──────────────────────────────────────────────

export type Industry = 'OIL_GAS' | 'MIDSTREAM' | 'REFINING' | 'TRADING' | 'LOGISTICS' | 'OTHER'
export type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
export type LineItemCategory = 'REVENUE' | 'COGS' | 'OPEX' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'TAX'

export const INDUSTRY_LABELS: Record<string, string> = {
  OIL_GAS: 'Oil & Gas',
  MIDSTREAM: 'Midstream',
  REFINING: 'Refining',
  TRADING: 'Trading',
  LOGISTICS: 'Logistics',
  OTHER: 'Other',
}

export const PERIOD_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
}

export const INDUSTRIES: { label: string; value: string }[] = [
  { label: 'Oil & Gas', value: 'OIL_GAS' },
  { label: 'Midstream', value: 'MIDSTREAM' },
  { label: 'Refining', value: 'REFINING' },
  { label: 'Trading', value: 'TRADING' },
  { label: 'Logistics', value: 'LOGISTICS' },
  { label: 'Other', value: 'OTHER' },
]

export const PERIOD_TYPES: { label: string; value: string }[] = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
  { label: 'Annual', value: 'ANNUAL' },
]

export const LINE_ITEM_CATEGORIES: { label: string; value: string }[] = [
  { label: 'Revenue', value: 'REVENUE' },
  { label: 'Cost of Goods Sold', value: 'COGS' },
  { label: 'Operating Expenses', value: 'OPEX' },
  { label: 'Other Income', value: 'OTHER_INCOME' },
  { label: 'Other Expense', value: 'OTHER_EXPENSE' },
  { label: 'Tax', value: 'TAX' },
]
