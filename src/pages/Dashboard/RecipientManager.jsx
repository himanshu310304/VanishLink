import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

const RecipientManager = () => {
  const { id } = useParams(); // Link ID
  const [invitations, setInvitations] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Use the new architecture endpoints
      const invRes = await api.get(`/links/${id}/invitations`);
      setInvitations(invRes.data.invitations || []);

      const secRes = await api.get(`/links/${id}/invitations/security-events`);
      setSecurityEvents(secRes.data.events || []);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      await api.post(`/links/${id}/invitations`, {
        recipients: [{ email: newEmail, name: newName }]
      });
      setNewEmail('');
      setNewName('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add recipient');
    }
  };

  const handleRevoke = async (invId) => {
    try {
      await api.patch(`/links/${id}/invitations/${invId}/status`, { status: 'revoked' });
      fetchData();
    } catch (err) {
      setError('Failed to revoke invitation');
    }
  };

  const handleFreeze = async (invId) => {
    try {
      await api.patch(`/links/${id}/invitations/${invId}/status`, { status: 'frozen' });
      fetchData();
    } catch (err) {
      setError('Failed to freeze invitation');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Zero-Trust Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage recipient access and monitor leaks.</p>
        </div>
        <Link to="/dashboard/links" className="text-blue-500 hover:underline font-medium">Back to Links</Link>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg shadow-sm border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN - RECIPIENTS */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Issue New Invitation</h2>
            <form onSubmit={handleAddRecipient} className="flex gap-4">
              <input
                type="email"
                placeholder="Email Address"
                className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Name (Optional)"
                className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">
                Send Invite
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Active Recipients</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-white dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {invitations.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{inv.recipientEmail}</div>
                      <div className="text-sm text-gray-500">{inv.recipientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                        ${inv.status === 'verified' ? 'bg-green-100 text-green-700 border border-green-200' : 
                          inv.status === 'revoked' ? 'bg-red-100 text-red-700 border border-red-200' : 
                          inv.status === 'frozen' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                          'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                         <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                           <div 
                             className={`h-full ${inv.confidenceScore > 75 ? 'bg-green-500' : inv.confidenceScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                             style={{ width: `${inv.confidenceScore}%` }}
                           ></div>
                         </div>
                         <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{inv.confidenceScore}%</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center flex-wrap gap-3">
                        {inv.status !== 'revoked' && inv.status !== 'frozen' && (
                          <button onClick={() => handleFreeze(inv._id)} className="text-orange-600 hover:text-orange-800">
                            Freeze
                          </button>
                        )}
                        {inv.status !== 'revoked' && (
                          <button onClick={() => handleRevoke(inv._id)} className="text-red-600 hover:text-red-800">
                            Revoke
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                            alert('Invitation link copied to clipboard!');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          Copy Link
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                      No invitations issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - SECURITY EVENTS */}
        <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-5 border-b border-gray-800 bg-gray-900">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Security Event Log
            </h2>
            <p className="text-xs text-gray-400 mt-1">Real-time leak detection</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {securityEvents.map((evt) => (
              <div key={evt._id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${evt.confidenceOfLeak > 50 ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${evt.confidenceOfLeak > 50 ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                    {evt.eventType.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(evt.timestamp).toLocaleString()}</span>
                </div>
                
                {evt.invitationId && (
                  <p className="text-sm text-gray-300 mb-1">
                    <span className="text-gray-500">Target:</span> {evt.invitationId.recipientEmail}
                  </p>
                )}
                
                <p className="text-sm text-gray-300">
                  <span className="text-gray-500">IP:</span> {evt.ipAddress}
                </p>
                
                {evt.attemptedFingerprint && (
                  <p className="text-xs text-gray-500 mt-2 truncate" title={evt.attemptedFingerprint}>
                    UA: {evt.attemptedFingerprint}
                  </p>
                )}
              </div>
            ))}
            
            {securityEvents.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <svg className="w-12 h-12 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                <p>No anomalies detected</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RecipientManager;
