import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { z } from 'zod';
import React, { useState, useEffect, useRef } from 'react';

// Strict input validation schema
const dashboardDataSchema = z.object({
  id: z.string().or(z.number()),
  status: z.string(),
  metrics: z.record(z.any()).optional()
});

export const DashboardComponent = ({ fetchDashboardData }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Circuit Breaker State
  const failureCountRef = useRef(0);
  const lastFailureTimeRef = useRef(null);
  
  const CIRCUIT_OPEN_TIMEOUT = 10000; // 10 seconds
  const MAX_FAILURES = 3;
  const REQUEST_TIMEOUT = 5000; // 5 seconds

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      // Circuit Breaker: Check if circuit is OPEN
      if (failureCountRef.current >= MAX_FAILURES) {
        const timeSinceLastFailure = Date.now() - lastFailureTimeRef.current;
        if (timeSinceLastFailure < CIRCUIT_OPEN_TIMEOUT) {
          if (isMounted) {
            setError("Circuit is OPEN. Service temporarily unavailable.");
            setIsLoading(false);
          }
          return;
        } else {
          // Half-Open State
          failureCountRef.current = 0;
        }
      }

      setIsLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetchDashboardData({ signal: controller.signal });
        clearTimeout(timeoutId);
        
        // Strict input validation using Zod
        const validatedData = dashboardDataSchema.parse(response);
        
        if (isMounted) {
          setData(validatedData);
          failureCountRef.current = 0; // Reset failures on success
        }
      } catch (err) {
        failureCountRef.current += 1;
        lastFailureTimeRef.current = Date.now();
        
        if (isMounted) {
          if (err.name === 'AbortError') {
            setError("Request timed out");
          } else if (err instanceof z.ZodError) {
            setError("Invalid data received: " + err.message);
          } else {
            setError(err.message || "An error occurred");
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, [fetchDashboardData]);

  if (isLoading) return <div>Loading dashboard...</div>;
  if (error) return <div className="error-fallback">{error}</div>;
  
  return (
    <div className="dashboard-container">
      <h2>Dashboard Data</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
