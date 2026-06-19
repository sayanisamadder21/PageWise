import { useEffect, useState } from "react";
import { C } from "../AppNew";

const GEO_URL = "https://plain-firefly-95a9.sayanisamadder345.workers.dev/geo";

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: "pdfs" | "questions" | "exports";
}

const REASONS = {
  pdfs: "You've reached your free limit of 3 PDFs/day.",
  questions: "You've reached your free limit of 30 questions/day.",
  exports: "You've reached your free limit of 2 exports/day.",
};

export default function UpgradeModal({ visible, onClose, reason }: UpgradeModalProps) {
  const [isIndia, setIsIndia] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    fetch(GEO_URL)
      .then(r => r.json())
      .then(d => setIsIndia(d.country === "IN"))
      .catch(() => setIsIndia(false));
  }, []);

  if (!visible) return null;

  const plans = [
    {
      name: "Free",
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
      yearlyINR: 0,
      monthlyUSD: 0,
      yearlyUSD: 0,
      cta: "Current Plan",
      ctaDisabled: true,
    },
    {
      name: "Starter",
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
      monthlyINR: 199,
      yearlyINR: 1990,
      monthlyUSD: 6,
      yearlyUSD: 60,
      cta: "Coming Soon",
      ctaDisabled: true,
    },
    {
      name: "Pro",
      current: false,
      color: C.gold,
      badge: "ELITE",
      features: [
        "Unlimited everything",
        "All 8 modes + Custom mode",
        "Advanced citations",
        "Unlimited chat history",
        "Chat search",
        "Large document support",
        "Priority performance",
      ],
      monthlyINR: 499,
      yearlyINR: 4990,
      monthlyUSD: 12,
      yearlyUSD: 120,
      cta: "Coming Soon",
      ctaDisabled: true,
    },
  ];

  const getPrice = (plan: typeof plans[0]): { yearly: string | null; monthly: string } | string => {
    if (plan.monthlyINR === 0) return "Free";
    if (isIndia) {
      if (billing === "yearly") {
        return {
          yearly: `₹${plan.yearlyINR.toLocaleString("en-IN")}/yr`,
          monthly: `₹${Math.round(plan.yearlyINR / 12)}/mo`,
        };
      }
      return { yearly: null, monthly: `₹${plan.monthlyINR}/mo` };
    } else {
      if (billing === "yearly") {
        return {
          yearly: `$${plan.yearlyUSD}/yr`,
          monthly: `$${Math.round(plan.yearlyUSD / 12)}/mo`,
        };
      }
      return { yearly: null, monthly: `$${plan.monthlyUSD}/mo` };
    }
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.monthlyINR === 0) return null;
    return billing === "yearly" ? "2 months free" : null;
  };

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
          background: C.bg,
          borderRadius: 20,
          padding: "28px 24px",
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          border: `1px solid ${C.border}`,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚡</div>
          <h2 style={{
            color: C.dark, fontSize: 20, fontWeight: 700,
            fontFamily: "'Montserrat', sans-serif", margin: "0 0 6px",
          }}>Upgrade PageWise</h2>
          {reason && (
            <p style={{
              color: C.textMid, fontSize: 13,
              fontFamily: "'Montserrat', sans-serif", margin: 0,
            }}>{REASONS[reason]}</p>
          )}
        </div>

        {/* Billing Toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, marginBottom: 20,
        }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600, color: billing === "monthly" ? C.dark : C.muted,
              fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
            }}
            onClick={() => setBilling("monthly")}
          >Monthly</span>

          <div
            onClick={() => setBilling(billing === "yearly" ? "monthly" : "yearly")}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: billing === "yearly" ? C.orange : C.border,
              cursor: "pointer", position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              position: "absolute", top: 3,
              left: billing === "yearly" ? 23 : 3,
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff", transition: "left 0.2s",
            }} />
          </div>

          <span
            style={{
              fontSize: 12, fontWeight: 600, color: billing === "yearly" ? C.dark : C.muted,
              fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
            }}
            onClick={() => setBilling("yearly")}
          >
            Yearly
            <span style={{
              marginLeft: 6, background: C.orange, color: "#fff",
              fontSize: 9, fontWeight: 700, padding: "2px 6px",
              borderRadius: 10, fontFamily: "'Montserrat', sans-serif",
            }}>2 MONTHS FREE</span>
          </span>
        </div>

        {/* Plan Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plans.map(plan => {
            const price = getPrice(plan);
            const isObj = typeof price === "object";

            return (
              <div key={plan.name} style={{
                border: `2px solid ${plan.current ? C.border : plan.color}`,
                borderRadius: 14, padding: "16px 18px",
                background: plan.current ? "#fff" : plan.name === "Starter" ? "#FFF8F0" : "#fff",
                position: "relative",
              }}>
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -10, right: 16,
                    background: C.orange, color: "#fff",
                    fontSize: 9, fontWeight: 700, padding: "3px 10px",
                    borderRadius: 10, fontFamily: "'Montserrat', sans-serif",
                    letterSpacing: 1,
                  }}>{plan.badge}</div>
                )}

                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 10,
                }}>
                  <div>
                    <span style={{
                      fontSize: 15, fontWeight: 700, color: C.dark,
                      fontFamily: "'Montserrat', sans-serif",
                    }}>{plan.name}</span>
                    {plan.current && (
                      <span style={{
                        marginLeft: 8, fontSize: 9, fontWeight: 700,
                        color: C.textMid, letterSpacing: 1,
                        fontFamily: "'Montserrat', sans-serif",
                      }}>CURRENT</span>
                    )}
                  </div>

                  {/* Price Block */}
                  <div style={{ textAlign: "right" }}>
                    {isObj && (price as { yearly: string | null; monthly: string }).yearly && (
                      <div style={{
                        fontSize: 18, fontWeight: 700,
                        color: plan.color === C.border ? C.textMid : plan.color,
                        fontFamily: "'Montserrat', sans-serif",
                      }}>
                        {(price as { yearly: string | null; monthly: string }).yearly}
                      </div>
                    )}
                    <div style={{
                      fontSize: isObj && (price as { yearly: string | null; monthly: string }).yearly ? 12 : 18,
                      fontWeight: 700,
                      color: plan.color === C.border ? C.textMid : plan.color,
                      fontFamily: "'Montserrat', sans-serif",
                    }}>
                      {isObj
                        ? (price as { yearly: string | null; monthly: string }).monthly
                        : price as string}
                    </div>
                    {getSavings(plan) && (
                      <div style={{
                        fontSize: 10, color: C.orange, fontWeight: 600,
                        fontFamily: "'Montserrat', sans-serif",
                      }}>{getSavings(plan)}</div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: 14 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{
                      display: "flex", gap: 8, alignItems: "center",
                      marginBottom: 4,
                    }}>
                      <span style={{ color: plan.current ? C.muted : C.orange, fontSize: 12 }}>✓</span>
                      <span style={{
                        fontSize: 12, color: plan.current ? C.textMid : C.dark,
                        fontFamily: "'Montserrat', sans-serif",
                      }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  disabled={plan.ctaDisabled}
                  style={{
                    width: "100%", padding: "10px",
                    background: plan.current ? "transparent" : plan.ctaDisabled ? C.muted : plan.color,
                    border: `1.5px solid ${plan.current ? C.border : plan.ctaDisabled ? C.muted : plan.color}`,
                    borderRadius: 10, fontSize: 13, fontWeight: 700,
                    color: plan.current ? C.textMid : "#fff",
                    cursor: plan.ctaDisabled ? "not-allowed" : "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                    opacity: plan.current ? 0.6 : 1,
                  }}
                >{plan.cta}</button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p style={{
          textAlign: "center", fontSize: 11, color: C.muted,
          fontFamily: "'Montserrat', sans-serif", marginTop: 16, marginBottom: 0,
        }}>
          Payments launching soon · Questions? hello@getpagewise.app
        </p>

        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "transparent", border: "none",
          fontSize: 18, cursor: "pointer", color: C.muted,
        }}>✕</button>
      </div>
    </div>
  );
}