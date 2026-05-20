/**
 * Reports / analytics endpoints (admin & manager only).
 */
import { httpClient, safeRequest, buildAbsoluteUrl } from './request.js';

/** GET /reports/dashboard — KPIs for the top of the dashboard. */
export function fetchDashboardSummary() {
  return safeRequest(httpClient.get('/reports/dashboard'));
}

/** GET /reports/daily-sales — revenue grouped by day. */
export function fetchDailySales(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/daily-sales', { params: queryParams }));
}

/** GET /reports/monthly-profit — revenue/cost/profit grouped by month. */
export function fetchMonthlyProfit(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/monthly-profit', { params: queryParams }));
}

/** GET /reports/best-sellers — top N products by quantity sold. */
export function fetchBestSellingProducts(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/best-sellers', { params: queryParams }));
}

/** GET /reports/dead-stock — products with no sales in the window. */
export function fetchDeadStockReport(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/dead-stock', { params: queryParams }));
}

/** GET /reports/employees — leaderboard by orders + revenue. */
export function fetchEmployeeLeaderboard(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/employees', { params: queryParams }));
}

/** GET /reports/vat — totals + tax for the period. */
export function fetchVatReport(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/vat', { params: queryParams }));
}

/** GET /reports/orders-per-month — order counts per month, broken down by status. */
export function fetchOrdersPerMonth(queryParams = {}) {
  return safeRequest(httpClient.get('/reports/orders-per-month', { params: queryParams }));
}

/** Direct download URL for the daily-sales CSV export. */
export function getDailySalesCsvUrl() {
  return buildAbsoluteUrl('/reports/export.csv');
}
