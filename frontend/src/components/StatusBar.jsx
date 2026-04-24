import { useEffect, useState } from "react";

export default function StatusBar() {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const fmt = time.toISOString().replace("T", " ").slice(0, 19) + "Z";

    return (
        <footer
            className="border-t border-white/10 bg-black/80 backdrop-blur-xl px-6 py-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500"
            data-testid="status-bar"
        >
            <div className="flex items-center gap-4">
                <span className="text-emerald-400">● ready</span>
                <span className="hidden sm:inline">vsam · ebcdic · comp-3</span>
                <span className="hidden md:inline">region · us-east-4</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="hidden sm:inline">mem · 2.1g / 8g</span>
                <span className="hidden md:inline">cpu · 34%</span>
                <span>{fmt}</span>
            </div>
        </footer>
    );
}
