import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Draws from "./pages/Draws";
import BuyTickets from "./pages/BuyTickets";
import LiveDraw from "./pages/LiveDraw";
import Results from "./pages/Results";
import MyTickets from "./pages/MyTickets";
import Wallet from "./pages/Wallet";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/draws" element={<Draws />} />
          <Route path="/draws/:id" element={<BuyTickets />} />
          <Route path="/live/:id" element={<LiveDraw />} />
          <Route path="/results" element={<Results />} />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute roles={["ADMIN", "AUDITOR"]}>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-ink-700 px-4 py-6 text-center text-xs text-cream-400">
        Emerald Draw · Provably-fair lottery demo · Not affiliated with any real lottery
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md p-6 text-center">
      <h1 className="text-2xl font-bold text-cream-50">404</h1>
      <p className="mt-2 text-cream-300">That page rolled away.</p>
    </div>
  );
}
