import { useState } from "react";
import { toast } from "sonner";
import { GitCompareArrows, Database, Play, ArrowRight, Copy, Check } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { parseCobol, mapSchema } from "@/lib/api";
import { SAMPLE_COPYBOOK } from "@/lib/samples";

const TARGETS = [
    { id: "postgres", label: "Postgres", hint: "pg 15 · relational · oss" },
    { id: "bigquery", label: "BigQuery", hint: "serverless · columnar · google" },
    { id: "snowflake", label: "Snowflake", hint: "warehouse · cloud · multi-cluster" },
];

export default function Mapper() {
    const [copybook, setCopybook] = useState(SAMPLE_COPYBOOK);
    const [target, setTarget] = useState("postgres");
    const [tableName, setTableName] = useState("customer_record");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    async function handleMap() {
        setLoading(true);
        try {
            const parsed = await parseCobol(copybook);
            const mapped = await mapSchema(parsed.fields, target, tableName);
            setResult({ parsed, mapped });
            toast.success(`Mapped ${mapped.mappings?.length || 0} fields → ${target}`);
        } catch (e) {
            const msg = e?.response?.data?.detail || e.message;
            toast.error("Mapping failed", { description: msg });
        } finally {
            setLoading(false);
        }
    }

    async function copyDDL() {
        if (!result?.mapped?.ddl) return;
        await navigator.clipboard.writeText(result.mapped.ddl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div data-testid="mapper-page">
            <SectionHeader
                step="02"
                title="Schema Mapper"
                subtitle="Map parsed COBOL fields to a target cloud warehouse. OpenFrame suggests normalized column names, target types, nullability, and transform steps — then emits ready-to-run DDL."
            />

            {/* Config bar */}
            <div className="px-6 md:px-10 py-6 border-b border-white/10 bg-[#050505]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
                    <div className="bg-black p-5">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3">
                            target warehouse
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TARGETS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTarget(t.id)}
                                    data-testid={`target-${t.id}`}
                                    className={[
                                        "font-mono text-[11px] uppercase tracking-[0.2em] px-3 py-2 transition-colors border",
                                        target === t.id
                                            ? "bg-emerald-500 text-black border-emerald-500"
                                            : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-100",
                                    ].join(" ")}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                            {TARGETS.find((t) => t.id === target)?.hint}
                        </div>
                    </div>

                    <div className="bg-black p-5">
                        <label
                            htmlFor="tbl"
                            className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 block mb-3"
                        >
                            target table name
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] text-zinc-600">
                                {target}.public.
                            </span>
                            <input
                                id="tbl"
                                value={tableName}
                                onChange={(e) => setTableName(e.target.value)}
                                data-testid="mapper-tablename"
                                className="bg-transparent border-b border-white/20 focus:border-emerald-500 outline-none font-mono text-[13px] text-zinc-100 flex-1 py-1"
                            />
                        </div>
                    </div>

                    <div className="bg-black p-5 flex items-center justify-between">
                        <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-1">
                                action
                            </div>
                            <div className="font-mono text-[11px] text-zinc-400 uppercase tracking-[0.2em]">
                                parse → map → generate ddl
                            </div>
                        </div>
                        <button
                            onClick={handleMap}
                            disabled={loading}
                            data-testid="mapper-run-btn"
                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-2.5 transition-colors"
                        >
                            <Play className="h-3.5 w-3.5" strokeWidth={2} />
                            {loading ? "mapping…" : "run mapping"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/10 border-b border-white/10">
                <div className="bg-black">
                    <PaneHeader icon={GitCompareArrows} label="source · cobol" />
                    <textarea
                        value={copybook}
                        onChange={(e) => setCopybook(e.target.value)}
                        data-testid="mapper-copybook"
                        spellCheck={false}
                        className="w-full h-[420px] bg-black text-emerald-200/90 font-mono text-[12.5px] leading-6 p-5 outline-none resize-none border-0"
                    />
                </div>
                <div className="bg-black">
                    <PaneHeader
                        icon={Database}
                        label={`target · ${target}`}
                        right={
                            result?.mapped?.ddl && (
                                <button
                                    onClick={copyDDL}
                                    data-testid="mapper-copy-ddl"
                                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400 hover:text-emerald-400"
                                >
                                    {copied ? (
                                        <Check className="h-3 w-3" strokeWidth={2} />
                                    ) : (
                                        <Copy className="h-3 w-3" strokeWidth={1.5} />
                                    )}
                                    {copied ? "copied" : "copy ddl"}
                                </button>
                            )
                        }
                    />
                    <div className="h-[420px] overflow-auto">
                        {loading && (
                            <div
                                className="h-full grid place-items-center"
                                data-testid="mapper-loading"
                            >
                                <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-emerald-400">
                                    generating mappings<span className="caret" />
                                </div>
                            </div>
                        )}
                        {!loading && !result && (
                            <div
                                className="h-full grid place-items-center px-8"
                                data-testid="mapper-empty"
                            >
                                <div className="text-center max-w-sm">
                                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-2">
                                        awaiting mapping
                                    </div>
                                    <p className="text-zinc-500 font-mono text-[12px] leading-6">
                                        Run the mapper to generate a target schema and DDL.
                                    </p>
                                </div>
                            </div>
                        )}
                        {!loading && result?.mapped?.ddl && (
                            <pre className="p-5 font-mono text-[12.5px] leading-6 text-emerald-200/90 whitespace-pre overflow-auto">
                                <code>{highlightSQL(result.mapped.ddl)}</code>
                            </pre>
                        )}
                    </div>
                </div>
            </div>

            {/* Field mapping diff */}
            {result?.mapped?.mappings && (
                <div className="px-6 md:px-10 py-10 border-b border-white/10">
                    <div className="flex items-end justify-between mb-6">
                        <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-2">
                                // field mappings
                            </div>
                            <h2 className="heading-mono text-2xl tracking-tight text-zinc-50 uppercase">
                                {result.mapped.mappings.length} fields · mapped
                            </h2>
                        </div>
                    </div>

                    <div className="border border-white/10">
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[#09090B] border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            <div className="col-span-4">source</div>
                            <div className="col-span-1" />
                            <div className="col-span-4">target</div>
                            <div className="col-span-3">transform</div>
                        </div>
                        {result.mapped.mappings.map((m, i) => (
                            <div
                                key={`${m.source_name}-${i}`}
                                className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/[0.05] last:border-b-0 font-mono text-[12px] hover:bg-emerald-500/[0.04]"
                                data-testid={`mapping-row-${i}`}
                            >
                                <div className="col-span-4">
                                    <div className="text-zinc-100">
                                        {m.source_name}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">
                                        {m.source_type}
                                    </div>
                                </div>
                                <div className="col-span-1 flex items-center justify-center text-emerald-400">
                                    <ArrowRight
                                        className="h-3.5 w-3.5"
                                        strokeWidth={2}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <div className="text-emerald-300">
                                        {m.target_name}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">
                                        {m.target_type}
                                        {m.nullable === false && " · NOT NULL"}
                                    </div>
                                </div>
                                <div className="col-span-3 text-zinc-400 text-[11px] leading-5">
                                    {m.transform || "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PaneHeader({ icon: Icon, label, right }) {
    return (
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#09090B]">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                <Icon
                    className="h-3.5 w-3.5 text-emerald-400"
                    strokeWidth={1.5}
                />
                {label}
            </div>
            {right}
        </div>
    );
}

function highlightSQL(sql) {
    // simple keyword highlight as React array
    const kws = /\b(CREATE|TABLE|IF NOT EXISTS|PRIMARY KEY|NOT NULL|NULL|VARCHAR|TEXT|INTEGER|BIGINT|NUMERIC|DATE|TIMESTAMPTZ|BOOLEAN|STRING|INT64|FLOAT64|BIGNUMERIC|TIMESTAMP|BOOL|NUMBER|FLOAT|TIMESTAMP_NTZ|DEFAULT|REFERENCES)\b/gi;
    const parts = [];
    let last = 0;
    let match;
    let i = 0;
    while ((match = kws.exec(sql))) {
        if (match.index > last) {
            parts.push(
                <span key={`t-${i++}`}>{sql.slice(last, match.index)}</span>
            );
        }
        parts.push(
            <span key={`k-${i++}`} className="text-pink-400">
                {match[0]}
            </span>
        );
        last = match.index + match[0].length;
    }
    if (last < sql.length) parts.push(<span key={`t-${i++}`}>{sql.slice(last)}</span>);
    return parts;
}
