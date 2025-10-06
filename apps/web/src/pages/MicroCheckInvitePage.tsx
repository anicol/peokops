import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Target, Clock, Calendar, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { microCheckAPI } from '@/services/api';
import type { MicroCheckRun } from '@/types/microCheck';

const MicroCheckInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<MicroCheckRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    const fetchRun = async () => {
      try {
        const data = await microCheckAPI.getRunByToken(token);
        setRun(data);
      } catch (err: any) {
        console.error('Error fetching run:', err);
        if (err.response?.status === 404) {
          setError('This check link is invalid or has expired');
        } else if (err.response?.status === 403) {
          setError('This check link has expired');
        } else {
          setError('Unable to load check. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRun();
  }, [token]);

  const getTodaysDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleStartChecks = () => {
    navigate(`/micro-check?token=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your checks...</p>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-sm mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-8 h-8 text-white" />
          </div>

          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Today's {run.items.length} Checks are ready
          </h1>
          <p className="text-gray-600 mb-6">Takes 2 minutes</p>

          {/* Store name */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">{run.store_name}</p>
          </div>

          {/* Date */}
          <div className="flex items-center justify-center text-sm text-gray-600 mb-6">
            <Calendar className="w-4 h-4 mr-2" />
            {getTodaysDate()}
          </div>

          {/* Quick preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Today's Focus:</h3>
            <div className="space-y-2 text-sm">
              {run.items.map((item) => (
                <div key={item.id} className="flex items-center">
                  <div className="w-2 h-2 bg-teal-600 rounded-full mr-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-left">{item.title_snapshot}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStartChecks}
            className="w-full flex items-center justify-center px-6 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-semibold text-lg shadow-lg"
          >
            Start Checks
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>

          {/* Time indicator */}
          <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
            <Clock className="w-4 h-4 mr-1" />
            Usually takes 2 minutes
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            PeakOps Micro-Check • No login required
          </p>
        </div>
      </div>
    </div>
  );
};

export default MicroCheckInvitePage;
