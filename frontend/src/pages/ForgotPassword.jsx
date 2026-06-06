import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
    const user = users.find(u => u.email === email);
    if (!user) {
      setError('No account found with that email.');
      return;
    }

    const resetToken = Math.random().toString(36).substring(2, 15);
    const resetData = {
      email,
      token: resetToken,
      expires: Date.now() + 3600000, // 1 hour
    };
    localStorage.setItem('password_reset', JSON.stringify(resetData));

    // Simulate email – in real app you would send an actual email
    console.log(`Password reset link: ${window.location.origin}/reset-password?token=${resetToken}`);
    setMessage(`A reset link has been sent to ${email} (simulated). Check console.`);

    setTimeout(() => navigate('/login'), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#004977] mb-2">Reset password</h1>
        <p className="text-gray-500 mb-6">Enter your email and we'll send you a link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <button type="submit" className="w-full bg-[#d22630] text-white py-2 rounded-lg hover:bg-red-700">
            Send reset link
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          <Link to="/login" className="text-[#004977] hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}