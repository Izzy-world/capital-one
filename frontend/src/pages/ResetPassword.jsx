import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const resetData = JSON.parse(localStorage.getItem('password_reset') || '{}');
    if (!resetData.token || resetData.token !== token || resetData.expires < Date.now()) {
      setError('Invalid or expired reset link.');
    } else {
      setValid(true);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    const resetData = JSON.parse(localStorage.getItem('password_reset') || '{}');
    const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
    const userIndex = users.findIndex(u => u.email === resetData.email);
    if (userIndex === -1) {
      setError('User not found.');
      return;
    }
    users[userIndex].password = password;
    localStorage.setItem('bank_users', JSON.stringify(users));
    localStorage.removeItem('password_reset');

    setMessage('Password reset successfully! Redirecting to login...');
    setTimeout(() => navigate('/login'), 2000);
  };

  if (!valid && !error) return <div className="p-8 text-center">Validating link...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#004977] mb-2">Create new password</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="text-green-600 mb-4">{message}</p>}
        {valid && !message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-2"
              required
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded-lg p-2"
              required
            />
            <button type="submit" className="w-full bg-[#d22630] text-white py-2 rounded-lg hover:bg-red-700">
              Reset password
            </button>
          </form>
        )}
        <p className="text-center text-sm mt-4">
          <Link to="/login" className="text-[#004977] hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}