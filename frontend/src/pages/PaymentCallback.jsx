import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const status = params.get("status") || "success";
  const gateway = params.get("gateway");
  const txnId = params.get("txn");
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    // After Chapa redirect, fetch the user's recent tickets
    apiClient.myTickets().then((ts) => setTickets(ts.slice(0, 10))).catch(() => {});
  }, []);

  if (gateway === "BANK_TRANSFER") {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🏦</div>
          <h1 className="text-2xl font-bold text-cream-50">Bank Transfer Instructions</h1>
          <p className="mt-3 text-cream-300">
            Please transfer the exact amount to the following account and send
            your receipt to our support team for verification.
          </p>
          <div className="mt-5 rounded-xl bg-ink-800 p-4 text-left text-sm space-y-2">
            <div><span className="text-cream-400">Bank:</span> <span className="text-cream-100">Commercial Bank of Ethiopia</span></div>
            <div><span className="text-cream-400">Account:</span> <span className="font-mono text-cream-100">1000XXXXXXXXXX</span></div>
            <div><span className="text-cream-400">Reference:</span> <span className="font-mono text-green-300">TXN-{txnId}</span></div>
          </div>
          <p className="mt-4 text-xs text-cream-400">
            Your tickets will be confirmed once the admin verifies your payment.
          </p>
          <Link to="/my-tickets" className="btn-primary mt-5 block">View My Tickets</Link>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="text-2xl font-bold text-cream-50">Check Your Phone</h1>
          <p className="mt-3 text-cream-300">
            A Telebirr USSD push has been sent to your phone. Approve the
            payment to confirm your tickets.
          </p>
          <p className="mt-3 text-xs text-cream-400">
            Your tickets will appear in "My Tickets" once approved.
          </p>
          <Link to="/my-tickets" className="btn-primary mt-5 block">View My Tickets</Link>
        </div>
      </div>
    );
  }

  // Chapa success / default
  const confirmed = tickets.filter((t) => t.status === "CONFIRMED");
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-cream-50">Payment Confirmed!</h1>
        <p className="mt-3 text-cream-300">
          Your tickets have been generated and a confirmation email has been sent.
        </p>
        {confirmed.length > 0 && (
          <div className="mt-5 space-y-2">
            {confirmed.slice(0, 5).map((t) => (
              <div key={t.id} className="rounded-xl bg-ink-800 px-4 py-2 font-mono text-green-300">
                {t.ticket_no}
              </div>
            ))}
          </div>
        )}
        <Link to="/my-tickets" className="btn-primary mt-5 block">View All My Tickets</Link>
        <Link to="/" className="mt-2 block text-sm text-cream-300 hover:text-cream-100">Browse More Lotteries</Link>
      </div>
    </div>
  );
}
