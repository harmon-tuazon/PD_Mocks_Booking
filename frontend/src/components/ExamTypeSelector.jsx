import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserSession } from '../utils/auth';
import apiService from '../services/api';
import { ResponsiveLogo } from './shared/Logo';

const ExamTypeSelector = () => {
  const navigate = useNavigate();
  const [userSession, setUserSession] = useState(null);
  const [creditInfo, setCreditInfo] = useState({});

  const examTypes = [
    {
      type: 'Situational Judgment',
      description: 'Test your clinical decision-making and professional judgment skills with scenario-based questions.',
      icon: '/assets/SJ-icon.svg',
      color: 'primary',
      duration: '2 hours',
      format: 'Live Session',
    },
    {
      type: 'Clinical Skills',
      description: 'Demonstrate your practical clinical abilities and patient interaction skills in simulated scenarios.',
      icon: '/assets/CS-icon.svg',
      color: 'success',
      duration: '3 hours',
      format: 'Live Session',
    },
    {
      type: 'Mini-mock',
      description: 'Quick practice session to test your knowledge and prepare for full-length exams.',
      icon: '/assets/minimock-icon.svg',
      color: 'warning',
      duration: '1 hour',
      format: 'Live Session',
    },
  ];

  // Load user session and fetch credit information
  useEffect(() => {
    const userData = getUserSession();
    if (userData) {
      setUserSession(userData);
      // Fetch credit info for each exam type
      fetchCreditInfo(userData);
    }
  }, []);

  const fetchCreditInfo = async (userData) => {
    try {
      const creditData = {};
      for (const examType of examTypes) {
        const result = await apiService.mockExams.validateCredits(
          userData.studentId,
          userData.email,
          examType.type
        );
        if (result.success) {
          creditData[examType.type] = result.data.credit_breakdown;
        }
      }
      setCreditInfo(creditData);
    } catch (error) {
      console.error('Error fetching credit information:', error);
    }
  };

  const handleSelectType = (type) => {
    navigate(`/book/exams?type=${encodeURIComponent(type)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="container-brand py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <ResponsiveLogo
              size="large"
              className="transition-opacity duration-300 hover:opacity-80 !h-16 sm:!h-14 lg:!h-16"
            />
            <h1 className="font-headline text-h1 font-bold text-primary-900">
              Book Your Mock Exam
            </h1>
          </div>
          <p className="font-body text-lg text-primary-700 content-width-md">
            Choose the type of mock exam you'd like to book. Check your available credits below.
          </p>
        </div>

        <div className="grid-exam-cards-large content-width-lg">
          {examTypes.map((exam, index) => (
            <div
              key={exam.type}
              className="card-hover animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleSelectType(exam.type)}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                  <img
                    src={exam.icon}
                    alt={`${exam.type} icon`}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <h2 className="font-headline text-h3 font-semibold text-primary-900 mb-3">
                  {exam.type}
                </h2>
                <p className="font-body text-base text-primary-700 mb-6 min-h-[60px]">
                  {exam.description}
                </p>

                <div className="space-brand-small mb-6 font-body text-sm text-primary-600">
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>Duration: {exam.duration}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z" clipRule="evenodd" />
                    </svg>
                    <span>Format: {exam.format}</span>
                  </div>
                </div>

                <button className="btn-primary w-full">
                  View Available Sessions
                  <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Combined Credit Overview Table - Moved to Bottom */}
        {userSession && Object.keys(creditInfo).length > 0 && (
          <div className="mt-12 content-width-md">
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b">
                <h3 className="font-subheading text-lg font-medium text-primary-900">Your Credits</h3>
                <p className="font-body text-sm text-primary-600 mt-1">Available credits for all exam types</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specific Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shared Credits
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Available
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {examTypes.map((examType, index) => {
                      const breakdown = creditInfo[examType.type];
                      if (!breakdown) return null;

                      const specific = breakdown.specific_credits || 0;
                      const shared = examType.type === 'Mini-mock' ? 0 : (breakdown.shared_credits || 0);
                      const total = specific + shared;

                      return (
                        <tr key={examType.type} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{examType.type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              specific > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {specific}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {examType.type === 'Mini-mock' ? (
                              <span className="text-xs text-gray-400">N/A</span>
                            ) : (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                shared > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {shared}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                            <span className={total > 0 ? 'text-green-600' : 'text-red-600'}>
                              {total}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500">
                Specific credits can only be used for their designated exam type. Shared credits can be used for any exam type except Mini-mock.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ExamTypeSelector;