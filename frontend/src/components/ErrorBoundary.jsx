import { Component } from "react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("App crashed:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh", background: "#000", color: "#f4f4f5",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", fontFamily: "monospace", padding: "40px"
                }}>
                    <div style={{ color: "#f87171", fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
                        // runtime error
                    </div>
                    <pre style={{
                        background: "#09090b", border: "1px solid rgba(255,255,255,0.1)",
                        padding: "20px", fontSize: "12px", color: "#a1a1aa",
                        maxWidth: "800px", width: "100%", overflowX: "auto", whiteSpace: "pre-wrap"
                    }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: "24px", background: "#10b981", color: "#000",
                            border: "none", padding: "10px 24px", fontFamily: "monospace",
                            fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase",
                            cursor: "pointer"
                        }}
                    >
                        reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
