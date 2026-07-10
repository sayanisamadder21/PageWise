import { useEffect, useState } from "react";
import { C } from "../AppNew";
import { tierConfig } from "../config/tierConfig";
import { isDevAccessGranted, getDevParam } from "../utils/devAccess";

const GEO_URL = "https://plain-firefly-95a9.sayanisamadder345.workers.dev/geo";

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: "pdfs" | "questions" | "exports";
  session?: any;
  onTierRefresh?: () => void;
}

const REASONS = {
  pdfs:      "You've reached your free limit of 3 PDFs/day.",
  questions: "You've reached your free limit of 30 questions/day.",
  exports:   "You've reached your free limit of 2 exports/day.",
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function UpgradeModal({ visible, onClose, reason, session, onTierRefresh }: UpgradeModalProps) {
  const [isIndia,     setIsIndia]     = useState(true);
  const [billing,     setBilling]     = useState<"monthly" | "yearly">("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [lsRedirect,  setLsRedirect]  = useState(false);
  const [payError,    setPayError]    = useState<string | null>(null);

  useEffect(() => {
    const realGeoFetch = () => {
      fetch(GEO_URL)
        .then(r => r.json())
        .then(d => setIsIndia(d.country === "IN"))
        .catch(() => setIsIndia(false));
    };

    // DEV-ONLY: ?test_country= override for geo/payment-provider detection.
    // Requires both ?test_country=<CC> and ?dev_key=<DEV_ACCESS_KEY> in the URL.
    // Normal users without a valid dev_key always go through the real geo fetch.
    const testCountry = getDevParam("test_country");
    if (testCountry) {
      isDevAccessGranted().then(valid => {
        if (valid) setIsIndia(testCountry.toUpperCase() === "IN");
        else realGeoFetch();
      });
    } else {
      realGeoFetch();
    }
  }, []);

  // Reset transient state whenever the modal opens/closes
  useEffect(() => {
    if (!visible) {
      setLoadingPlan(null);
      setSuccess(false);
      setLsRedirect(false);
      setPayError(null);
    }
  }, [visible]);

  if (!visible) return null;

  const plans = [
    {
      name: "Free",
      planId: "free" as const,
      current: true,
      color: C.border,
      features: [
        "3 PDFs/day",
        "30 questions/day",
        "2 exports/day",
        "6 modes",
        "Chat clears on new PDF upload",
      ],
      monthlyINR: 0,
      yearlyINR:  0,
      monthlyUSD: 0,
      yearlyUSD:  0,
      cta: "Current Plan",
      ctaDisabled: true,
    },
    {
      name: "Starter",
      planId: "starter" as const,
      current: false,
      color: C.orange,
      badge: "POPULAR",
      features: [
        "25 PDFs/day",
        "100 questions/day",
        "10 exports/day",
        "9 AI modes incl. Default",
        "Page-level citations",
        "10 chat history (14 days)",
      ],
      monthlyINR: tierConfig.starter.monthlyPriceINR,
      yearlyINR:  tierConfig.starter.yearlyPriceINR,
      monthlyUSD: tierConfig.starter.monthlyPriceUSD,
      yearlyUSD:  tierConfig.starter.yearlyPriceUSD,
      cta: "Upgrade to Starter",
      ctaDisabled: false,
    },
    {
      name: "Pro",
      planId: "pro" as const,
      current: false,
      color: C.gold,
      badge: "ELITE",
      features: [
        "Unlimited everything",
        "All 9 modes + Custom mode",
        "Advanced citations",
        "Unlimited chat history",
        "Chat search",
        "Large document support",
        "Priority performance",
      ],
      monthlyINR: tierConfig.pro.monthlyPriceINR,
      yearlyINR:  tierConfig.pro.yearlyPriceINR,
      monthlyUSD: tierConfig.pro.monthlyPriceUSD,
      yearlyUSD:  tierConfig.pro.yearlyPriceUSD,
      cta: "Upgrade to Pro",
      ctaDisabled: false,
    },
  ];

  const getPrice = (plan: typeof plans[0]): { yearly: string | null; monthly: string } | string => {
    if (plan.monthlyINR === 0) return "Free";
    if (isIndia) {
      if (billing === "yearly") {
        return {
          yearly:  `₹${plan.yearlyINR.toLocaleString("en-IN")}/yr`,
          monthly: `₹${plan.monthlyINR}/mo`,
        };
      }
      return { yearly: null, monthly: `₹${plan.monthlyINR}/mo` };
    } else {
      if (billing === "yearly") {
        return {
          yearly:  `$${plan.yearlyUSD}/yr`,
          monthly: `$${plan.monthlyUSD}/mo`,
        };
      }
      return { yearly: null, monthly: `$${plan.monthlyUSD}/mo` };
    }
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.monthlyINR === 0) return null;
    return billing === "yearly" ? "2 months free" : null;
  };

  // ── Razorpay (India) ────────────────────────────────────────
  async function handleRazorpay(planId: "starter" | "pro") {
    const orderRes = await fetch("/api/razorpay-order", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: planId, billing }),
    });
    if (!orderRes.ok) throw new Error("Failed to create order");
    const { orderId, amount, currency, keyId } = await orderRes.json();

    await loadScript("https://checkout.razorpay.com/v1/checkout.js");

    return new Promise<void>((resolve, reject) => {
      const rzp = new (window as any).Razorpay({
        key:         keyId,
        amount,
        currency,
        name:        "PageWise",
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — ${billing}`,
        order_id:    orderId,
        prefill:     { email: session?.user?.email ?? "" },
        theme:       { color: "#F97316" },
        modal:       { ondismiss: () => reject(new Error("dismissed")) },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/verify-razorpay", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              userId:              session?.user?.id,
              plan:                planId,
              billing,
            }),
          });
          const data = await verifyRes.json();
          if (data.success) {
            resolve();
          } else {
            reject(new Error("Verification failed"));
          }
        },
      });
      rzp.open();
    });
  }

  // ── Lemon Squeezy (international) ──────────────────────────
  // Calls /api/ls-checkout server-side to get a real UUID checkout URL via the LS Checkouts API.
  async function handleLemonSqueezy(planId: "starter" | "pro") {
    const res = await fetch("/api/ls-checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan:    planId,
        billing,
        email:   session?.user?.email ?? "",
        userId:  session?.user?.id    ?? "",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as any).error ?? "Failed to create checkout");
    }
    const { url } = await res.json() as { url: string };
    window.open(url, "_blank", "noopener,noreferrer");
    setLsRedirect(true);
  }

  // ── Unified upgrade handler ─────────────────────────────────
  async function handleUpgrade(planId: "starter" | "pro") {
    if (!session) return;
    setLoadingPlan(planId);
    setPayError(null);
    try {
      if (isIndia) {
        await handleRazorpay(planId);
        onTierRefresh?.();
        setSuccess(true);
        setTimeout(onClose, 2500);
      } else {
        await handleLemonSqueezy(planId);
        // LS success is async (webhook); show redirect message instead
      }
    } catch (err: any) {
      if (err?.message !== "dismissed") {
        setPayError("Payment failed. Please try again.");
      }
    } finally {
      setLoadingPlan(null);
    }
  }

  // ── Lemon Squeezy post-redirect refresh ────────────────────
  function handleLsDone() {
    onTierRefresh?.();
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(16,13,11,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bg, borderRadius: 20, padding: "28px 24px",
          maxWidth: 480, width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          border: `1px solid ${C.border}`,
          maxHeight: "90vh", overflowY: "auto",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Success screen */}
        {success && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ color: C.dark, fontSize: 20, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", margin: "0 0 8px" }}>
              You're all set!
            </h2>
            <p style={{ color: C.textMid, fontSize: 13, fontFamily: "'Montserrat',sans-serif", margin: 0 }}>
              Your plan has been upgraded. Enjoy PageWise!
            </p>
          </div>
        )}

        {/* Lemon Squeezy redirect message */}
        {!success && lsRedirect && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <h2 style={{ color: C.dark, fontSize: 18, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", margin: "0 0 10px" }}>
              Complete your payment
            </h2>
            <p style={{ color: C.textMid, fontSize: 13, fontFamily: "'Montserrat',sans-serif", margin: "0 0 20px", lineHeight: 1.6 }}>
              Your checkout has opened in a new tab. Once payment is complete, click below to activate your plan.
            </p>
            <button
              onClick={handleLsDone}
              style={{
                background: C.orange, border: "none", borderRadius: 10,
                padding: "10px 28px", fontSize: 13, fontWeight: 700,
                color: "#fff", cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
              }}
            >
              I've completed payment
            </button>
          </div>
        )}

        {/* Main modal content */}
        {!success && !lsRedirect && (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>⚡</div>
              <h2 style={{ color: C.dark, fontSize: 20, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", margin: "0 0 6px" }}>
                Upgrade PageWise
              </h2>
              {reason && (
                <p style={{ color: C.textMid, fontSize: 13, fontFamily: "'Montserrat',sans-serif", margin: 0 }}>
                  {REASONS[reason]}
                </p>
              )}
            </div>

            {/* Billing Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              <span
                style={{ fontSize: 12, fontWeight: 600, color: billing === "monthly" ? C.dark : C.muted, fontFamily: "'Montserrat',sans-serif", cursor: "pointer" }}
                onClick={() => setBilling("monthly")}
              >Monthly</span>

              <div
                onClick={() => setBilling(billing === "yearly" ? "monthly" : "yearly")}
                style={{ width: 44, height: 24, borderRadius: 12, background: billing === "yearly" ? C.orange : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s" }}
              >
                <div style={{ position: "absolute", top: 3, left: billing === "yearly" ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>

              <span
                style={{ fontSize: 12, fontWeight: 600, color: billing === "yearly" ? C.dark : C.muted, fontFamily: "'Montserrat',sans-serif", cursor: "pointer" }}
                onClick={() => setBilling("yearly")}
              >
                Yearly
                <span style={{ marginLeft: 6, background: C.orange, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif" }}>
                  2 MONTHS FREE
                </span>
              </span>
            </div>

            {/* Error */}
            {payError && (
              <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#991B1B", fontFamily: "'Montserrat',sans-serif" }}>
                {payError}
              </div>
            )}

            {/* Plan Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {plans.map(plan => {
                const price  = getPrice(plan);
                const isObj  = typeof price === "object";
                const isLoading = loadingPlan === plan.planId;

                return (
                  <div key={plan.name} style={{
                    border: `2px solid ${plan.current ? C.border : plan.color}`,
                    borderRadius: 14, padding: "16px 18px",
                    background: plan.current ? "#fff" : plan.name === "Starter" ? "#FFF8F0" : "#fff",
                    position: "relative",
                  }}>
                    {plan.badge && (
                      <div style={{ position: "absolute", top: -10, right: 16, background: C.orange, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif", letterSpacing: 1 }}>
                        {plan.badge}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>{plan.name}</span>
                        {plan.current && (
                          <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: C.textMid, letterSpacing: 1, fontFamily: "'Montserrat',sans-serif" }}>CURRENT</span>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {isObj && (price as any).yearly && (
                          <div style={{ fontSize: 18, fontWeight: 700, color: plan.color === C.border ? C.textMid : plan.color, fontFamily: "'Montserrat',sans-serif" }}>
                            {(price as any).yearly}
                          </div>
                        )}
                        <div style={{ fontSize: isObj && (price as any).yearly ? 12 : 18, fontWeight: 700, color: plan.color === C.border ? C.textMid : plan.color, fontFamily: "'Montserrat',sans-serif" }}>
                          {isObj ? (price as any).monthly : price as string}
                        </div>
                        {getSavings(plan) && (
                          <div style={{ fontSize: 10, color: C.orange, fontWeight: 600, fontFamily: "'Montserrat',sans-serif" }}>{getSavings(plan)}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      {plan.features.map(f => (
                        <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ color: plan.current ? C.muted : C.orange, fontSize: 12 }}>✓</span>
                          <span style={{ fontSize: 12, color: plan.current ? C.textMid : C.dark, fontFamily: "'Montserrat',sans-serif" }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={plan.ctaDisabled || isLoading || !!loadingPlan}
                      onClick={() => !plan.ctaDisabled && handleUpgrade(plan.planId as "starter" | "pro")}
                      style={{
                        width: "100%", padding: "10px",
                        background: plan.current ? "transparent" : (plan.ctaDisabled || !!loadingPlan) ? C.muted : plan.color,
                        border: `1.5px solid ${plan.current ? C.border : (plan.ctaDisabled || !!loadingPlan) ? C.muted : plan.color}`,
                        borderRadius: 10, fontSize: 13, fontWeight: 700,
                        color: plan.current ? C.textMid : "#fff",
                        cursor: (plan.ctaDisabled || !!loadingPlan) ? "not-allowed" : "pointer",
                        fontFamily: "'Montserrat',sans-serif",
                        opacity: plan.current ? 0.6 : 1,
                        transition: "background 0.15s",
                      }}
                    >
                      {isLoading ? "Processing…" : plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: C.muted, fontFamily: "'Montserrat',sans-serif", marginTop: 16, marginBottom: 0 }}>
              {isIndia ? "Payments powered by Razorpay" : "Payments powered by Lemon Squeezy"} · Questions? hello@getpagewise.app
            </p>
          </>
        )}

        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
      </div>
    </div>
  );
}
