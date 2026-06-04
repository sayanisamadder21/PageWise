export default function Privacy() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Georgia, serif', lineHeight: '1.8', color: '#333' }}>
      <h1 style={{ color: '#d97706', marginBottom: '30px' }}>Privacy Policy</h1>
      
      <h2>Data Protection</h2>
      <p><strong>Your PDFs are never stored on our servers.</strong> When you upload a document to PageWise, it is:</p>
      <ul>
        <li>Processed in real-time by our AI</li>
        <li>Sent directly to Google's Gemini API for analysis</li>
        <li>Deleted immediately after analysis completes</li>
        <li>Never saved to any database</li>
        <li>Never used for training or any other purpose</li>
      </ul>

      <h2>HIPAA Compliance</h2>
      <p>For users uploading medical documents (medical students, healthcare professionals):</p>
      <ul>
        <li>PageWise does not store Protected Health Information (PHI)</li>
        <li>All analysis is temporary and confidential</li>
        <li>No retention of medical data</li>
        <li><strong>Important:</strong> Verify compliance with your institution before uploading sensitive patient data</li>
      </ul>

      <h2>Legal Documents</h2>
      <p>For users uploading legal documents (lawyers, law students):</p>
      <ul>
        <li>Confidential documents are analyzed but never retained</li>
        <li>Analysis is between you and PageWise only</li>
        <li>No third-party access to your documents</li>
        <li><strong>Important:</strong> For highly sensitive cases, consult with your firm's data security policies</li>
      </ul>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Know what data we process (your PDFs)</li>
        <li>Request deletion (automatic after analysis)</li>
        <li>Opt-out of using PageWise at any time</li>
      </ul>

      <h2>Contact Us</h2>
      <p>Questions about privacy? Email us at <strong>privacy@pagewise.app</strong></p>
      
      <p style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>Last updated: June 2026</p>
    </div>
  );
}