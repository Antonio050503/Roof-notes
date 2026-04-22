import { useState, useEffect } from "react";

const SYSTEM_PROMPT = `You are an AI assistant for a roofing project manager. Your job is to analyze phone call transcripts and extract structured information.

Return ONLY a valid JSON object with this exact structure. Only include bullet points for information actually mentioned in the call. Skip empty categories entirely.

{
  "callSummary": ["bullet point 1", "bullet point 2"],
  "clientContact": ["bullet point 1"],
  "propertyJobDetails": ["bullet point 1"],
  "scopeOfWork": ["bullet point 1"],
  "estimatingFinance": ["bullet point 1"],
  "scheduling": ["bullet point 1"],
  "salesPipeline": ["bullet point 1"],
  "actionItems": ["bullet point 1"],
  "internalNotes": ["bullet point 1"],
  "personalConnection": ["bullet point 1"]
}

Categories:
- callSummary: Full bullet-pointed overview of everything discussed
- clientContact: Client name, phone, email, preferred contact method, best time to call
- propertyJobDetails: Address, property type, roof type, age/condition, sq footage, stories
- scopeOfWork: Type of work, damage description, materials, brand/color preferences, warranties
- estimatingFinance: Job value, budget, financing, insurance claim, insurance company, claim number, adjuster
- scheduling: Inspection date, estimate due date, project start, urgency level
- salesPipeline: Lead source, competing bids, decision timeline, likelihood to close
- actionItems: Follow-up tasks, who is responsible, due dates, documents to send
- internalNotes: Crew assignment, subcontractors, permits, HOA, access instructions
- personalConnection: Personal details, hobbies, family mentions, emotional tone, rapport notes

Return ONLY the JSON. No markdown, no explanation.`;

const CATEGORIES = [
  { key: "callSummary", label: "📞 Call Summary", color: "#00C9A7" },
  { key: "clientContact", label: "👤 Client & Contact Info", color: "#4FACFE" },
  { key: "propertyJobDetails", label: "🏠 Property & Job Details", color: "#F093FB" },
  { key: "scopeOfWork", label: "🔨 Scope of Work", color: "#FFA756" },
  { key: "estimatingFinance", label: "💰 Estimating & Finance", color: "#43E97B" },
  { key: "scheduling", label: "📅 Scheduling", color: "#FA709A" },
  { key: "salesPipeline", label: "📈 Sales & Pipeline", color: "#A18CD1" },
  { key: "actionItems", label: "✅ Action Items", color: "#F6D365" },
  { key: "internalNotes", label: "🔧 Internal Notes", color: "#89F7FE" },
  { key: "personalConnection", label: "🤝 Personal / Connection Comments", color: "#FD7043" },
];

const DEMO_TRANSCRIPT = `PM: Hey Mike, thanks for calling back. So tell me what's going on with the roof.

Mike: Yeah so we had that big storm last Tuesday and I've got a pretty bad leak coming in through the back bedroom. I went up and looked and there's definitely some shingles missing on the back slope.

PM: Oh no, that's not good. Is this a house you're living in or a rental?

Mike: No it's our primary home. We've been here about 8 years. The roof was on the house when we bought it so I'm not sure how old it is but it's definitely showing its age.

PM: Got it. What's the address out there?

Mike: 4521 Ridgewood Lane, it's over in the Maplewood subdivision.

PM: Perfect, I know that area well. And what's the best number and email to reach you?

Mike: Cell is 615-448-9021 and email is mike.johnson@gmail.com. Mornings before 10 are best, I'm in meetings most of the afternoon.

PM: Got it. Have you filed a claim with insurance yet?

Mike: Yeah we called State Farm yesterday. They said an adjuster is coming out next Friday. My neighbor Dave referred me to you guys - he said you helped him with his roof last spring and you were great.

PM: Oh awesome, Dave's a good guy. How's he doing? I remember he had that big oak tree situation.

Mike: Ha yeah he's doing great, just had his second kid actually. Anyway I was hoping you could get out before the adjuster so I know what I'm dealing with.

PM: Absolutely, we can do that. Can we come Thursday morning, say around 9?

Mike: Thursday at 9 works perfectly.

PM: Great. And just so I know - are you getting any other estimates or are you pretty set on going with us based on Dave's recommendation?

Mike: Honestly if the price is reasonable I'm ready to go. Dave spoke really highly of you guys. I just want to get this fixed before it gets worse, we've got a new baby at home and my wife is stressed about it.

PM: Totally understandable, we'll take care of you. It's a big deal when you've got a little one at home. Congratulations by the way!

Mike: Thanks! Yeah she's 3 months old, keeping us busy.

PM: I'll bring the estimate Thursday and we can walk through everything together. I'll also pull the permit info for your area ahead of time so we're ready to move fast once insurance approves.

Mike: That sounds great. Thanks so much.

PM: Of course Mike, see you Thursday at 9.`;

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

  function loadDemo() {
    setTranscript(DEMO_TRANSCRIPT);
    setActiveTab("input");
  }

  function formatNotesAsText() {
    if (!notes) return "";
    let out = `ROOFING CALL NOTES — ${callDate}\n${"=".repeat(50)}\n\n`;
    CATEGORIES.forEach(({ key, label }) => {
      const items = notes[key];
      if (items && items.length > 0) {
        out += `${label}\n${"-".repeat(label.length)}\n`;
        items.forEach((item) => (out += `• ${item}\n`));
        out += "\n";
      }
    });
    return out;
  }

  function copyNotes() {
    navigator.clipboard.writeText(formatNotesAsText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setTranscript("");
    setNotes(null);
    setError("");
    setActiveTab("input");
  }

  const hasNotes = notes && Object.values(notes).some((v) => v && v.length > 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0F1E",
      fontFamily: "'Georgia', serif",
      color: "#E8E8E8",
      padding: "0",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0D1B2A 0%, #1B2838 100%)",
        borderBottom: "1px solid #1E3A5F",
        padding: "24px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px", height: "42px",
            background: "linear-gradient(135deg, #00C9A7, #4FACFE)",
            borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
          }}>🏠</div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#FFFFFF" }}>RoofNotes AI</div>
            <div style={{ fontSize: "12px", color: "#6B8CAE", letterSpacing: "1px", textTransform: "uppercase" }}>Call Transcript Processor</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)}
            style={{ background: "#1A2740", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "8px 12px", color: "#A0B4C8", fontSize: "13px", fontFamily: "monospace" }} />
          <button onClick={loadDemo} style={{ background: "transparent", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "8px 16px", color: "#6B8CAE", fontSize: "13px", cursor: "pointer" }}>
            Load Demo
          </button>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #1E3A5F", background: "#0D1525", padding: "0 32px" }}>
        {["input", "notes"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "14px 24px", background: "transparent", border: "none",
            borderBottom: activeTab === tab ? "2px solid #00C9A7" : "2px solid transparent",
            color: activeTab === tab ? "#00C9A7" : "#6B8CAE",
            fontSize: "14px", cursor: "pointer", textTransform: "capitalize",
            fontFamily: "'Georgia', serif", letterSpacing: "0.5px", transition: "all 0.2s",
          }}>
            {tab === "input" ? "📋 Transcript" : "📝 Structured Notes"}
            {tab === "notes" && hasNotes && (
              <span style={{ marginLeft: "8px", background: "#00C9A7", color: "#0A0F1E", borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: "700" }}>NEW</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
        {activeTab === "input" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", color: "#6B8CAE", marginBottom: "8px" }}>Paste your call transcript below</div>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste transcript here..."
                style={{ width: "100%", minHeight: "380px", background: "#0D1525", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "20px", color: "#C8D8E8", fontSize: "14px", lineHeight: "1.7", resize: "vertical", fontFamily: "'Georgia', serif", boxSizing: "border-box", outline: "none" }} />
            </div>
            {error && <div style={{ background: "#2A1020", border: "1px solid #8B2040", borderRadius: "8px", padding: "12px 16px", color: "#FF6B8A", fontSize: "14px", marginBottom: "16px" }}>{error}</div>}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={processTranscript} disabled={loading} style={{ background: loading ? "#1A2740" : "linear-gradient(135deg, #00C9A7, #4FACFE)", border: "none", borderRadius: "10px", padding: "14px 32px", color: loading ? "#6B8CAE" : "#0A0F1E", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Georgia', serif" }}>
                {loading ? "⏳ Processing..." : "⚡ Generate Notes"}
              </button>
              {transcript && <button onClick={reset} style={{ background: "transparent", border: "1px solid #1E3A5F", borderRadius: "10px", padding: "14px 24px", color: "#6B8CAE", fontSize: "14px", cursor: "pointer", fontFamily: "'Georgia', serif" }}>Clear</button>}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div>
            {!hasNotes ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B8CAE" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <div style={{ fontSize: "16px", marginBottom: "8px" }}>No notes yet</div>
                <div style={{ fontSize: "13px" }}>Paste a transcript and click Generate Notes</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ color: "#6B8CAE", fontSize: "13px" }}>Call processed · {callDate}</div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={copyNotes} style={{ background: copied ? "#00C9A720" : "transparent", border: `1px solid ${copied ? "#00C9A7" : "#1E3A5F"}`, borderRadius: "8px", padding: "8px 16px", color: copied ? "#00C9A7" : "#6B8CAE", fontSize: "13px", cursor: "pointer", fontFamily: "'Georgia', serif", transition: "all 0.2s" }}>
                      {copied ? "✓ Copied!" : "Copy All Notes"}
                    </button>
                    <button onClick={() => setActiveTab("input")} style={{ background: "transparent", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "8px 16px", color: "#6B8CAE", fontSize: "13px​​​​​​​​​​​​​​​​
