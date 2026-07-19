// src/hooks/useFetch.js
import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Simple data-fetching hook using our axios instance.
 * Usage: const { data, loading, error } = useFetch('/analytics');
 */
export const useFetch = (url, config = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(url, config);
        if (!cancelled) {
          // IMPORTANT: pass through exactly what backend sends
          setData(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('useFetch error for', url, err);
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
};

export default useFetch;
