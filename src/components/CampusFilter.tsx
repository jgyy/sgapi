'use client';

import { useState, useEffect } from 'react';
import { Campus } from '@/lib/api';

interface CampusFilterProps {
  selectedCampusId: string | null;
  onCampusChange: (campusId: string | null) => void;
}

export default function CampusFilter({ selectedCampusId, onCampusChange }: CampusFilterProps) {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampuses();
  }, []);

  // Set default to Singapore campus when campuses are loaded
  useEffect(() => {
    if (campuses.length > 0 && !selectedCampusId) {
      const singaporeCampus = campuses.find(campus => 
        campus.name.toLowerCase().includes('singapore')
      );
      if (singaporeCampus) {
        onCampusChange(singaporeCampus.id.toString());
      }
    }
  }, [campuses, selectedCampusId, onCampusChange]);

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/campus');
      
      if (!response.ok) {
        throw new Error('Failed to fetch campuses');
      }
      
      const data = await response.json();
      setCampuses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCampusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onCampusChange(value === '' ? null : value);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Loading campuses...</span>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading campuses: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:items-center">
      <label htmlFor="campus-filter" className="text-sm font-medium text-gray-700">
        Filter by Campus:
      </label>
      <select
        id="campus-filter"
        value={selectedCampusId || ''}
        onChange={handleCampusChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
      >
        <option value="">All Campuses</option>
        {campuses.map((campus) => (
          <option key={campus.id} value={campus.id.toString()}>
            {campus.name} ({campus.users_count} users)
          </option>
        ))}
      </select>
      
      {selectedCampusId && (
        <button
          onClick={() => onCampusChange(null)}
          className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
        >
          Clear Filter
        </button>
      )}
    </div>
  );
}