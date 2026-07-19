import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router/index';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {/* Add the Toaster here so it sits on top of everything */}
          <Toaster 
            position="top-center"
          toastOptions={{
            style: {
              background: '#0f172a', // slate-900
              color: '#fff',
              border: '1px solid #1e293b',
            },
          }}
        />
        <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;