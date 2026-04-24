export default function SectionHeader({ step, title, subtitle, actions }) {
    return (
        <div className="border-b border-white/10 px-6 md:px-10 py-8 md:py-10 relative grid-texture">
            <div className="max-w-5xl relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-400/80 mb-3">
                        <span className="text-zinc-600 mr-2">//</span>stage
                        <span className="text-zinc-50 mx-2">{step}</span>
                        <span className="text-zinc-600">of 04</span>
                    </div>
                    <h1
                        className="heading-mono text-4xl sm:text-5xl lg:text-6xl tracking-tighter uppercase font-medium text-zinc-50 leading-[1.05]"
                        data-testid="page-title"
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-4 max-w-2xl text-zinc-400 text-base leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
        </div>
    );
}
