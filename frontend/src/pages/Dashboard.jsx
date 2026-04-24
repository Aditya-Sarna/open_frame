import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, Activity, CircleDashed } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { listRuns } from "@/lib/api";

const STATS = [
    { label: "Pipeline Stages", value: "04", hint: "extract · convert · transform · load" },
    { label: "Model Params", value: "70B", hint: "llama 3.3 70b" },
    { label: "COBOL Types", value: "32+", hint: "pic · comp · redefines · occurs" },
    { label: "Cloud Targets", value: "06", hint: "postgres · bigquery · snowflake …" },
];

const PIPELINE = [
    {
        step: "01",
        to: "/parser",
        title: "COBOL Parser",
        description:
            "Extract field definitions, data types, and record layouts from COBOL copybooks using AI-assisted parsing.",
        tags: ["PIC Clauses", "REDEFINES", "COMP-3"],
    },
    {
        step: "02",
        to: "/mapper",
        title: "Schema Mapper",
        description:
            "Intelligently map legacy mainframe schemas to modern relational or cloud data warehouse schemas.",
        tags: ["Postgres", "BigQuery", "Snowflake"],
    },
    {
        step: "03",
        to: "/pipeline",
        title: "Migration Pipeline",
        description:
            "Transform and migrate data with EBCDIC conversion, packed decimal handling, and field normalization.",
        tags: ["EBCDIC", "VSAM", "Flat Files"],
    },
    {
        step: "04",
        to: "/validation",
        title: "Data Validation",
        description:
            "Validate migrated data quality with automated rule enforcement, anomaly detection, and reconciliation.",
        tags: ["Quality Score", "Reconciliation", "Audit"],
    },
];

const TICKER = [
    "EBCDIC→UTF-8 OK",
    "VSAM EXTENT 3 MOUNTED",
    "COMP-3 DECODER v4.2",
    "LOAD BATCH #812 / 2.4M ROWS",
    "WAREHOUSE · SNOWFLAKE-EAST",
    "QUALITY SCORE · 98.7",
    "LLAMA → CLAUDE ROUTE ACTIVE",
    "REDEFINES RESOLVED · 142",
];

export default function Dashboard() {
    const [runs, setRuns] = useState([]);

    useEffect(() => {
        listRuns(5).then(setRuns).catch(() => setRuns([]));
    }, []);

    return (
        <div className="bg-black text-zinc-100" data-testid="dashboard-page">
            {/* HERO */}
            <section className="relative border-b border-white/10 overflow-hidden">
                <div className="absolute inset-0 grid-texture opacity-60" aria-hidden />
                <div
                    className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-30"
                    style={{ background: "radial-gradient(closest-side, #10b981, transparent)" }}
                    aria-hidden
                />
                <div className="relative px-6 md:px-10 pt-14 pb-20 max-w-6xl">
                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-6">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        ai-powered framework · v2026.12
                    </div>
                    <h1 className="heading-mono text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] tracking-tighter uppercase font-medium text-zinc-50 leading-[0.95]">
                        Mainframe
                        <br />
                        <span className="text-zinc-500">data</span> modernization
                        <span className="text-emerald-400">.</span>
                    </h1>
                    <p className="mt-8 max-w-2xl text-zinc-400 text-[15px] md:text-base leading-relaxed">
                        A four-stage, AI-driven framework that guides enterprises
                        through understanding legacy mainframe structures, mapping
                        datasets to modern cloud platforms, and applying deterministic
                        methods for data transfer, quality checks, and validation.
                    </p>

                    <div className="mt-10 flex flex-wrap gap-3">
                        <Link
                            to="/parser"
                            data-testid="hero-launch-btn"
                            className="group inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs uppercase tracking-[0.25em] px-5 py-3 transition-colors"
                        >
                            launch parser
                            <ArrowUpRight
                                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                strokeWidth={2}
                            />
                        </Link>
                        <Link
                            to="/pipeline"
                            data-testid="hero-pipeline-btn"
                            className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-zinc-300 hover:text-zinc-50 font-mono text-xs uppercase tracking-[0.25em] px-5 py-3 transition-colors"
                        >
                            view pipeline
                        </Link>
                    </div>
                </div>

                {/* Ticker strip */}
                <div className="relative border-t border-white/10 bg-black/60 backdrop-blur-sm overflow-hidden">
                    <div className="flex marquee-track w-max whitespace-nowrap py-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
                            <span
                                key={i}
                                className="flex items-center gap-3 px-5 border-r border-white/5"
                            >
                                <span className="text-emerald-500">▸</span> {t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* STATS */}
            <section className="border-b border-white/10">
                <div className="grid grid-cols-2 md:grid-cols-4">
                    {STATS.map((s, i) => (
                        <div
                            key={s.label}
                            className={[
                                "px-6 md:px-8 py-8 border-white/10 hover:bg-white/[0.015] transition-colors",
                                i !== 3 ? "md:border-r" : "",
                                i < 2 ? "border-b md:border-b-0" : "",
                                i === 0 ? "border-r" : "",
                                i === 2 ? "border-r" : "",
                            ].join(" ")}
                            data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                                {s.label}
                            </div>
                            <div className="heading-mono text-4xl md:text-5xl mt-3 tracking-tighter text-zinc-50">
                                {s.value}
                            </div>
                            <div className="mt-3 font-mono text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
                                {s.hint}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PIPELINE CARDS */}
            <section className="px-6 md:px-10 py-14">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-500 mb-2">
                            // modernization pipeline
                        </div>
                        <h2 className="heading-mono text-3xl md:text-4xl tracking-tight text-zinc-50 uppercase">
                            Four stages. One framework.
                        </h2>
                    </div>
                    <div className="hidden md:block font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                        flow →
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
                    {PIPELINE.map((p) => (
                        <Link
                            key={p.step}
                            to={p.to}
                            data-testid={`pipeline-card-${p.step}`}
                            className="group relative bg-black p-6 md:p-8 hover:bg-[#080808] transition-colors"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80">
                                    stage · {p.step}
                                </div>
                                <ArrowUpRight
                                    className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 transition-colors"
                                    strokeWidth={1.5}
                                />
                            </div>
                            <h3 className="heading-mono text-2xl md:text-3xl tracking-tight text-zinc-50 uppercase mb-4">
                                {p.title}
                            </h3>
                            <p className="text-zinc-400 leading-relaxed mb-6 max-w-lg">
                                {p.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {p.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 border border-white/10 text-zinc-400"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* RECENT RUNS + AI ARCHITECTURE */}
            <section className="grid grid-cols-1 lg:grid-cols-3 border-t border-white/10">
                <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-white/10 p-6 md:p-10">
                    <div className="flex items-end justify-between mb-6">
                        <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-500 mb-2">
                                // recent runs
                            </div>
                            <h2 className="heading-mono text-2xl tracking-tight text-zinc-50 uppercase">
                                Activity log
                            </h2>
                        </div>
                        <Activity
                            className="h-4 w-4 text-emerald-400"
                            strokeWidth={1.5}
                        />
                    </div>

                    {runs.length === 0 ? (
                        <div
                            className="border border-dashed border-white/10 p-10 text-center"
                            data-testid="runs-empty"
                        >
                            <CircleDashed
                                className="h-6 w-6 mx-auto text-zinc-600 mb-3"
                                strokeWidth={1.5}
                            />
                            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                                no runs yet — launch a migration pipeline
                            </p>
                        </div>
                    ) : (
                        <div className="border border-white/10">
                            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#09090B] border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                                <div className="col-span-4">source</div>
                                <div className="col-span-2">target</div>
                                <div className="col-span-2">rows</div>
                                <div className="col-span-2">failed</div>
                                <div className="col-span-2 text-right">when</div>
                            </div>
                            {runs.map((r, i) => (
                                <div
                                    key={r.id || i}
                                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/[0.05] last:border-b-0 font-mono text-[12px] text-zinc-300 hover:bg-white/[0.02]"
                                >
                                    <div className="col-span-4 truncate">
                                        <span className="text-emerald-400">▸</span>{" "}
                                        {r.source_file}
                                    </div>
                                    <div className="col-span-2 text-zinc-400 uppercase">
                                        {r.target}
                                    </div>
                                    <div className="col-span-2 text-zinc-300">
                                        {(r.rows_processed || 0).toLocaleString()}
                                    </div>
                                    <div
                                        className={[
                                            "col-span-2",
                                            r.rows_failed > 0
                                                ? "text-amber-400"
                                                : "text-emerald-400",
                                        ].join(" ")}
                                    >
                                        {r.rows_failed || 0}
                                    </div>
                                    <div className="col-span-2 text-right text-zinc-500 text-[11px] truncate">
                                        {(r.finished_at || "").slice(11, 19) || "—"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 md:p-10 relative">
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-2">
                        // ai architecture
                    </div>
                    <h2 className="heading-mono text-2xl tracking-tight text-zinc-50 uppercase mb-4">
                        Structured · Deterministic · Auditable.
                    </h2>
                    <p className="text-zinc-400 leading-relaxed text-sm mb-6">
                        OpenFrame uses large reasoning models to automate schema
                        extraction, type mapping, and data quality analysis — the
                        most labor-intensive aspects of mainframe modernization —
                        while keeping the load path deterministic and auditable.
                    </p>
                    <div className="grid grid-cols-1 gap-0 border border-white/10 font-mono text-[11px]">
                        {[
                            ["model", "llama-3.3-70b-versatile"],
                            ["provider", "groq"],
                            ["context", "128k tokens"],
                            ["latency p95", "< 1.0s"],
                        ].map(([k, v], i, arr) => (
                            <div
                                key={k}
                                className={[
                                    "grid grid-cols-2",
                                    i !== arr.length - 1 ? "border-b border-white/10" : "",
                                ].join(" ")}
                            >
                                <div className="px-3 py-2 bg-[#09090B] text-zinc-500 uppercase tracking-[0.2em] text-[10px] border-r border-white/10">
                                    {k}
                                </div>
                                <div className="px-3 py-2 text-emerald-300">{v}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <Badge
                            variant="outline"
                            className="font-mono text-[10px] uppercase tracking-[0.25em] border-emerald-500/40 text-emerald-300 bg-emerald-500/5 rounded-none"
                        >
                            production
                        </Badge>
                        <Badge
                            variant="outline"
                            className="font-mono text-[10px] uppercase tracking-[0.25em] border-white/10 text-zinc-400 rounded-none"
                        >
                            SOC2 · type II
                        </Badge>
                    </div>
                </div>
            </section>
        </div>
    );
}
