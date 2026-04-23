import { useState, useEffect } from "react";

const SYSTEM_PROMPT = "You are an AI assistant for a roofing project manager. Analyze phone call transcripts and extract structured information. Return ONLY a valid JSON object with these keys: callSummary, clientContact, propertyJobDetails, scopeOfWork, estimatingFinance, scheduling, salesPipeline, actionItems, internalNotes, personalConnection. Each key should be an array of bullet point strings. Only include keys that have actual information from the call. Return ONLY the JSON, no markdown, no explanation.";

const CATEGORIES = [
  { key: "callSummary", label: "Call Summary", color: "#00C9A7" },
  { key: "clientContact", label: "Client and Contact Info", color: "#4FACFE" },
  { key: "propertyJobDetails", label: "Property and Job Details", color: "#F093FB" },
  { key: "scopeOfWork", label: "Scope of Work", color: "#FFA756" },
  { key: "estimatingFinance", label: "Estimating and Finance", color: "#43E97B" },
  { key: "scheduling", label: "Scheduling", color: "#FA709A" },
  { key: "salesPipeline", label: "Sales and Pipeline", color: "#A18CD1" },
  { key: "actionItems", label: "Action Items", color: "#F6D365" },
  { key: "internalNotes", label: "Internal Notes", color: "#89F7FE" },
  { key: "personalConnection", label: "Personal and Connection Comments", color: "#FD7043" },
];

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const [callDate, setCallDate] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setCallDate(today);
  }, []);

  async function processTranscript() {
    if (!transcript.trim()) {
      setError("Please paste a transcript first.");
      return;
    }
    setError("");
    setLoading(true);
    setNotes(null);
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await response.json();
      setNotes(data);
      setActiveTab("notes");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyNotes() {
    if (!notes) return "";
    let out = "ROOFING CALL NOTES - " + callDate + "\n\n";
    CATEGORIES.forEach(function(cat) {
      const items = notes[cat.key];
      if (items && items.length > 0) {
        out += cat.label + "\n";
        items.forEach(function(item) { out += "- " + item + "\n"; });
        out += "\n";
      }
    });
    navigator.clipboard.writeText(out);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  function reset() {
    setTranscript("");
    setNotes(null);
    setError("");
    setActiveTab("input");
  }

  const hasNotes = notes && Object.values(notes).some(function(v) { return v && v.length > 0; });

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", fontFamily: "Georgia, serif", color: "#E8E8E8" }}>
      <div style={{ background: "#0D1B2A", borderBottom: "1px solid #1E3A5F", padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", background: "#00C9A7", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏠</div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#FFFFFF" }}>RoofNotes AI</div>
            <div style={{ fontSize: "12px", color: "#6B8CAE" }}>Call Transcript Processor</div>
          </div>
        </div>
        <input type="date" value={callDate} onChange={function(e) { setCallDate(e.target.value); }}
          style={{ background: "#1A2740", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "8px 12px", color: "#A0B4C8", fontSize: "13px" }} />
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #1E3A5F", background: "#0D1525", padding: "0 32px" }}>
        {["input", "notes"].map(function(tab) {
          return (
            <button key={tab} onClick={function() { setActiveTab(tab); }} style={{ padding: "14px 24px", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #00C9A7" : "2px solid transparent", color: activeTab === tab ? "#00C9A7" : "#6B8CAE", fontSize: "14px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {tab === "input" ? "Transcript" : "Structured Notes"}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
        {activeTab === "input" && (
          <div>
            <textarea value={transcript} onChange={function(e) { setTranscript(e.target.value); }}
              placeholder="Paste transcript here..."
              style={{ width: "100%", minHeight: "380px", background: "#0D1525", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "20px", color: "#C8D8E8", fontSize: "14px", lineHeight: "1.7", resize: "vertical", fontFamily: "Georgia, serif", boxSizing: "border-box", outline: "none" }} />
            {error && <div style={{ background: "#2A1020", border: "1px solid #8B2040", borderRadius: "8px", padding: "12px 16px", color: "#FF6B8A", fontSize: "14px", margin: "12px 0" }}>{error}</div>}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={processTranscript} disabled={loading} style={{ background: loading ? "#1A2740" : "#00C9A7", border: "none", borderRadius: "10px", padding: "14px 32px", color: loading ? "#6B8CAE" : "#0A0F1E", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Processing..." : "Generate Notes"}
              </button>
              {transcript && (
                <button onClick={reset} style={{ background: "transparent", border: "1px solid #1E3A5F", borderRadius: "10px", padding: "14px 24px", color: "#6B8CAE", fontSize: "14px", cursor: "pointer" }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div>
            {!hasNotes ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B8CAE" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <div>Paste a transcript and click Generate Notes</div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px", gap: "10px" }}>
                  <button onClick={copyNotes} style={{ background: "transparent", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "8px 16px", color: copied ? "#00C9A7" : "#6B8CAE", fontSize: "13px", cursor: "pointer" }}>
                    {copied ? "Copied!" : "Copy All Notes"}
                  </button>
                  <button onClick={function() { setActiveTab("input"); }} style={{ background: "transparent", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "8px 16px", color: "#6B8CAE", fontSize: "13px", cursor: "pointer" }}>
                    New Call
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {CATEGORIES.map(function(cat) {
                    const items = notes[cat.key];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={cat.key} style={{ background: "#0D1525", border: "1px solid #1E3A5F", borderLeft: "3px solid " + cat.color, borderRadius: "12px", padding: "20px 24px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: cat.color, textTransform: "uppercase", marginBottom: "14px" }}>{cat.label}</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {items.map(function(item, i) {
                            return (
                              <li key={i} style={{ display: "flex", gap: "10px", padding: "5px 0", fontSize: "14px", color: "#C8D8E8", borderBottom: i < items.length - 1 ? "1px solid #1A2740" : "none" }}>
                                <span style={{ color: cat.color }}>•</span>
                                <span>{item}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
