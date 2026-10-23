import './global.css';

import { Toaster } from '@/components/ui/toaster';
import { createRoot } from 'react-dom/client';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ConfirmProvider } from '@/components/shared/ConfirmProvider';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';

import Index from './pages/Index';
import Products from './pages/Products';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import ComboDetail from './pages/ComboDetail';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetail from './pages/AdminOrderDetail';
import AdminCategories from './pages/AdminCategories';
import AdminCombos from './pages/AdminCombos';
import AdminComboEdit from './pages/AdminComboEdit';
import AdminHeroSlides from './pages/AdminHeroSlides';
import AdminSettings from './pages/AdminSettings';
import AdminFaqs from './pages/AdminFaqs';
import AdminTestimonials from './pages/AdminTestimonials';
import AdminTestUpload from './pages/AdminTestUpload';
import AdminChats from './pages/AdminChats';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Shipping from './pages/Shipping';
import Returns from './pages/Returns';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import { AIChatLauncher } from '@/components/AIChatLauncher';
import AdminGiftBankPage from './pages/AdminGiftBankPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import AdminResellers from './pages/AdminResellers';
import PartnerPortal from './pages/PartnerPortal';
import AdminAds from './pages/AdminAds';
import AdminWithdrawals from './pages/AdminWithdrawals';
import AdminPartnerSales from './pages/AdminPartnerSales';
import AdminProfit from './pages/AdminProfit';
import AdminFulfilment from './pages/AdminFulfilment';
import AdminStock from './pages/AdminStock';
import AdminToday from './pages/AdminToday';
import AdminRecordSale from './pages/AdminRecordSale';
import AdminStaff from './pages/AdminStaff';
import AdminAudit from './pages/AdminAudit';
import AdminExpenses from './pages/AdminExpenses';
import AdminReports from './pages/AdminReports';
import { captureReferral } from "@/lib/referral";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
captureReferral();
/** Customer-only widgets (WhatsApp button, bottom nav) are hidden on the partner and admin pages. */
const CustomerOnly = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin') || pathname.startsWith('/partner')) return null;
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ConfirmProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />

                  <Route path="/products" element={<Products />} />
                  <Route path="/combos/:slug" element={<ComboDetail />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/categories/:slug" element={<CategoryPage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                  <Route path="/order-tracking" element={<OrderTracking />} />
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Admin routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                  <Route path="/admin/orders" element={<AdminProtectedRoute perm="orders.view"><AdminOrders /></AdminProtectedRoute>} />
                  <Route path="/admin/orders/:id" element={<AdminProtectedRoute perm="orders.view"><AdminOrderDetail /></AdminProtectedRoute>} />
                  <Route path="/admin/gift-bank" element={<AdminProtectedRoute perm="owner"><AdminGiftBankPage /></AdminProtectedRoute>} />
                  <Route path="/admin/categories" element={<AdminProtectedRoute perm="products.edit"><AdminCategories /></AdminProtectedRoute>} />
                  <Route path="/admin/combos" element={<AdminProtectedRoute perm="products.edit"><AdminCombos /></AdminProtectedRoute>} />
                  <Route path="/admin/combos/new" element={<AdminProtectedRoute perm="products.edit"><AdminComboEdit /></AdminProtectedRoute>} />
                  <Route path="/admin/combos/:id" element={<AdminProtectedRoute perm="products.edit"><AdminComboEdit /></AdminProtectedRoute>} />
                  <Route path="/admin/combos/:id/edit" element={<AdminProtectedRoute perm="products.edit"><AdminComboEdit /></AdminProtectedRoute>} />
                  <Route path="/admin/hero-slides" element={<AdminProtectedRoute perm="slides.use"><AdminHeroSlides /></AdminProtectedRoute>} />
                  <Route path="/admin/settings" element={<AdminProtectedRoute perm="owner"><AdminSettings /></AdminProtectedRoute>} />
                  <Route path="/admin/faqs" element={<AdminProtectedRoute perm="faqs.use"><AdminFaqs /></AdminProtectedRoute>} />
                  <Route path="/admin/testimonials" element={<AdminProtectedRoute perm="testimonials.use"><AdminTestimonials /></AdminProtectedRoute>} />
                  <Route path="/admin/chats" element={<AdminProtectedRoute perm="chats.use"><AdminChats /></AdminProtectedRoute>} />
                  <Route path="/admin/test-upload" element={<AdminProtectedRoute perm="owner"><AdminTestUpload /></AdminProtectedRoute>} />
                  <Route path="/admin/resellers" element={<AdminProtectedRoute perm="owner"><AdminResellers /></AdminProtectedRoute>} />

                  <Route path="/admin/partners/:id" element={<AdminProtectedRoute perm="owner"><AdminPartnerSales /></AdminProtectedRoute>} />
                  <Route path="/admin/payouts" element={<AdminProtectedRoute perm="owner"><AdminWithdrawals /></AdminProtectedRoute>} />
                  <Route path="/admin/record-sale" element={<AdminProtectedRoute perm="sale.record"><AdminRecordSale /></AdminProtectedRoute>} />
                  <Route path="/admin/profit" element={<AdminProtectedRoute perm="owner"><AdminProfit /></AdminProtectedRoute>} />
                  <Route path="/admin/today" element={<AdminProtectedRoute perm="owner"><AdminToday /></AdminProtectedRoute>} />
                  <Route path="/admin/stock" element={<AdminProtectedRoute perm="stock.use"><AdminStock /></AdminProtectedRoute>} />
                  <Route path="/admin/fulfilment" element={<AdminProtectedRoute perm="fulfilment.use"><AdminFulfilment /></AdminProtectedRoute>} />
                  <Route path="/admin/ads" element={<AdminProtectedRoute perm="ads.use"><AdminAds /></AdminProtectedRoute>} />

                  <Route path="/admin/expenses" element={<AdminProtectedRoute perm="expenses.use"><AdminExpenses /></AdminProtectedRoute>} />
                  <Route path="/admin/reports" element={<AdminProtectedRoute perm="reports.view"><AdminReports /></AdminProtectedRoute>} />
                  <Route path="/admin/staff" element={<AdminProtectedRoute perm="owner"><AdminStaff /></AdminProtectedRoute>} />
                  <Route path="/admin/audit" element={<AdminProtectedRoute perm="owner"><AdminAudit /></AdminProtectedRoute>} />

                  {/* Partner portal */}
                  <Route path="/partner" element={<PartnerPortal />} />

                  {/* Footer pages */}
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/shipping" element={<Shipping />} />
                  <Route path="/returns" element={<Returns />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CustomerOnly>
                  <MobileBottomNav />
                  <AIChatLauncher />
                </CustomerOnly>
              </BrowserRouter>
              </ConfirmProvider>
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

createRoot(document.getElementById('root')!).render(<App />);
