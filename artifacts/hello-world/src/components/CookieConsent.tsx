import { useState, useEffect } from "react";

const GA_ID = "G-K851PWWHZ4";

function loadGA() {
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`;
  document.head.appendChild(s2);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (consent === "accepted") {
      loadGA();
    } else if (!consent) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem("cookie_consent", "accepted");
    loadGA();
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  }

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      zIndex: 99999,
      background: "#ffffff",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.10)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "8px 16px",
      padding: "12px 20px",
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.5, flex: "1 1 auto" }}>
        We use cookies to analyse traffic and improve your experience. See our{" "}
        <a href="/privacy" style={{ color: "#F97316", fontWeight: 600, textDecoration: "underline" }}>
          Privacy Policy
        </a>.
      </p>
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <button onClick={handleDecline} style={{
          background: "transparent",
          border: "1px solid #ddd",
          borderRadius: 6, padding: "6px 16px",
          fontSize: 12, fontWeight: 600, color: "#666",
          cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
        }}>
          Decline
        </button>
        <button onClick={handleAccept} style={{
          background: "#F97316", border: "none",
          borderRadius: 6, padding: "6px 16px",
          fontSize: 12, fontWeight: 700, color: "#ffffff",
          cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
        }}>
          Accept
        </button>
      </div>
    </div>
  );
}
