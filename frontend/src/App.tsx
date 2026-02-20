import { BrowserRouter, useRoutes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AnalysisProvider } from './contexts/AnalysisContext';
import { AppProvider } from "./contexts/AppContext";
import { routes } from "./routes";

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </AnalysisProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
