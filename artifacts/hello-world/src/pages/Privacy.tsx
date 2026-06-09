interface PrivacyProps {
  onBack?: () => void;
}

export default function Privacy({ onBack }: PrivacyProps) {
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Georgia, serif",
        lineHeight: "1.8",
        color: "#333",
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#d97706",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "24px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Back to PageWise
        </button>
      )}

      <h1 style={{ color: "#d97706", marginBottom: "30px" }}>
        Privacy Policy
      </h1>

      <h2>1. Introduction</h2>
      <p>
        This Privacy Policy explains how PageWise, operated by Saevora,
        handles information when you use the service.
      </p>

      <h2>2. Age Requirement</h2>
      <p>
        PageWise is intended for users aged 13 and above. Users under 18
        should use the service with parental awareness. By using this
        service, you confirm that you are at least 13 years old.
      </p>

      <h2>3. Information We Collect</h2>
      <ul>
        <li>Email address and authentication information (registered users only)</li>
        <li>Uploaded documents, processed solely to provide AI analysis</li>
        <li>Usage information necessary to provide the service</li>
        <li>Technical information required for security and performance</li>
        <li>
          Analytics data collected automatically via Google Analytics (GA4)
          and Vercel Analytics to understand usage patterns and improve the
          service
        </li>
      </ul>

      <h2>4. Free Tier Users</h2>
      <p>
        Free tier users' session data — including uploaded document content
        and chat history — is stored locally in their browser (localStorage)
        and is not transmitted to or stored on our servers beyond what is
        required for AI processing.
      </p>

      <h2>5. Document Processing</h2>
      <p>
        Documents uploaded to PageWise are processed solely for the purpose
        of providing AI-powered analysis and responses.
      </p>
      <p>
        We do not sell uploaded documents or use them for advertising
        purposes.
      </p>

      <h2>6. Third-Party Services</h2>
      <p>
        PageWise uses the following third-party services to operate:
      </p>
      <ul>
        <li>
          <strong>Google Gemini</strong> — processes document content to
          generate AI responses
        </li>
        <li>
          <strong>Supabase</strong> — provides authentication and database
          services for registered users
        </li>
        <li>
          <strong>Google Analytics (GA4)</strong> — collects anonymised
          usage data to help us understand how the service is used
        </li>
        <li>
          <strong>Vercel Analytics</strong> — collects performance and
          traffic data
        </li>
        <li>
          <strong>Cloudflare Workers</strong> — provides API proxying for
          security and performance
        </li>
      </ul>
      <p>
        Information submitted for analysis may be transmitted to these
        services solely to provide requested functionality.
      </p>

      <h2>7. Medical and Legal Documents</h2>
      <p>
        Users are responsible for ensuring they have the authority to upload
        documents for analysis.
      </p>
      <p>
        For highly sensitive medical, legal, financial, or confidential
        information, users should evaluate their own compliance requirements
        before using the service.
      </p>

      <h2>8. Data Retention</h2>
      <p>
        Data retention practices may vary depending on account settings,
        product features, and future service improvements.
      </p>
      <p>
        We retain information only as necessary to provide and improve the
        service, comply with legal obligations, and maintain security.
      </p>

      <h2>9. Security</h2>
      <p>
        We implement reasonable measures designed to protect user
        information. However, no method of transmission or storage can
        guarantee absolute security.
      </p>

      <h2>10. Your Rights</h2>
      <ul>
        <li>Stop using the service at any time</li>
        <li>Request information regarding your account data where applicable</li>
        <li>Contact us with privacy-related questions</li>
      </ul>
      <p>
        Users in the European Union may have additional rights under
        applicable data protection law. Contact us at{" "}
        <strong>privacy@pagewise.app</strong> for such requests.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        This Privacy Policy is governed by the laws of India. Any disputes
        arising under this policy shall be subject to the jurisdiction of
        courts in West Bengal, India.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Updated
        versions will be posted on this page.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions regarding this Privacy Policy may be directed to:
      </p>
      <p>
        <strong>privacy@pagewise.app</strong>
      </p>

      <p
        style={{
          marginTop: "40px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Last Updated: June 2026
      </p>
    </div>
  );
}