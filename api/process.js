export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "No transcript provided" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are an AI assistant for a roofing project manager. Analyze phone call transcripts and extract structured information. Return ONLY a valid JSON object with these keys: callSummary, clientContact, propertyJobDetails, scopeOfWork, estimatingFinance, scheduling, salesPipeline, actionItems, internalNotes, personalConnection. Each key should be an array of bullet point strings. Only include keys that have actual information from the call. Return ONLY the JSON, no markdown, no explanation.`,
        messages: [{ role: "user", content: `Analyze this roofing call transcript:\n\n${transcript}` }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Failed to process transcript" });
  }
}
