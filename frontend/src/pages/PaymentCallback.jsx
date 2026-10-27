import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const { t } = useLang();
  const status = params.get("status") || "success";
  const gateway = params.get("gateway");
  const txnId = params.get("txn");
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    apiClient.myTickets().then((ts) => setTickets(ts.slice(0, 10))).catch(() => {});
  }, []);

  if (gateway === "BANK_TRANSFER") {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🏦</div>
          <h1 className="text-2xl font-bold text-cream-50">{t("bankTransferTitle")}</h1>
          <p className="mt-3 text-cream-300">{t("bankTransferDesc")}</p>
          <div className="mt-5 rounded-xl bg-ink-800 p-4 text-left text-sm space-y-2">
            <div><span className="text-cream-400">{t("bank")}:</span> <span className="text-cream-100">Commercial Bank of Ethiopia</span></div>
            <div><span className="text-cream-400">{t("account")}:</span> <span className="font-mono text-cream-100">1000XXXXXXXXXX</span></div>
            <div><span className="text-cream-400">{t("reference")}:</span> <span className="font-mono text-green-300">TXN-{txnId}</span></div>
          </div>
          <p className="mt-4 text-xs text-cream-400">{t("bankConfirmNote")}</p>
          <Link to="/my-tickets" className="btn-primary mt-5 block">{t("viewMyTickets")}</Link>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="text-2xl font-bold text-cream-50">{t("checkYourPhone")}</h1>
          <p className="mt-3 text-cream-300">{t("telebirrPushSent")}</p>
          <p className="mt-3 text-xs text-cream-400">{t("telebirrPending")}</p>
          <Link to="/my-tickets" className="btn-primary mt-5 block">{t("viewMyTickets")}</Link>
        </div>
      </div>
    );
  }

  const confirmed = tickets.filter((t_) => t_.status === "CONFIRMED");
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-cream-50">{t("paymentConfirmed")}</h1>
        <p className="mt-3 text-cream-300">{t("ticketsGenerated")}</p>
        {confirmed.length > 0 && (
          <div className="mt-5 space-y-2">
            {confirmed.slice(0, 5).map((tk) => (
              <div key={tk.id} className="rounded-xl bg-ink-800 px-4 py-2 font-mono text-green-300">{tk.ticket_no}</div>
            ))}
          </div>
        )}
        <Link to="/my-tickets" className="btn-primary mt-5 block">{t("viewMyTickets")}</Link>
        <Link to="/" className="mt-2 block text-sm text-cream-300 hover:text-cream-100">{t("browseMore")}</Link>
      </div>
    </div>
  );
}
