export interface User {
  id: number
  email: string
  full_name: string
  company_name: string
}

export interface Company {
  id: number
  name: string
  industry: string
  revenue_range: string
  location: string
}

export interface FinancialPeriod {
  id: number
  company_id: number
  period_type: string
  period_date: string
}

export interface LineItem {
  id: number
  category: string
  subcategory: string
  description: string
  amount: number
  budget_amount: number | null
}

export interface IncomeStatement {
  revenue: number
  cogs: number
  gross_profit: number
  operating_expenses: number
  operating_income: number
  other_income: number
  pre_tax_income: number
  tax: number
  net_income: number
  line_items: LineItem[]
}

export interface VarianceItem {
  description: string
  category: string
  actual: number
  budget: number
  variance_dollar: number | null
  variance_pct: number | null
}

export interface CommodityPrice {
  symbol: string
  name: string
  price: number
  change_pct: number
}

// Scenario modeling
export interface Scenario {
  id: number
  company_id: number
  period_id: number
  name: string
  description: string | null
  revenue_change_pct: number
  cogs_change_pct: number
  opex_change_pct: number
  other_income_change_pct: number
  other_expense_change_pct: number
  commodity_price_change_pct: number
  created_at: string
}

export interface ScenarioLineItem {
  description: string
  category: string
  base_amount: number
  scenario_amount: number
  change: number
  change_pct: number | null
}

export interface ScenarioPnL {
  scenario_id: number
  scenario_name: string
  period_id: number
  base_revenue: number
  base_cogs: number
  base_gross_profit: number
  base_opex: number
  base_operating_income: number
  base_other_income: number
  base_other_expense: number
  base_pre_tax_income: number
  base_tax: number
  base_net_income: number
  scenario_revenue: number
  scenario_cogs: number
  scenario_gross_profit: number
  scenario_opex: number
  scenario_operating_income: number
  scenario_other_income: number
  scenario_other_expense: number
  scenario_pre_tax_income: number
  scenario_tax: number
  scenario_net_income: number
  net_income_change: number
  net_income_change_pct: number | null
  line_items: ScenarioLineItem[]
}
