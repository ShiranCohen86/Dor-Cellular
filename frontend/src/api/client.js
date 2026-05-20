/**
 * Legacy compatibility shim.
 *
 * The codebase migrated to per-domain API files under `src/api/*.api.js`.
 * For new code, prefer:
 *     import { fetchProducts } from '../api/products.api.js';
 *
 * This file preserves the previous grouped imports (`import { Products } from '../api/client.js'`)
 * so existing pages keep compiling during the refactor.
 */
import * as AuthApi from './auth.api.js';
import * as ProductsApi from './products.api.js';
import * as CategoriesApi from './categories.api.js';
import * as CustomersApi from './customers.api.js';
import * as OrdersApi from './orders.api.js';
import * as RepairsApi from './repairs.api.js';
import * as SuppliersApi from './suppliers.api.js';
import * as ReportsApi from './reports.api.js';
import * as NotificationsApi from './notifications.api.js';
import * as BranchesApi from './branches.api.js';
import * as PublicApi from './public.api.js';
import { httpClient, buildAbsoluteUrl } from './request.js';

export const api = httpClient;

export const Auth = {
  login: AuthApi.loginRequest,
  me: AuthApi.fetchCurrentUser,
  updateMe: AuthApi.updateCurrentUser,
  changePassword: AuthApi.changeCurrentPassword,
  logout: AuthApi.logoutRequest,
  listUsers: AuthApi.fetchAllUsers,
  register: AuthApi.registerEmployeeUser,
  loginLogs: AuthApi.fetchLoginLogs,
  auditLogs: AuthApi.fetchAuditLogs,
};
export const Products = {
  list: ProductsApi.fetchProducts,
  scan: ProductsApi.scanProductByCode,
  create: ProductsApi.createProduct,
  update: ProductsApi.updateProduct,
  adjust: ProductsApi.adjustProductStock,
  movements: ProductsApi.fetchStockMovements,
  lowStock: ProductsApi.fetchLowStockProducts,
  transfer: ProductsApi.transferStockBetweenBranches,
};
export const Categories = { list: CategoriesApi.fetchCategories };
export const Customers = {
  list: CustomersApi.fetchCustomers,
  create: CustomersApi.createCustomer,
  update: CustomersApi.updateCustomer,
  purchases: CustomersApi.fetchCustomerPurchases,
  repairs: CustomersApi.fetchCustomerRepairs,
};
export const Orders = {
  list: OrdersApi.fetchOrders,
  get: OrdersApi.fetchOrderById,
  create: OrdersApi.createOrder,
  refund: OrdersApi.refundOrder,
  pay: OrdersApi.addPaymentToOrder,
  invoicePdfUrl: OrdersApi.getInvoicePdfUrl,
};
export const Repairs = {
  list: RepairsApi.fetchRepairs,
  create: RepairsApi.createRepair,
  status: RepairsApi.changeRepairStatus,
  update: RepairsApi.updateRepair,
};
export const Suppliers = {
  list: SuppliersApi.fetchSuppliers,
  create: SuppliersApi.createSupplier,
  pos: SuppliersApi.fetchPurchaseOrders,
  createPO: SuppliersApi.createPurchaseOrder,
  receivePO: SuppliersApi.receivePurchaseOrder,
};
export const Reports = {
  dashboard: ReportsApi.fetchDashboardSummary,
  dailySales: ReportsApi.fetchDailySales,
  monthlyProfit: ReportsApi.fetchMonthlyProfit,
  bestSellers: ReportsApi.fetchBestSellingProducts,
  deadStock: ReportsApi.fetchDeadStockReport,
  employees: ReportsApi.fetchEmployeeLeaderboard,
  vat: ReportsApi.fetchVatReport,
  ordersPerMonth: ReportsApi.fetchOrdersPerMonth,
  exportCsv: ReportsApi.getDailySalesCsvUrl,
};
export const Notifications = {
  list: NotificationsApi.fetchNotifications,
  markRead: NotificationsApi.markNotificationAsRead,
  markAllRead: NotificationsApi.markAllNotificationsAsRead,
};
export const Branches = {
  list: BranchesApi.fetchBranches,
  create: BranchesApi.createBranch,
};
export const Public = {
  products: PublicApi.fetchPublicProducts,
  product: PublicApi.fetchPublicProductById,
  categories: PublicApi.fetchPublicCategories,
  brands: PublicApi.fetchPublicBrands,
};

export { buildAbsoluteUrl };
