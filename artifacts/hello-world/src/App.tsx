function HelloWorld() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      fontFamily: "sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Hello, World!
        </h1>
        <p style={{ marginTop: "1rem", fontSize: "1.125rem", color: "#64748b" }}>
          Your React + Vite app is up and running.
        </p>
      </div>
    </div>
  );
}

export default HelloWorld;
