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

    const { copybook } = req.body || {};
    if (!copybook || typeof copybook !== "string" || copybook.trim().length < 4) {
        return res.status(400).json({ error: "Invalid input: copybook required" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

    try {
        const groq = new Groq({ apiKey });
        const system = `You are an expert COBOL copybook parser. Given a copybook, return a STRICT JSON object with this schema: {"record_name": str, "total_bytes": int, "notes": str|null, "fields": [{"level": str, "name": str, "pic": str|null, "data_type": str, "length": int|null, "usage": str|null, "redefines": str|null, "description": str|null}]}. data_type must be one of: alphanumeric, numeric, decimal, signed, comp-3, comp, binary, date, group. Compute length in bytes for PIC clauses. Return ONLY JSON, no prose.`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: system },
                { role: "user", content: `Parse this COBOL copybook:\n\n${copybook}` },
            ],
            temperature: 0.1,
        });

        const raw = completion.choices[0].message.content;
        const data = extractJson(raw);
        return res.status(200).json(data);
    } catch (err) {
        console.error("parse-cobol error:", err);
        return res.status(502).json({ error: err.message || "LLM call failed" });
    }
};
