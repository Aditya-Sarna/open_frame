import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Parser from "@/pages/Parser";
import Mapper from "@/pages/Mapper";
import Pipeline from "@/pages/Pipeline";
import Validation from "@/pages/Validation";

function App() {
    useEffect(() => {
        document.documentElement.classList.add("dark");
    }, []);

    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/parser" element={<Parser />} />
                        <Route path="/mapper" element={<Mapper />} />
                        <Route path="/pipeline" element={<Pipeline />} />
                        <Route path="/validation" element={<Validation />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: "#09090B",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#F4F4F5",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "12px",
                        borderRadius: "2px",
                    },
                }}
            />
        </div>
    );
}

export default App;
