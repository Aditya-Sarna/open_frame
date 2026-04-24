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

const TARGET_TYPES = {
    postgres: "Postgres 15 (use TEXT, VARCHAR(n), INTEGER, BIGINT, NUMERIC(p,s), DATE, TIMESTAMPTZ, BOOLEAN)",
    bigquery: "BigQuery (use STRING, INT64, NUMERIC, BIGNUMERIC, FLOAT64, DATE, TIMESTAMP, BOOL)",
    snowflake: "Snowflake (use VARCHAR, NUMBER(p,s), FLOAT, DATE, TIMESTAMP_NTZ, BOOLEAN)",
};

module.exports = async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { fields, target = "postgres", table_name } = req.body || {};
    if (!fields || !Array.isArray(fields)) {
        return res.status(400).json({ error: "Invalid input: fields array required" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

    const tableName = (table_name || "migrated_record").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const targetType = TARGET_TYPES[target] || TARGET_TYPES.postgres;

    try {
        const groq = new Groq({ apiKey });
        const system = `You are a data architect migrating COBOL/mainframe records to ${targetType}. Given a list of parsed fields, produce a STRICT JSON object: {"target": str, "table_name": str, "ddl": str, "mappings": [{"source_name": str, "source_type": str, "target_name": str, "target_type": str, "nullable": bool, "transform": str|null, "rationale": str|null}]}. Normalize source names to snake_case for target_name. Include a transform string when EBCDIC, COMP-3, sign, or date reformatting is needed. ddl must be a valid CREATE TABLE statement for the target. Return ONLY JSON.`;

        const payload = JSON.stringify({ target, table_name: tableName, fields });
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
        data.target = data.target || target;
        data.table_name = data.table_name || tableName;
        return res.status(200).json(data);
    } catch (err) {
        console.error("map-schema error:", err);
        return res.status(502).json({ error: err.message || "LLM call failed" });
    }
};
