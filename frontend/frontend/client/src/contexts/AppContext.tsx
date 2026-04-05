import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  theme: string;
  setTheme: (v: string) => void;
}

const AppContext = createContext<AppContextType>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
  theme: 'light',
  setTheme: () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('light');
  return (
    <AppContext.Provider value={{ sidebarOpen, setSidebarOpen, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
export default AppContext;
