import { NavLink } from "react-router-dom";
import {
    LayoutGrid,
    FileCode2,
    GitCompareArrows,
    Waypoints,
    ShieldCheck,
    Cpu,
} from "lucide-react";

const NAV = [
    { to: "/", label: "Dashboard", code: "00", icon: LayoutGrid },
    { to: "/parser", label: "COBOL Parser", code: "01", icon: FileCode2 },
    { to: "/mapper", label: "Schema Mapper", code: "02", icon: GitCompareArrows },
    { to: "/pipeline", label: "Migration Pipeline", code: "03", icon: Waypoints },
    { to: "/validation", label: "Data Validation", code: "04", icon: ShieldCheck },
];

export default function Sidebar() {
    return (
        <aside
            className="w-[260px] shrink-0 border-r border-white/10 bg-[#09090B] hidden md:flex flex-col sticky top-0 h-screen"
            data-testid="sidebar"
        >
            {/* Brand */}
            <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
                <div className="h-9 w-9 grid place-items-center border border-emerald-500/40 bg-emerald-500/10">
                    <Cpu className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        openframe
                    </span>
                    <span className="font-mono text-sm text-zinc-100 tracking-tight">
                        MAINFRAME / OS
                    </span>
                </div>
            </div>

            {/* Section label */}
            <div className="px-5 pt-6 pb-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                    // pipeline
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 flex flex-col gap-0.5" data-testid="sidebar-nav">
                {NAV.map(({ to, label, code, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                        className={({ isActive }) =>
                            [
                                "group relative flex items-center gap-3 px-3 py-2.5 font-mono text-[13px] transition-colors",
                                isActive
                                    ? "text-zinc-50 bg-white/[0.03]"
                                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]",
                            ].join(" ")
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={[
                                        "absolute left-0 top-0 bottom-0 w-[2px] transition-colors",
                                        isActive
                                            ? "bg-emerald-500"
                                            : "bg-transparent group-hover:bg-white/10",
                                    ].join(" ")}
                                />
                                <span className="text-[10px] tracking-[0.25em] text-zinc-600 group-hover:text-zinc-400">
                                    {code}
                                </span>
                                <Icon
                                    className="h-4 w-4"
                                    strokeWidth={1.5}
                                />
                                <span className="tracking-tight">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Runtime footer */}
            <div className="border-t border-white/10 px-5 py-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        runtime online
                    </span>
                </div>
                <div className="font-mono text-[10px] text-zinc-600 leading-relaxed">
                    <div>model · claude-sonnet-4.5</div>
                    <div>latency · &lt; 2s · p95</div>
                    <div>build · 2026.12.r1</div>
                </div>
            </div>
        </aside>
    );
}
