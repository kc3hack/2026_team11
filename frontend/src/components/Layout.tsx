import React, { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronUpIcon } from "@heroicons/react/24/solid";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { useAppContext } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-slate-500 text-lg animate-pulse">Loading...</div>
  </div>
);

const Layout: React.FC = () => {
  const { searchQuery, setSearchQuery } = useAppContext();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && location.pathname !== "/songs") {
      navigate("/songs");
    }
  };

  return (
    <div className="pb-24 md:pb-0 min-h-[100dvh] relative bg-slate-900 overflow-hidden font-sans selection:bg-pink-500 selection:text-white text-slate-200">
      {/* Dynamic Background Elements (Global) */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-r from-red-600 to-transparent -skew-y-3 transform" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[40%] bg-gradient-to-l from-cyan-600 to-transparent skew-y-3 transform" />
        <div className="absolute top-[20%] right-[-20%] w-[800px] h-[800px] border-[50px] border-white/5 rounded-full" />
      </div>

      <div className="relative z-10">
        <Header
          currentPath={location.pathname}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          isAuthenticated={isAuthenticated}
          userName={user?.user_metadata?.full_name || user?.email || null}
        />

        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>

        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-20 right-4 md:bottom-8 z-50 w-10 h-10
              bg-slate-900/80 backdrop-blur border border-cyan-500/40 rounded-full
              flex items-center justify-center text-cyan-400
              shadow-[0_0_12px_rgba(34,211,238,0.4)]
              active:scale-90 transition-all"
            aria-label="ページ先頭に戻る"
          >
            <ChevronUpIcon className="w-5 h-5" />
          </button>
        )}

        <BottomNav
          currentPath={location.pathname}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
};

export default Layout;
