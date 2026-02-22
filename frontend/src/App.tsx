import { BrowserRouter, useRoutes } from "react-router-dom";
import { useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { AnalysisProvider } from "./contexts/AnalysisContext";
import { AppProvider } from "./contexts/AppContext";
import { routes } from "./routes";
import { LogoSplash } from "./components/LogoSplash";

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashEnd = () => {
    setShowSplash(false);
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <AppProvider>
            {showSplash && <LogoSplash onAnimationEnd={handleSplashEnd} />}
            <AppRoutes />
          </AppProvider>
        </AnalysisProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
