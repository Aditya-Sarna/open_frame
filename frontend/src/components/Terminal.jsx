import { useEffect, useRef } from "react";

/**
 * Terminal — retro phosphor-green log viewer.
 * Props:
 *   title: string
 *   lines: Array<string | { text: string, level?: 'info'|'warn'|'error'|'ok' }>
 *   running: boolean (shows blinking caret at the end)
 *   height: css height e.g. "h-96"
 */
export default function Terminal({
    title = "openframe // console",
    lines = [],
    running = false,
    height = "h-96",
}) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [lines.length, running]);

    return (
        <div
            className="border border-white/10 bg-black relative scanlines"
            data-testid="terminal"
        >
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0A0A0A]">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-red-500/70" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                    <span className="ml-3 text-zinc-400">{title}</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                    tty/0 · utf-8
                </div>
            </div>

            {/* Body */}
            <div
                ref={ref}
                className={[
                    "font-mono text-[12.5px] leading-6 text-emerald-300/90 p-4 overflow-auto",
                    height,
                ].join(" ")}
            >
                {lines.length === 0 && (
                    <div className="text-zinc-600">
                        <span className="text-emerald-500">$</span> waiting for
                        input<span className="caret" />
                    </div>
                )}
                {lines.map((raw, i) => {
                    const line = typeof raw === "string" ? { text: raw } : raw;
                    const color =
                        line.level === "warn"
                            ? "text-amber-300"
                            : line.level === "error"
                              ? "text-red-400"
                              : line.level === "ok"
                                ? "text-emerald-400"
                                : line.text?.startsWith("$")
                                  ? "text-emerald-500"
                                  : "text-emerald-300/80";
                    return (
                        <div
                            key={i}
                            className={["whitespace-pre-wrap", color].join(" ")}
                        >
                            {line.text}
                        </div>
                    );
                })}
                {running && (
                    <div className="text-emerald-400">
                        <span className="caret" />
                    </div>
                )}
            </div>
        </div>
    );
}
