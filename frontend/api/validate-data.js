const Groq = require("groq-sdk");

function extractJson(text) {
    text = text.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) text = fence[1].trim();
    try { return JSON.parse(text); } catch {}
    for (const [open, close] of [["{", "}"], ["[", "]"]]) {
        const s = text.indexOf(open), e = text.lastIndexOf(close);
        if (s !== -1 && e > s) try { return JSON.parse(text.slice(s, e + 1)); } catch {}
    }
    throw new Error("LLM returned non-JSON output.");
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { table_name, sample_rows = [], rules } = req.body || {};
    if (!table_name) return res.status(400).json({ error: "Invalid input: table_name required" });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

    try {
        const groq = new Groq({ apiKey });
        const system = `You are a data-quality auditor for freshly migrated mainframe data. Given sample rows and optional rule hints, return STRICT JSON: {"quality_score": float (0-100), "total_rows": int, "passed_rules": int, "failed_rules": int, "reconciliation": {"source_rows": int, "target_rows": int, "drift_pct": float, "checksum_match": bool}, "issues": [{"severity": "critical"|"high"|"medium"|"low", "field": str|null, "row_index": int|null, "rule": str, "message": str}]}. Detect: null violations, type mismatches, out-of-range values, date-format drift, EBCDIC residue. Return ONLY JSON.`;

        const payload = JSON.stringify({
            table_name,
            rules: rules || ["primary key must be non-null and unique", "monetary amounts must be >= 0", "dates must be ISO-8601", "no EBCDIC residue"],
            sample_rows: sample_rows.slice(0, 50),
        });

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: system },
                { role: "user", content: payload },
            ],
            temperature: 0.1,
        });

        const raw = completion.choices[0].message.content;
        const data = extractJson(raw);
        return res.status(200).json(data);
    } catch (err) {
        console.error("validate-data error:", err);
        return res.status(502).json({ error: err.message || "LLM call failed" });
    }
};
