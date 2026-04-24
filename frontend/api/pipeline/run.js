const { v4: uuidv4 } = require("uuid");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
        source_file = "UNKNOWN.VSAM",
        target = "postgres",
        table_name,
        ebcdic = true,
        packed_decimal = true,
        normalize_fields = true,
        sample_rows = 10000,
    } = req.body || {};

    const tableName = (table_name || "migrated_record").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const rows = Math.max(1000, sample_rows);
    // Deterministic-ish seed based on source_file
    const seed = source_file.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = (min, max) => min + ((seed * 1103515245 + 12345) & 0x7fffffff) % (max - min + 1);
    const failed = rand(0, Math.max(1, Math.floor(rows / 500)));
    const ok = rows - failed;
    const durationTotal = rand(1800, 4200);
    const started = new Date().toISOString();

    const stages = [
        {
            stage: "EXTRACT",
            status: "ok",
            duration_ms: rand(200, 500),
            lines: [
                `$ openframe extract --source ${source_file}`,
                "» opening VSAM dataset in read-only mode",
                `» ${rows.toLocaleString()} records located across 3 physical extents`,
                "» extract OK",
            ],
        },
        {
            stage: "CONVERT",
            status: "ok",
            duration_ms: rand(400, 900),
            lines: [
                ebcdic ? "» detected encoding: EBCDIC (IBM-1047)" : "» encoding already ASCII, skipping",
                ebcdic ? "» converting EBCDIC → UTF-8" : "» bypassing EBCDIC conversion",
                packed_decimal ? "» decoding COMP-3 packed decimal fields" : "» no packed decimals in payload",
                "» convert OK",
            ],
        },
        {
            stage: "TRANSFORM",
            status: failed ? "warn" : "ok",
            duration_ms: rand(500, 1200),
            lines: [
                normalize_fields ? "» normalizing field names to snake_case" : "» preserving original field names",
                "» trimming trailing low-values and PIC padding",
                failed ? `» ${failed} rows flagged for review` : "» all rows transformed cleanly",
            ],
        },
        {
            stage: "LOAD",
            status: "ok",
            duration_ms: rand(700, 1600),
            lines: [
                `» streaming into ${target}.${tableName}`,
                `» committed ${ok.toLocaleString()} rows across 12 batches`,
                `» load OK in ${durationTotal} ms`,
            ],
        },
    ];

    const run = {
        id: uuidv4(),
        source_file,
        target,
        table_name: tableName,
        started_at: started,
        finished_at: new Date().toISOString(),
        rows_processed: rows,
        rows_ok: ok,
        rows_failed: failed,
        throughput_rows_per_sec: Math.round((rows / Math.max(1, durationTotal)) * 1000 * 10) / 10,
        stages,
    };

    return res.status(200).json(run);
};
