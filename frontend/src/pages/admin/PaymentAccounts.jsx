import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";
import { DIGITAL_WALLETS, ETHIOPIAN_BANKS } from "../../constants/banks";

export default function AdminPaymentAccounts() {
  const { t, lang } = useLang();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Form modal/card state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    provider_type: "BANK", // "BANK" | "WALLET"
    provider_id: "CBE",
    provider_name: "Commercial Bank of Ethiopia (CBE)",
    account_number: "",
    account_holder: "",
    instructions: "",
    is_active: true,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await apiClient.adminPaymentAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleProviderTypeChange(type) {
    if (type === "WALLET") {
      const first = DIGITAL_WALLETS[0];
      setForm((f) => ({
        ...f,
        provider_type: "WALLET",
        provider_id: first.id,
        provider_name: first.name,
        instructions: first.ussd ? `USSD ${first.ussd}` : "",
      }));
    } else {
      const first = ETHIOPIAN_BANKS[0];
      setForm((f) => ({
        ...f,
        provider_type: "BANK",
        provider_id: first.id,
        provider_name: first.name,
        instructions: "",
      }));
    }
  }

  function handleProviderSelect(pid) {
    if (form.provider_type === "WALLET") {
      const item = DIGITAL_WALLETS.find((w) => w.id === pid);
      if (item) {
        setForm((f) => ({
          ...f,
          provider_id: item.id,
          provider_name: item.name,
          instructions: item.ussd ? `USSD ${item.ussd}` : f.instructions,
        }));
      }
    } else {
      const item = ETHIOPIAN_BANKS.find((b) => b.id === pid);
      if (item) {
        setForm((f) => ({
          ...f,
          provider_id: item.id,
          provider_name: item.name,
        }));
      }
    }
  }

  function openNewModal() {
    setEditingId(null);
    const firstBank = ETHIOPIAN_BANKS[0];
    setForm({
      provider_type: "BANK",
      provider_id: firstBank.id,
      provider_name: firstBank.name,
      account_number: "",
      account_holder: "",
      instructions: "",
      is_active: true,
    });
    setError("");
    setMsg("");
    setShowModal(true);
  }

  function openEditModal(acct) {
    setEditingId(acct.id);
    setForm({
      provider_type: acct.provider_type,
      provider_id: acct.provider_id,
      provider_name: acct.provider_name,
      account_number: acct.account_number,
      account_holder: acct.account_holder,
      instructions: acct.instructions || "",
      is_active: acct.is_active,
    });
    setError("");
    setMsg("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.account_number.trim() || !form.account_holder.trim()) {
      setError(lang === "am" ? "የሂሳብ ቁጥር እና ስም ያስፈልጋል" : "Account number and name are required");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await apiClient.savePaymentAccount(form);
      setMsg(t("accountSavedSuccess"));
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(lang === "am" ? `${name} አካውንት ይሰረዝ?` : `Delete account for ${name}?`)) return;
    try {
      await apiClient.deletePaymentAccount(id);
      setMsg(t("accountDeletedSuccess"));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActive(acct) {
    try {
      await apiClient.updatePaymentAccount(acct.id, { is_active: !acct.is_active });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-cream-300 hover:text-cream-100">
        ← {t("adminTitle")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cream-50">{t("paymentAccounts")}</h1>
          <p className="text-xs text-cream-400 mt-1">{t("paymentAccountsDesc")}</p>
        </div>
        <button onClick={openNewModal} className="btn-primary text-xs flex items-center gap-1.5">
          <span>+</span> {t("addPaymentAccount")}
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {msg}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Accounts List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-cream-400">{t("loading")}</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="text-base font-semibold text-cream-100 mb-1">
              {lang === "am" ? "ገና የተጨመረ አካውንት የለም" : "No payment accounts configured yet"}
            </h3>
            <p className="text-xs text-cream-400 mb-4 max-w-md mx-auto">
              {lang === "am"
                ? "ተጠቃሚዎች ቲኬት ሲገዙ የሚከፍሉባቸውን የባንክ እና ዲጂታል ዋሌት አካውንቶችን ያክሉ።"
                : "Add receiving accounts for Ethiopian banks and digital wallets so buyers see the exact account number and name when checking out."}
            </p>
            <button onClick={openNewModal} className="btn-primary text-xs">
              + {t("addPaymentAccount")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-800 text-cream-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{lang === "am" ? "አይነት" : "Type"}</th>
                  <th className="px-4 py-3">{t("provider")}</th>
                  <th className="px-4 py-3">{t("accountNumber")}</th>
                  <th className="px-4 py-3">{t("accountHolder")}</th>
                  <th className="px-4 py-3">{lang === "am" ? "ሁኔታ" : "Status"}</th>
                  <th className="px-4 py-3 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {accounts.map((a) => (
                  <tr key={a.id} className="bg-ink-700/30 hover:bg-ink-700/50 transition">
                    <td className="px-4 py-3">
                      <span className="pill bg-ink-800 text-cream-300 text-[11px] font-mono">
                        {a.provider_type === "WALLET" ? "📱 WALLET" : "🏦 BANK"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-cream-100">
                      {a.provider_name}
                      {a.instructions && (
                        <span className="block text-[11px] font-normal text-cream-400">{a.instructions}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-green-300">{a.account_number}</td>
                    <td className="px-4 py-3 text-cream-200">{a.account_holder}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(a)}
                        className={`pill text-[10px] font-bold cursor-pointer transition ${
                          a.is_active ? "bg-green-500/20 text-green-300 hover:bg-green-500/30" : "bg-ink-700 text-cream-400 hover:bg-ink-600"
                        }`}
                      >
                        {a.is_active ? (lang === "am" ? "ንቁ ✓" : "ACTIVE") : (lang === "am" ? "ቦዝኗል" : "DISABLED")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(a)}
                          className="btn-ghost px-2.5 py-1 text-xs text-cream-200 hover:text-green-300"
                        >
                          ✏️ {lang === "am" ? "አርትዕ" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleDelete(a.id, a.provider_name)}
                          className="btn-danger px-2.5 py-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-lg p-6 border-green-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-ink-600 mb-4">
              <h2 className="text-lg font-bold text-cream-50">
                {editingId ? t("editPaymentAccount") : t("addPaymentAccount")}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-cream-400 hover:text-cream-100 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="label">{lang === "am" ? "የአካውንት አይነት" : "Account Type"}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProviderTypeChange("BANK")}
                    className={`rounded-xl border p-2.5 text-xs font-semibold transition ${
                      form.provider_type === "BANK"
                        ? "border-green-500 bg-green-500/15 text-green-300"
                        : "border-ink-600 bg-ink-800 text-cream-300 hover:border-ink-500"
                    }`}
                  >
                    🏦 {t("bankTransfer")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderTypeChange("WALLET")}
                    className={`rounded-xl border p-2.5 text-xs font-semibold transition ${
                      form.provider_type === "WALLET"
                        ? "border-green-500 bg-green-500/15 text-green-300"
                        : "border-ink-600 bg-ink-800 text-cream-300 hover:border-ink-500"
                    }`}
                  >
                    📱 {t("digitalWallet")}
                  </button>
                </div>
              </div>

              {/* Provider Selector */}
              <div>
                <label className="label">{t("provider")}</label>
                {form.provider_type === "WALLET" ? (
                  <select
                    className="input"
                    value={form.provider_id}
                    onChange={(e) => handleProviderSelect(e.target.value)}
                  >
                    {DIGITAL_WALLETS.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.nameAm ? `(${w.nameAm})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="input"
                    value={form.provider_id}
                    onChange={(e) => handleProviderSelect(e.target.value)}
                  >
                    {ETHIOPIAN_BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.nameAm ? `· ${b.nameAm}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="label">{t("accountNumber")} *</label>
                <input
                  className="input font-mono font-bold"
                  required
                  placeholder={
                    form.provider_type === "WALLET" ? "09... or 07..." : "e.g. 100012345678"
                  }
                  value={form.account_number}
                  onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="label">{t("accountHolder")} *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Yona Online Draw / Yona Teklu"
                  value={form.account_holder}
                  onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
                />
              </div>

              {/* Instructions / USSD */}
              <div>
                <label className="label">{t("transferInstructions")} ({lang === "am" ? "አማራጭ" : "optional"})</label>
                <input
                  className="input"
                  placeholder="e.g. USSD *127# or Mobile Banking"
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                />
              </div>

              {/* Is Active */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded accent-green-600"
                />
                <label htmlFor="is_active" className="text-sm text-cream-200 cursor-pointer">
                  {lang === "am" ? "ይህ አካውንት ለተጠቃሚዎች ክፍያ ዝግጁ ይሁን" : "Enable this account for public payments"}
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-ink-600">
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setShowModal(false)}
                  disabled={busy}
                >
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={busy}>
                  {busy ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
