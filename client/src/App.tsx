import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import MainLayout from "@/pages/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" richColors closeButton />
          <MainLayout />
        </TooltipProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
