import { useState } from "react";
import { toast } from "sonner";
import { FileCode2, Play, RotateCcw, Copy, Check } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { parseCobol } from "@/lib/api";
import { SAMPLE_COPYBOOK } from "@/lib/samples";

export default function Parser() {
    const [copybook, setCopybook] = useState(SAMPLE_COPYBOOK);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    async function handleParse() {
        if (copybook.trim().length < 20) {
            toast.error("Copybook is too short — paste a real copybook.");
            return;
        }
        setLoading(true);
        try {
            const data = await parseCobol(copybook);
            setResult(data);
            toast.success(`Parsed ${data.fields?.length || 0} fields`);
        } catch (e) {
            const msg = e?.response?.data?.detail || e.message;
            toast.error("Parse failed", { description: msg });
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setCopybook(SAMPLE_COPYBOOK);
        setResult(null);
    }

    async function copyResult() {
        if (!result) return;
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div data-testid="parser-page">
            <SectionHeader
                step="01"
                title="COBOL Parser"
                subtitle="Paste a COBOL copybook. OpenFrame extracts PIC clauses, data types, REDEFINES, COMP-3 usage, and record layouts into a structured schema you can map downstream."
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            data-testid="parser-reset-btn"
                            className="inline-flex items-center gap-2 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-zinc-50 font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-2.5 transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                            reset
                        </button>
                        <button
                            onClick={handleParse}
                            disabled={loading}
                            data-testid="parser-run-btn"
                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-mono text-[11px] uppercase tracking-[0.25em] px-4 py-2.5 transition-colors"
                        >
                            <Play className="h-3.5 w-3.5" strokeWidth={2} />
                            {loading ? "parsing…" : "run parser"}
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/10 border-b border-white/10">
                {/* EDITOR */}
                <div className="bg-black">
                    <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#09090B]">
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                            <FileCode2
                                className="h-3.5 w-3.5 text-emerald-400"
                                strokeWidth={1.5}
                            />
                            copybook.cpy
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                            {copybook.split("\n").length} lines · {copybook.length} chars
                        </div>
                    </div>
                    <textarea
                        value={copybook}
                        onChange={(e) => setCopybook(e.target.value)}
                        data-testid="parser-input"
                        spellCheck={false}
                        className="w-full h-[540px] bg-black text-emerald-200/90 font-mono text-[12.5px] leading-6 p-5 outline-none resize-none border-0 focus:ring-0 placeholder:text-zinc-700"
                        placeholder="       01  CUSTOMER-RECORD.&#10;           05  CUST-ID   PIC 9(8)."
                    />
                </div>

                {/* RESULT */}
                <div className="bg-black">
                    <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#09090B]">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                            parsed · schema
                        </div>
                        {result && (
                            <button
                                onClick={copyResult}
                                data-testid="parser-copy-btn"
                                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400 hover:text-emerald-400 transition-colors"
                            >
                                {copied ? (
                                    <Check className="h-3 w-3" strokeWidth={2} />
                                ) : (
                                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                                )}
                                {copied ? "copied" : "copy json"}
                            </button>
                        )}
                    </div>
                    <div className="h-[540px] overflow-auto">
                        {loading && <ParseLoading />}
                        {!loading && !result && <ParseEmpty />}
                        {!loading && result && <ParseResult data={result} />}
                    </div>
                </div>
            </div>

            {result && (
                <div className="px-6 md:px-10 py-8 border-b border-white/10 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
                    <InfoCell label="record" value={result.record_name} />
                    <InfoCell label="fields" value={result.fields?.length ?? 0} />
                    <InfoCell label="bytes" value={result.total_bytes ?? "—"} />
                    <InfoCell
                        label="status"
                        value="parsed"
                        accent
                    />
                </div>
            )}

            {result && (
                <div className="px-6 md:px-10 py-6 text-zinc-500 font-mono text-[11px] leading-relaxed">
                    <div className="text-emerald-400 mb-2">
                        <span className="text-zinc-600">//</span> next step
                    </div>
                    <p className="text-zinc-400 text-sm">
                        Your parsed schema is now cached in-session. Head to{" "}
                        <span className="text-emerald-300">/mapper</span> to map
                        these fields to a target warehouse.
                    </p>
                </div>
            )}
        </div>
    );
}

function InfoCell({ label, value, accent }) {
    return (
        <div className="bg-black px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                {label}
            </div>
            <div
                className={[
                    "heading-mono text-2xl tracking-tight mt-2 uppercase",
                    accent ? "text-emerald-400" : "text-zinc-50",
                ].join(" ")}
            >
                {value}
            </div>
        </div>
    );
}

function ParseLoading() {
    return (
        <div
            className="h-full grid place-items-center"
            data-testid="parser-loading"
        >
            <div className="text-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-emerald-400 mb-3">
                    parsing copybook<span className="caret" />
                </div>
                <div className="mx-auto h-1 w-56 bg-white/5 overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-pulse" style={{ width: "60%" }} />
                </div>
            </div>
        </div>
    );
}

function ParseEmpty() {
    return (
        <div
            className="h-full grid place-items-center px-8"
            data-testid="parser-empty"
        >
            <div className="max-w-sm text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-2">
                    awaiting input
                </div>
                <p className="text-zinc-500 font-mono text-[12px] leading-6">
                    Paste a COBOL copybook on the left and run the parser.
                </p>
            </div>
        </div>
    );
}

function ParseResult({ data }) {
    return (
        <div>
            <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-[#09090B] border-b border-white/10 sticky top-0 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                <div className="col-span-1">lvl</div>
                <div className="col-span-4">name</div>
                <div className="col-span-3">pic / usage</div>
                <div className="col-span-3">type</div>
                <div className="col-span-1 text-right">len</div>
            </div>
            {(data.fields || []).map((f, i) => (
                <div
                    key={`${f.name}-${i}`}
                    className="grid grid-cols-12 gap-2 px-5 py-2 border-b border-white/[0.05] last:border-b-0 font-mono text-[12px] hover:bg-emerald-500/[0.04]"
                    data-testid={`field-row-${i}`}
                >
                    <div className="col-span-1 text-zinc-500">
                        {f.level || "—"}
                    </div>
                    <div className="col-span-4 text-zinc-100 truncate">
                        {f.name}
                    </div>
                    <div className="col-span-3 text-amber-300/90 truncate">
                        {f.pic || f.usage || "—"}
                    </div>
                    <div className="col-span-3 text-emerald-300 uppercase">
                        {f.data_type}
                    </div>
                    <div className="col-span-1 text-right text-zinc-400">
                        {f.length ?? "—"}
                    </div>
                </div>
            ))}
            {data.notes && (
                <div className="px-5 py-4 text-[11px] text-zinc-500 font-mono">
                    <span className="text-emerald-400">// notes</span>
                    <div className="mt-1 text-zinc-400 leading-relaxed">
                        {data.notes}
                    </div>
                </div>
            )}
        </div>
    );
}
