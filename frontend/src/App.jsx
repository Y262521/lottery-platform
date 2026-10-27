import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LotteryDetail from "./pages/LotteryDetail";
import PaymentCallback from "./pages/PaymentCallback";
import DrawResults from "./pages/DrawResults";
import MyTickets from "./pages/MyTickets";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLotteries from "./pages/admin/Lotteries";
import AdminLotteryForm from "./pages/admin/LotteryForm";
import AdminLotteryManage from "./pages/admin/LotteryManage";
import AdminTransactions from "./pages/admin/Transactions";
import AdminUsers from "./pages/admin/Users";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lottery/:id" element={<LotteryDetail />} />
          <Route path="/lottery/:id/results" element={<DrawResults />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/lotteries" element={<AdminRoute><AdminLotteries /></AdminRoute>} />
          <Route path="/admin/lotteries/new" element={<AdminRoute><AdminLotteryForm /></AdminRoute>} />
          <Route path="/admin/lotteries/:id" element={<AdminRoute><AdminLotteryManage /></AdminRoute>} />
          <Route path="/admin/transactions" element={<AdminRoute><AdminTransactions /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-ink-700 px-4 py-6 text-center text-xs text-cream-400">
        Emerald Draw · Direct-Purchase Lottery Platform
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md p-6 text-center">
      <h1 className="text-2xl font-bold text-cream-50">404</h1>
      <p className="mt-2 text-cream-300">Page not found.</p>
    </div>
  );
}
