import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiService, { formatDate, formatTime, formatTimeRange } from '../services/api';
import CapacityBadge from './shared/CapacityBadge';
import TokenCard from './shared/TokenCard';
import CalendarView from './shared/CalendarView';
import Logo from './shared/Logo';
import { getUserSession } from '../utils/auth';

const ExamSessionsList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mockType = searchParams.get('type') || 'Situational Judgment';

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar' - Default to calendar per requirements
  const [userSession, setUserSession] = useState(null);
  const [creditBreakdown, setCreditBreakdown] = useState(null);

  useEffect(() => {
    fetchExams();
    fetchCreditInfo();
  }, [mockType]);

  useEffect(() => {
    const userData = getUserSession();
    if (userData) {
      setUserSession(userData);
    }
  }, []);

  const fetchCreditInfo = async () => {
    try {
      const userData = getUserSession();
      if (userData) {
        const result = await apiService.mockExams.validateCredits(
          userData.studentId,
          userData.email,
          mockType
        );
        if (result.success) {
          setCreditBreakdown(result.data.credit_breakdown);
        }
      }
    } catch (error) {
      console.error('Error fetching credit information:', error);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.mockExams.getAvailable(mockType, true);

      if (result.success) {
        setExams(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch exams');
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError(err.message || 'An error occurred while loading exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    // Calendar date selection handler - currently not needed
    // as sessions are shown directly in the calendar view
  };

  const handleSelectExam = (exam) => {
    if (exam.available_slots === 0) {
      alert('This exam session is full. Please select another date.');
      return;
    }

    navigate(`/book/${exam.mock_exam_id}`, {
      state: {
        mockType,
        examDate: exam.exam_date,
        location: exam.location
      }
    });
  };

  const LocationIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-body font-body text-gray-700">Loading available exam sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-coral-100 rounded-full mb-4 border-2 border-coral-200">
              <svg className="w-8 h-8 text-coral-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-h3 font-headline font-bold text-navy-900 mb-2">Error Loading Exams</h2>
            <p className="text-body font-body text-gray-700 mb-6">{error}</p>
            <button onClick={fetchExams} className="btn-brand-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-app py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/book/exam-types')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to exam types
          </button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-h2 font-headline font-bold text-navy-900">
              {mockType} Mock Exams
            </h1>
            <Logo
              variant="horizontal"
              size="large"
              className="ml-4"
              aria-label="PrepDoctors Logo"
            />
          </div>
          <p className="text-body font-body text-gray-800">
            {viewMode === 'calendar'
              ? 'Select a date from the calendar to view available sessions'
              : 'Select an available exam session to book your slot'
            }
          </p>
        </div>

        {/* User Info Cards - Credit Card Only */}
        {userSession && creditBreakdown && (
          <div className="mb-6">
            <div className="max-w-md">
              <TokenCard
                creditBreakdown={creditBreakdown}
                mockType={mockType}
                compact={true}
                className=""
              />
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-small font-body text-gray-600">
            Found {exams.length} available session{exams.length !== 1 ? 's' : ''}
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-subheading font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-navy-900 shadow-sm border border-primary-200'
                  : 'text-gray-600 hover:text-navy-700'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md text-sm font-subheading font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-navy-900 shadow-sm border border-primary-200'
                  : 'text-gray-600 hover:text-navy-700'
              }`}
            >
              Calendar View
            </button>
          </div>
        </div>

        {/* Exam Sessions */}
        {exams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-body font-body text-gray-600">No exam sessions available for {mockType} at this time.</p>
            <p className="text-body font-body text-gray-600 mt-2">Please check back later or select a different exam type.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <div
                key={exam.mock_exam_id}
                className={`card-brand ${exam.available_slots > 0 ? 'hover:shadow-lg cursor-pointer hover:border-primary-300' : 'opacity-75'} transition-all duration-200`}
                onClick={() => handleSelectExam(exam)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-lg font-headline font-semibold text-navy-800">
                        {formatDate(exam.exam_date)}
                      </h3>
                      <CapacityBadge
                        availableSlots={exam.available_slots}
                        capacity={exam.capacity}
                      />
                    </div>

                    <div className="flex items-center gap-6 text-sm font-body text-gray-700">
                      <div className="flex items-center gap-1">
                        <CalendarIcon />
                        <span>{formatTimeRange(exam)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <LocationIcon />
                        <span>{exam.location}</span>
                      </div>
                      <div>
                        Capacity: {exam.capacity - exam.available_slots}/{exam.capacity} booked
                      </div>
                    </div>
                  </div>

                  <button
                    className={`${
                      exam.available_slots > 0 ? 'btn-brand-primary' : 'btn-outline opacity-50 cursor-not-allowed'
                    }`}
                    disabled={exam.available_slots === 0}
                  >
                    {exam.available_slots > 0 ? 'Select' : 'Full'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CalendarView
            exams={exams}
            onExamSelect={handleSelectExam}
          />
        )}
      </div>
    </div>
  );
};
export default ExamSessionsList;
