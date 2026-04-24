import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Waypoints, Check, CircleAlert, Loader2 } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import Terminal from "@/components/Terminal";
import { Switch } from "@/components/ui/switch";
import { runPipeline } from "@/lib/api";

const STAGE_ORDER = ["EXTRACT", "CONVERT", "TRANSFORM", "LOAD"];

export default function Pipeline() {
    const [source, setSource] = useState("CUSTOMERS.VSAM");
    const [tableName, setTableName] = useState("customer_record");
    const [target, setTarget] = useState("postgres");
    const [ebcdic, setEbcdic] = useState(true);
    const [packed, setPacked] = useState(true);
    const [normalize, setNormalize] = useState(true);
    const [rows, setRows] = useState(50000);

    const [running, setRunning] = useState(false);
    const [currentStage, setCurrentStage] = useState(null);
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [progress, setProgress] = useState(0);
    const cancelRef = useRef(false);

    useEffect(() => () => { cancelRef.current = true; }, []);

    async function handleRun() {
        setRunning(true);
        setLogs([{ text: `$ openframe run --source ${source} --target ${target}`, level: "info" }]);
        setResult(null);
        setProgress(0);
        cancelRef.current = false;

        try {
            const data = await runPipeline({
                source_file: source,
                target,
                table_name: tableName,
                ebcdic,
                packed_decimal: packed,
                normalize_fields: normalize,
                sample_rows: Number(rows) || 10000,
            });

            // Replay stage logs for a live effect
            for (let si = 0; si < data.stages.length; si++) {
                if (cancelRef.current) return;
                const stage = data.stages[si];
                setCurrentStage(stage.stage);
                setLogs((prev) => [
                    ...prev,
                    { text: `» [${stage.stage}] starting…`, level: "info" },
                ]);
                for (const line of stage.lines) {
                    await sleep(180);
                    if (cancelRef.current) return;
                    setLogs((prev) => [...prev, { text: line }]);
                }
                await sleep(120);
                setLogs((prev) => [
                    ...prev,
                    {
                        text: `» [${stage.stage}] ${stage.status} in ${stage.duration_ms} ms`,
                        level: stage.status === "warn" ? "warn" : "ok",
                    },
                ]);
                setProgress(((si + 1) / data.stages.length) * 100);
            }

            setLogs((prev) => [
                ...prev,
                {
                    text: `✓ migration complete · ${data.rows_ok.toLocaleString()} rows loaded · ${data.rows_failed} flagged`,
                    level: "ok",
                },
            ]);
            setResult(data);
            toast.success("Pipeline complete", {
                description: `${data.rows_ok.toLocaleString()} rows loaded into ${data.target}.${data.table_name}`,
            });
        } catch (e) {
            const msg = e?.response?.data?.detail || e.message;
            setLogs((prev) => [...prev, { text: `✗ pipeline failed: ${msg}`, level: "error" }]);
            toast.error("Pipeline failed", { description: msg });
        } finally {
            setRunning(false);
            setCurrentStage(null);
        }
    }

    return (
        <div data-testid="pipeline-page">
            <SectionHeader
                step="03"
                title="Migration Pipeline"
                subtitle="Configure EBCDIC conversion, packed-decimal handling, and field normalization. Run a simulated end-to-end migration and watch the live terminal."
                actions={
                    <button
                        onClick={handleRun}
                        disabled={running}
                        data-testid="pipeline-run-btn"
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-2.5 transition-colors"
                    >
                        {running ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                        ) : (
                            <Play className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                        {running ? "running…" : "run migration"}
                    </button>
                }
            />

            {/* Stepper */}
            <div className="px-6 md:px-10 py-6 border-b border-white/10 bg-[#050505]">
                <div className="grid grid-cols-4 gap-px bg-white/10 border border-white/10">
                    {STAGE_ORDER.map((stage, idx) => {
                        const done =
                            result &&
                            result.stages.findIndex((s) => s.stage === stage) > -1 &&
                            !running;
                        const active = running && currentStage === stage;
                        return (
                            <div
                                key={stage}
                                className={[
                                    "bg-black px-5 py-4 relative",
                                    active && "bg-emerald-500/5",
                                ].filter(Boolean).join(" ")}
                                data-testid={`stage-${stage.toLowerCase()}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                                        step · 0{idx + 1}
                                    </div>
                                    {done ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
                                    ) : active ? (
                                        <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" strokeWidth={2} />
                                    ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                                    )}
                                </div>
                                <div className="heading-mono text-lg tracking-tight text-zinc-50 uppercase">
                                    {stage}
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mt-1">
                                    {STAGE_HINTS[stage]}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Progress bar */}
                <div className="mt-4 h-[3px] bg-white/5 overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Config + Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-white/10 border-b border-white/10">
                {/* Config */}
                <div className="lg:col-span-2 bg-black p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-4">
                        // configuration
                    </div>

                    <ConfigInput
                        label="source dataset"
                        value={source}
                        onChange={setSource}
                        testid="cfg-source"
                    />
                    <ConfigInput
                        label="target table"
                        value={tableName}
                        onChange={setTableName}
                        testid="cfg-table"
                    />

                    <div className="mt-4 mb-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                            target warehouse
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {["postgres", "bigquery", "snowflake"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTarget(t)}
                                    data-testid={`cfg-target-${t}`}
                                    className={[
                                        "font-mono text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 transition-colors border",
                                        target === t
                                            ? "bg-emerald-500 text-black border-emerald-500"
                                            : "border-white/10 text-zinc-400 hover:border-white/30",
                                    ].join(" ")}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <ConfigInput
                        label="sample rows"
                        value={rows}
                        onChange={(v) => setRows(v)}
                        type="number"
                        testid="cfg-rows"
                    />

                    <div className="mt-6 border-t border-white/10 pt-6 space-y-4">
                        <Toggle
                            label="EBCDIC → UTF-8"
                            hint="decode IBM-1047"
                            value={ebcdic}
                            onChange={setEbcdic}
                            testid="cfg-ebcdic"
                        />
                        <Toggle
                            label="COMP-3 unpack"
                            hint="decode packed decimal"
                            value={packed}
                            onChange={setPacked}
                            testid="cfg-packed"
                        />
                        <Toggle
                            label="Field normalize"
                            hint="camelCase → snake_case · trim padding"
                            value={normalize}
                            onChange={setNormalize}
                            testid="cfg-normalize"
                        />
                    </div>
                </div>

                {/* Terminal */}
                <div className="lg:col-span-3 bg-black p-6">
                    <Terminal
                        title={`pipeline://${source} → ${target}.${tableName}`}
                        lines={logs}
                        running={running}
                        height="h-[520px]"
                    />
                    {result && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
                            <InfoCell label="rows processed" value={result.rows_processed.toLocaleString()} />
                            <InfoCell label="loaded" value={result.rows_ok.toLocaleString()} accent />
                            <InfoCell
                                label="flagged"
                                value={result.rows_failed}
                                warn={result.rows_failed > 0}
                            />
                            <InfoCell
                                label="throughput"
                                value={`${result.throughput_rows_per_sec.toLocaleString()}/s`}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const STAGE_HINTS = {
    EXTRACT: "read vsam / flat",
    CONVERT: "ebcdic · comp-3",
    TRANSFORM: "normalize · enrich",
    LOAD: "batch commit",
};

function Toggle({ label, hint, value, onChange, testid }) {
    return (
        <label
            className="flex items-center justify-between cursor-pointer"
            data-testid={testid}
        >
            <div>
                <div className="font-mono text-[12px] text-zinc-100">
                    {label}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">
                    {hint}
                </div>
            </div>
            <Switch
                checked={value}
                onCheckedChange={onChange}
                className="data-[state=checked]:bg-emerald-500"
            />
        </label>
    );
}

function ConfigInput({ label, value, onChange, type = "text", testid }) {
    return (
        <div className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-1.5">
                {label}
            </div>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
                data-testid={testid}
                className="w-full bg-black border border-white/10 focus:border-emerald-500 outline-none font-mono text-[13px] text-zinc-100 px-3 py-2 transition-colors"
            />
        </div>
    );
}

function InfoCell({ label, value, accent, warn }) {
    return (
        <div className="bg-black px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                {label}
            </div>
            <div
                className={[
                    "heading-mono text-xl tracking-tight mt-1",
                    accent ? "text-emerald-400" : warn ? "text-amber-400" : "text-zinc-50",
                ].join(" ")}
            >
                {value}
            </div>
        </div>
    );
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
