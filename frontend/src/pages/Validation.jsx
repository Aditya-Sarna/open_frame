import { useState } from "react";
import { toast } from "sonner";
import { Play, ShieldCheck, AlertTriangle, CircleCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import SectionHeader from "@/components/SectionHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { validateData } from "@/lib/api";
import { SAMPLE_ROWS } from "@/lib/samples";

const DEFAULT_RULES = [
    "primary key must be non-null and unique",
    "monetary amounts must be >= 0",
    "dates must be ISO-8601",
    "no EBCDIC residue in strings",
    "state codes must match ISO 3166-2",
];

export default function Validation() {
    const [tableName, setTableName] = useState("customer_record");
    const [rows, setRows] = useState(JSON.stringify(SAMPLE_ROWS, null, 2));
    const [rules, setRules] = useState(DEFAULT_RULES.join("\n"));
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);

    async function handleRun() {
        setLoading(true);
        try {
            const parsedRows = JSON.parse(rows);
            if (!Array.isArray(parsedRows)) throw new Error("Rows must be a JSON array.");
            const payload = {
                table_name: tableName,
                sample_rows: parsedRows,
                rules: rules
                    .split("\n")
                    .map((r) => r.trim())
                    .filter(Boolean),
            };
            const data = await validateData(payload);
            setReport(data);
            toast.success(`Quality score · ${data.quality_score}`);
        } catch (e) {
            const msg = e?.response?.data?.detail || e.message;
            toast.error("Validation failed", { description: msg });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div data-testid="validation-page">
            <SectionHeader
                step="04"
                title="Data Validation"
                subtitle="Audit migrated data with rule enforcement, anomaly detection, and reconciliation. OpenFrame returns a quality score, categorized issues, and a full audit trail."
                actions={
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        data-testid="validation-run-btn"
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-2.5 transition-colors"
                    >
                        <Play className="h-3.5 w-3.5" strokeWidth={2} />
                        {loading ? "validating…" : "run validation"}
                    </button>
                }
            />

            {/* Top: score + reconciliation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-white/10 border-b border-white/10">
                <div className="bg-black p-6 lg:col-span-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-4">
                        // quality score
                    </div>
                    <div className="relative h-56 grid place-items-center">
                        <ScoreGauge score={report?.quality_score ?? null} />
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                            <div className="text-center">
                                <div className="heading-mono text-5xl tracking-tighter text-zinc-50">
                                    {report?.quality_score?.toFixed(1) ?? "—"}
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500 mt-1">
                                    / 100
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-px bg-white/10 border border-white/10">
                        <MiniStat
                            label="passed"
                            value={report?.passed_rules ?? "—"}
                            accent
                        />
                        <MiniStat
                            label="failed"
                            value={report?.failed_rules ?? "—"}
                            warn={report?.failed_rules > 0}
                        />
                    </div>
                </div>

                <div className="bg-black p-6 lg:col-span-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-4">
                        // reconciliation
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
                        <ReconCell
                            label="source rows"
                            value={report?.reconciliation?.source_rows?.toLocaleString() ?? "—"}
                        />
                        <ReconCell
                            label="target rows"
                            value={report?.reconciliation?.target_rows?.toLocaleString() ?? "—"}
                        />
                        <ReconCell
                            label="drift"
                            value={
                                report?.reconciliation?.drift_pct !== undefined
                                    ? `${report.reconciliation.drift_pct.toFixed(2)}%`
                                    : "—"
                            }
                            warn={report?.reconciliation?.drift_pct > 1}
                        />
                        <ReconCell
                            label="checksum"
                            value={
                                report?.reconciliation?.checksum_match === undefined
                                    ? "—"
                                    : report.reconciliation.checksum_match
                                      ? "MATCH"
                                      : "DIVERGE"
                            }
                            accent={report?.reconciliation?.checksum_match}
                            warn={report?.reconciliation?.checksum_match === false}
                        />
                    </div>

                    <div className="mt-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                            audit log
                        </div>
                        <div className="border border-white/10 max-h-52 overflow-auto">
                            {(report?.issues || []).slice(0, 8).map((x, i) => (
                                <AuditRow key={i} i={i} issue={x} />
                            ))}
                            {(!report || (report?.issues || []).length === 0) && (
                                <div className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                                    <span className="text-emerald-500">▸</span>{" "}
                                    {report
                                        ? "no issues — clean audit."
                                        : "no audit yet."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 md:px-10 py-8 border-b border-white/10">
                <Tabs defaultValue="rules" className="w-full">
                    <TabsList className="bg-transparent border-b border-white/10 rounded-none p-0 h-auto w-full justify-start">
                        <TabsTrigger
                            value="rules"
                            data-testid="tab-rules"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-400 data-[state=active]:bg-transparent font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-3 text-zinc-400"
                        >
                            rules
                        </TabsTrigger>
                        <TabsTrigger
                            value="input"
                            data-testid="tab-input"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-400 data-[state=active]:bg-transparent font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-3 text-zinc-400"
                        >
                            sample rows
                        </TabsTrigger>
                        <TabsTrigger
                            value="anomalies"
                            data-testid="tab-anomalies"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-400 data-[state=active]:bg-transparent font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-3 text-zinc-400"
                        >
                            anomalies{" "}
                            {report?.issues?.length ? (
                                <span className="ml-2 text-amber-400">
                                    {report.issues.length}
                                </span>
                            ) : null}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="rules" className="mt-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                            table name
                        </div>
                        <input
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            data-testid="validation-tablename"
                            className="w-full max-w-sm bg-black border border-white/10 focus:border-emerald-500 outline-none font-mono text-[13px] text-zinc-100 px-3 py-2 mb-6"
                        />
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                            validation rules · one per line
                        </div>
                        <textarea
                            value={rules}
                            onChange={(e) => setRules(e.target.value)}
                            data-testid="validation-rules"
                            spellCheck={false}
                            className="w-full h-56 bg-black border border-white/10 focus:border-emerald-500 outline-none font-mono text-[12.5px] leading-6 text-emerald-200/90 p-4 resize-y"
                        />
                    </TabsContent>

                    <TabsContent value="input" className="mt-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                            sample rows · json array
                        </div>
                        <textarea
                            value={rows}
                            onChange={(e) => setRows(e.target.value)}
                            data-testid="validation-rows"
                            spellCheck={false}
                            className="w-full h-80 bg-black border border-white/10 focus:border-emerald-500 outline-none font-mono text-[12.5px] leading-6 text-emerald-200/90 p-4 resize-y"
                        />
                    </TabsContent>

                    <TabsContent value="anomalies" className="mt-6">
                        {!report ? (
                            <div className="border border-dashed border-white/10 p-10 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                                run validation to see anomalies
                            </div>
                        ) : report.issues.length === 0 ? (
                            <div className="border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
                                <CircleCheck
                                    className="h-6 w-6 text-emerald-400 mx-auto mb-3"
                                    strokeWidth={1.5}
                                />
                                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-400">
                                    clean audit · 0 anomalies
                                </div>
                            </div>
                        ) : (
                            <div className="border border-white/10">
                                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#09090B] border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                                    <div className="col-span-2">severity</div>
                                    <div className="col-span-2">field</div>
                                    <div className="col-span-1">row</div>
                                    <div className="col-span-3">rule</div>
                                    <div className="col-span-4">message</div>
                                </div>
                                {report.issues.map((x, i) => (
                                    <AnomalyRow key={i} i={i} issue={x} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function ScoreGauge({ score }) {
    const value = score ?? 0;
    const data = [
        { name: "q", value },
        { name: "r", value: 100 - value },
    ];
    const color =
        value >= 90
            ? "#10b981"
            : value >= 70
              ? "#f59e0b"
              : value > 0
                ? "#ef4444"
                : "#27272a";
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={80}
                    outerRadius={100}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive
                >
                    <Cell fill={color} />
                    <Cell fill="#18181b" />
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}

function MiniStat({ label, value, accent, warn }) {
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

function ReconCell({ label, value, accent, warn }) {
    return (
        <div className="bg-black px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                {label}
            </div>
            <div
                className={[
                    "heading-mono text-2xl tracking-tight mt-2",
                    accent ? "text-emerald-400" : warn ? "text-amber-400" : "text-zinc-50",
                ].join(" ")}
            >
                {value}
            </div>
        </div>
    );
}

const SEVERITY_STYLES = {
    critical: "text-red-400 border-red-500/30 bg-red-500/5",
    high: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    medium: "text-yellow-300 border-yellow-500/20 bg-yellow-500/5",
    low: "text-zinc-300 border-white/10 bg-white/[0.02]",
};

function AnomalyRow({ i, issue }) {
    const sev = issue.severity || "low";
    return (
        <div
            className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/[0.05] last:border-b-0 font-mono text-[12px] hover:bg-white/[0.02]"
            data-testid={`anomaly-row-${i}`}
        >
            <div className="col-span-2">
                <span
                    className={[
                        "inline-flex items-center gap-1 border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px]",
                        SEVERITY_STYLES[sev],
                    ].join(" ")}
                >
                    <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                    {sev}
                </span>
            </div>
            <div className="col-span-2 text-zinc-100 truncate">
                {issue.field || "—"}
            </div>
            <div className="col-span-1 text-zinc-500">
                {issue.row_index ?? "—"}
            </div>
            <div className="col-span-3 text-emerald-300 truncate">
                {issue.rule}
            </div>
            <div className="col-span-4 text-zinc-400">
                {issue.message}
            </div>
        </div>
    );
}

function AuditRow({ i, issue }) {
    const sev = issue.severity || "low";
    const color =
        sev === "critical"
            ? "text-red-400"
            : sev === "high"
              ? "text-amber-400"
              : sev === "medium"
                ? "text-yellow-300"
                : "text-zinc-400";
    return (
        <div
            className="px-4 py-2 border-b border-white/[0.05] last:border-b-0 font-mono text-[11px] grid grid-cols-12 gap-2"
            data-testid={`audit-row-${i}`}
        >
            <div className={`col-span-2 uppercase tracking-[0.2em] ${color}`}>
                {sev}
            </div>
            <div className="col-span-3 text-zinc-200 truncate">{issue.field || "—"}</div>
            <div className="col-span-7 text-zinc-500 truncate">
                {issue.message}
            </div>
        </div>
    );
}
