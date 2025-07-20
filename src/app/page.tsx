'use client';

import { useState, useEffect } from 'react';
import StudentsList from '@/components/StudentsList';
import CampusFilter from '@/components/CampusFilter';
import { Student } from '@/lib/api';

// Helper function to get student level for sorting (matches StudentsList logic)
function getStudentLevelForSort(student: Student): number {
  // Priority 1: Piscine students
  if (student.pool_month && student.pool_year) {
    return 0;
  }
  
  // Priority 2: Alumni (highest level)
  if (student['alumni?']) {
    return 21;
  }
  
  // Priority 3: Active students with estimated progression
  if (student['active?']) {
    const accountAge = Math.floor((Date.now() - new Date(student.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (accountAge < 3) return 1;
    if (accountAge < 24) return Math.min(10, Math.floor(accountAge / 3));
    return 15;
  }
  
  // External/inactive students
  return 0;
}

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'level-desc' | 'level-asc' | 'name' | 'default'>('level-desc');

  useEffect(() => {
    fetchStudents();
  }, [page, selectedCampusId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '50',
      });
      
      if (selectedCampusId) {
        params.append('campus_id', selectedCampusId);
      }
      
      const response = await fetch(`/api/students?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const data = await response.json();
      
      // Check for API-level errors in headers
      const rateLimited = response.headers.get('X-Rate-Limited');
      const forbidden = response.headers.get('X-Forbidden');
      const notFound = response.headers.get('X-Not-Found');
      const errorMessage = response.headers.get('X-Error-Message');
      
      if (rateLimited) {
        setError('API rate limited. Please wait a moment and try again.');
        setStudents([]);
        return;
      }
      
      if (forbidden) {
        setError('Access restricted. This campus data may require special permissions.');
        setStudents([]);
        return;
      }
      
      if (notFound) {
        setError('Campus not found. Please select a different campus.');
        setStudents([]);
        return;
      }
      
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    setPage(page + 1);
  };

  const handleCampusChange = (campusId: string | null) => {
    setSelectedCampusId(campusId);
    setPage(1); // Reset to first page when changing campus
  };

  // Sort students based on selected sort option
  const sortedStudents = [...students].sort((a, b) => {
    switch (sortBy) {
      case 'level-desc':
        return getStudentLevelForSort(b) - getStudentLevelForSort(a);
      case 'level-asc':
        return getStudentLevelForSort(a) - getStudentLevelForSort(b);
      case 'name':
        return a.displayname.localeCompare(b.displayname);
      default:
        return 0; // Keep original order
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">42 Students Directory</h1>
          <p className="mt-2 text-gray-600">Browse students from the 42 network</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-4">
          <CampusFilter 
            selectedCampusId={selectedCampusId}
            onCampusChange={handleCampusChange}
          />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'level-desc' | 'level-asc' | 'name' | 'default')}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
            >
              <option value="level-desc">Level (Alumni → Advanced → Beginners → Piscine)</option>
              <option value="level-asc">Level (Piscine → Beginners → Advanced → Alumni)</option>
              <option value="name">Name (A-Z)</option>
              <option value="default">Default Order</option>
            </select>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">🏊 Piscine</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">📚 Active</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">🎓 Alumni</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">
            Students (Page {page})
            {selectedCampusId && (
              <span className="text-sm text-gray-500 ml-2">
                - Filtered by Campus
              </span>
            )}
          </h2>
          
          <div className="flex space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        <StudentsList students={sortedStudents} loading={loading} error={error} />

        {!loading && students.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No students found.</p>
          </div>
        )}
      </main>
    </div>
  );
}
