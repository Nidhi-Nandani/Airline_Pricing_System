import React, { useEffect, useState } from 'react';
import { 
  createBrowserRouter,
  RouterProvider,
  Navigate 
} from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Landing from './components/Landing';
import FlightSearch from './components/FlightSearch';
import BookingHistory from './components/BookingHistory';
import PriceAnalytics from './components/PriceAnalytics';
import Navbar from './components/Navbar';
import BookingPage from './components/BookingPage';
import Login from './components/Login';
import Register from './components/Register';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565c0', // Professional blue
      light: '#5e92f3',
      dark: '#003c8f',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ff9800', // Orange accent
      light: '#ffc947',
      dark: '#c66900',
      contrastText: '#fff',
    },
    background: {
      default: '#f4f6fb',
      paper: '#fff',
    },
    info: {
      main: '#0288d1',
    },
    warning: {
      main: '#fbc02d',
    },
    error: {
      main: '#d32f2f',
    },
    success: {
      main: '#388e3c',
    },
    text: {
      primary: '#222b45',
      secondary: '#6b778c',
    },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

// Define routes with layout
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Landing />,
    },
    {
      path: '/login',
      element: <Login onLoginSuccess={() => window.location.href = '/search'} />,
    },
    {
      path: '/register',
      element: <Register onRegisterSuccess={() => window.location.href = '/login'} />,
    },
    {
      path: '/search',
      element: (
        <PrivateRoute>
          <Navbar />
          <FlightSearch />
        </PrivateRoute>
      ),
    },
    {
      path: '/book/:flightNumber',
      element: (
        <PrivateRoute>
          <Navbar />
          <BookingPage />
        </PrivateRoute>
      ),
    },
    {
      path: '/bookings',
      element: (
        <PrivateRoute>
          <Navbar />
          <BookingHistory />
        </PrivateRoute>
      ),
    },
    {
      path: '/analytics',
      element: (
        <PrivateRoute>
          <Navbar />
          <PriceAnalytics />
        </PrivateRoute>
      ),
    },
  ]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
