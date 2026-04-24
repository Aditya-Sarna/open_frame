import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";

export default function Layout() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
            <div className="flex flex-1 min-h-0">
                <Sidebar />
                <main
                    className="flex-1 min-w-0 overflow-x-hidden"
                    data-testid="main-content"
                >
                    <Outlet />
                </main>
            </div>
            <StatusBar />
        </div>
    );
}
