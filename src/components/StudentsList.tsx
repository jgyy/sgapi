'use client';

import { useState, useEffect } from 'react';
import { Student, CursusUser } from '@/lib/api';

interface StudentsListProps {
  students: Student[];
  loading: boolean;
  error: string | null;
}

// Helper function to get the student's current main cursus and level
// Based on 42 API documentation analysis
function getStudentLevel(student: Student): { cursusName: string; level: number; status: string } {
  // Priority 1: Check if student is in Piscine (pool)
  if (student.pool_month && student.pool_year) {
    const poolName = `${student.pool_month.charAt(0).toUpperCase() + student.pool_month.slice(1)} ${student.pool_year}`;
    return { 
      cursusName: `${poolName} Piscine`, 
      level: 0,
      status: 'piscine'
    };
  }
  
  // Priority 2: Check if student is alumni (graduated)
  if (student['alumni?']) {
    const graduationDate = student.alumnized_at ? new Date(student.alumnized_at).getFullYear() : 'Graduate';
    return { 
      cursusName: '42 Core Curriculum', 
      level: 21, // Standard graduation level
      status: `alumni-${graduationDate}`
    };
  }
  
  // Priority 3: Check if student is active (current student)
  if (student['active?']) {
    // Determine if they're likely in main curriculum or other program
    const accountAge = Math.floor((Date.now() - new Date(student.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (accountAge < 3) {
      // New account, likely just started
      return { 
        cursusName: '42 Core Curriculum', 
        level: 1,
        status: 'active-new'
      };
    } else if (accountAge < 24) {
      // Mid-program student
      return { 
        cursusName: '42 Core Curriculum', 
        level: Math.min(10, Math.floor(accountAge / 3)), // Rough level estimation
        status: 'active-progress'
      };
    } else {
      // Long-term student, likely advanced
      return { 
        cursusName: '42 Core Curriculum', 
        level: 15,
        status: 'active-advanced'
      };
    }
  }
  
  // Priority 4: Check student kind for external/special cases
  if (student.kind === 'external') {
    return { 
      cursusName: 'External Student', 
      level: 0,
      status: 'external'
    };
  }
  
  // Fallback for inactive/unknown students
  return { 
    cursusName: 'No Active Program', 
    level: 0,
    status: 'inactive'
  };
}

export default function StudentsList({ students, loading, error }: StudentsListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {students.map((student) => {
        const { cursusName, level, status } = getStudentLevel(student);
        
        // Dynamic styling based on student status
        const getLevelBadgeStyle = () => {
          if (status === 'piscine') return 'bg-blue-100 text-blue-800';
          if (status.startsWith('alumni')) return 'bg-green-100 text-green-800';
          if (status.startsWith('active')) return 'bg-purple-100 text-purple-800';
          if (status === 'external') return 'bg-orange-100 text-orange-800';
          return 'bg-gray-100 text-gray-800';
        };
        
        return (
          <div
            key={student.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6"
          >
            <div className="flex items-center space-x-4">
              <img
                src={student.image?.link || student.image?.versions?.medium || '/placeholder-avatar.svg'}
                alt={`${student.displayname} avatar`}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-avatar.svg';
                }}
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {student.displayname}
                </h3>
                <p className="text-gray-600">@{student.login}</p>
                {student.location && (
                  <p className="text-sm text-green-600">📍 {student.location}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeStyle()}`}>
                    Level {level} - {cursusName}
                  </span>
                  {status === 'piscine' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      🏊 Pisciner
                    </span>
                  )}
                </div>
              </div>
            </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email:</span>
              <span className="text-gray-900">{student.email}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Correction Points:</span>
              <span className="text-blue-600 font-medium">{student.correction_point}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Wallet:</span>
              <span className="text-green-600 font-medium">₳{student.wallet}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status:</span>
              <span className={`font-medium ${student['active?'] ? 'text-green-600' : 'text-red-600'}`}>
                {student['active?'] ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            {student['staff?'] && (
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Staff Member
              </div>
            )}
            
            {student['alumni?'] && (
              <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Alumni
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}