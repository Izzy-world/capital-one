import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  CreditCardIcon, BuildingLibraryIcon, BanknotesIcon,
  ArrowUpIcon, ArrowDownIcon, ArrowPathIcon,
  UserCircleIcon, HomeIcon, BriefcaseIcon, PhoneIcon, CalendarIcon
} from '@heroicons/react/24/outline';
import CreditScoreCard from '../components/CreditScoreCard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [sendEmail, setSendEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [spendingData, setSpendingData] = useState([]);

  const loadData = async () => {
    try {
      const accs = await api.getAccounts();
      setAccounts(accs);
      const allTxns = await api.getAllTransactions();
      setTransactions(allTxns.slice(0, 10));

      // Aggregate spending by category (excluding income and transfers in)
      const categoryMap = new Map();
      allTxns.forEach(tx => {
        let category = tx.category || 'Other';
        let amount = 0;
        if (tx.type === 'deposit' && tx.category === 'Income') return;
        if (tx.type === 'transfer_in') return;
        if (tx.type === 'transfer_out') amount = tx.amount;
        else if (tx.amount < 0) amount = -tx.amount;
        if (amount > 0) {
          categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
        }
      });
      const chartData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
      setSpendingData(chartData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Deposit to checking
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Enter a positive amount');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const checking = accounts.find(a => a.type === 'checking');
    if (!checking) { setMessage('Checking account not found'); return; }
    try {
      await api.deposit(checking.id, amount);
      setMessage(`Deposited $${amount.toFixed(2)}`);
      setDepositAmount('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Internal transfer (checking ↔ savings)
  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Enter a positive amount');
      return;
    }
    if (!fromAccountId || !toAccountId) {
      setMessage('Select both accounts');
      return;
    }
    if (fromAccountId === toAccountId) {
      setMessage('Cannot transfer to same account');
      return;
    }
    try {
      await api.transfer(parseInt(fromAccountId), parseInt(toAccountId), amount);
      setMessage(`Transferred $${amount.toFixed(2)}`);
      setTransferAmount('');
      setFromAccountId('');
      setToAccountId('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // External send money (deduct from checking, record transaction)
  const handleSendMoney = async () => {
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Enter a positive amount');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (!sendEmail.trim()) {
      setMessage('Recipient email is required');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const checking = accounts.find(a => a.type === 'checking');
    if (!checking) {
      setMessage('Checking account not found');
      return;
    }
    if (checking.balance < amount) {
      setMessage('Insufficient funds');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      // Directly update localStorage to deduct balance and record transaction
      const users = JSON.parse(localStorage.getItem('bank_users'));
      const currentUser = JSON.parse(localStorage.getItem('bank_current_user'));
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      const checkingAccIndex = users[userIndex].accounts.findIndex(a => a.id === checking.id);
      const newBalance = users[userIndex].accounts[checkingAccIndex].balance - amount;
      users[userIndex].accounts[checkingAccIndex].balance = newBalance;
      users[userIndex].accounts[checkingAccIndex].available = newBalance;

      const transaction = {
        id: Date.now(),
        accountId: checking.id,
        type: 'withdrawal',
        amount: -amount,
        description: sendNote ? `Sent to ${sendEmail} - ${sendNote}` : `Sent to ${sendEmail}`,
        category: 'Transfer',
        date: new Date().toISOString()
      };
      if (!users[userIndex].transactions) users[userIndex].transactions = [];
      users[userIndex].transactions.push(transaction);

      localStorage.setItem('bank_users', JSON.stringify(users));
      const { password: _, ...updatedUser } = users[userIndex];
      localStorage.setItem('bank_current_user', JSON.stringify(updatedUser));

      setMessage(`Sent $${amount.toFixed(2)} to ${sendEmail}`);
      setSendEmail('');
      setSendAmount('');
      setSendNote('');
      loadData(); // refresh balances and transactions
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Transfer failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.type === 'credit' ? -acc.balance : acc.balance), 0);
  const userDetails = user || {};

  if (loading) return <div className="flex justify-center items-center h-screen">Loading accounts...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#004977] to-[#d22630] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-8 w-8 text-white" />
            <h1 className="text-xl font-bold text-white">Capital One</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm font-medium">
              Welcome, {userDetails.fullName || userDetails.name}
            </span>
            <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 text-white px-4 py-1 rounded-full text-sm transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column: Financial */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Banner */}
            <div className="bg-gradient-to-r from-[#004977] to-[#002d4c] rounded-2xl shadow-xl p-6 text-white">
              <p className="text-sm uppercase tracking-wider opacity-90">Available balance</p>
              <p className="text-4xl md:text-5xl font-bold mt-1">${totalBalance.toLocaleString()}</p>
              <p className="text-sm mt-2 opacity-80">All accounts combined</p>
            </div>

            {/* Account Cards */}
            <h2 className="text-xl font-semibold text-gray-800">Your accounts</h2>
            <div className="grid gap-4">
              {accounts.map(acc => {
                let icon, cardStyle, extraInfo;
                if (acc.type === 'checking') {
                  icon = <BuildingLibraryIcon className="h-6 w-6 text-[#004977]" />;
                  cardStyle = "border-l-8 border-[#d22630]";
                  extraInfo = <p className="text-xs text-gray-500">Available: ${acc.available.toLocaleString()}</p>;
                } else if (acc.type === 'savings') {
                  icon = <BanknotesIcon className="h-6 w-6 text-[#004977]" />;
                  cardStyle = "border-l-8 border-[#004977]";
                  extraInfo = <p className="text-xs text-gray-500">Available: ${acc.available.toLocaleString()}</p>;
                } else {
                  icon = <CreditCardIcon className="h-6 w-6 text-[#d22630]" />;
                  cardStyle = "bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200";
                  extraInfo = (
                    <p className="text-xs text-gray-500">
                      Credit limit: ${acc.creditLimit?.toLocaleString()} | Available: ${acc.available.toLocaleString()}
                    </p>
                  );
                }
                return (
                  <div key={acc.id} className={`bg-white rounded-xl shadow-md p-5 ${cardStyle} hover:shadow-lg transition transform hover:-translate-y-1`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-full">{icon}</div>
                        <div>
                          <p className="font-semibold text-gray-800 capitalize">{acc.type}</p>
                          <p className="text-xs text-gray-500">•••• {acc.accountNumber.slice(-4)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${acc.balance.toLocaleString()}</p>
                        {extraInfo}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Transactions */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent activity</h2>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {transactions.length === 0 ? (
                  <p className="p-6 text-gray-500 text-center">No transactions yet. Make a deposit or transfer.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {transactions.map(tx => (
                      <li key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {tx.amount > 0 ? <ArrowUpIcon className="h-4 w-4 text-green-600" /> : <ArrowDownIcon className="h-4 w-4 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Actions, charts, profile */}
          <div className="space-y-6">
            {/* Quick Deposit */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Quick deposit</h3>
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Amount"
                  className="border border-gray-300 rounded-lg p-2 focus:ring-[#004977] focus:border-[#004977]"
                />
                <button onClick={handleDeposit} className="bg-[#d22630] hover:bg-red-700 text-white py-2 rounded-lg transition">
                  Deposit
                </button>
              </div>
            </div>

            {/* Internal Transfer */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Transfer money</h3>
              <div className="flex flex-col gap-3">
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="border rounded-lg p-2">
                  <option value="">From account</option>
                  {accounts.filter(a => a.type !== 'credit').map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.type} (${acc.balance})</option>
                  ))}
                </select>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="border rounded-lg p-2">
                  <option value="">To account</option>
                  {accounts.filter(a => a.id !== parseInt(fromAccountId)).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="Amount"
                  className="border rounded-lg p-2"
                />
                <button onClick={handleTransfer} className="bg-[#004977] hover:bg-blue-900 text-white py-2 rounded-lg transition flex items-center justify-center gap-2">
                  <ArrowPathIcon className="h-4 w-4" /> Transfer
                </button>
              </div>
            </div>

            {/* Send Money (external) */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Send money</h3>
              <div className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Recipient email"
                  value={sendEmail}
                  onChange={e => setSendEmail(e.target.value)}
                  className="border rounded-lg p-2"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  className="border rounded-lg p-2"
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={sendNote}
                  onChange={e => setSendNote(e.target.value)}
                  className="border rounded-lg p-2"
                />
                <button onClick={handleSendMoney} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
                  Send Money
                </button>
              </div>
            </div>

            {/* Spending Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Spending by category</h3>
              {spendingData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No spending data yet. Make purchases or transfers.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={spendingData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#004977" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-gray-400 text-center mt-4">Based on your transaction history</p>
            </div>

            {/* Credit Score Card */}
            <CreditScoreCard />

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 border-b pb-3 mb-3">
                <UserCircleIcon className="h-8 w-8 text-[#004977]" />
                <h3 className="font-semibold text-gray-800">Profile information</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Full name:</span> {userDetails.fullName || userDetails.name || 'Not provided'}</p>
                <p><span className="font-medium">Email:</span> {userDetails.email || 'Not provided'}</p>
                {userDetails.phoneNumber && (
                  <p className="flex items-center gap-1"><PhoneIcon className="h-4 w-4 text-gray-500" /> {userDetails.phoneNumber}</p>
                )}
                {userDetails.dateOfBirth && (
                  <p className="flex items-center gap-1"><CalendarIcon className="h-4 w-4 text-gray-500" /> DOB: {new Date(userDetails.dateOfBirth).toLocaleDateString()}</p>
                )}
                {(userDetails.addressLine1 || userDetails.city) && (
                  <div className="flex items-start gap-1 mt-2">
                    <HomeIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      {userDetails.addressLine1}<br />
                      {userDetails.addressLine2 && <>{userDetails.addressLine2}<br /></>}
                      {userDetails.city}, {userDetails.state} {userDetails.zipCode}
                    </div>
                  </div>
                )}
                {userDetails.employmentStatus && (
                  <div className="flex items-center gap-1 mt-2">
                    <BriefcaseIcon className="h-4 w-4 text-gray-500" />
                    <span>{userDetails.employmentStatus.replace('-', ' ')} • Annual income: ${userDetails.annualIncome?.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast message */}
      {message && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {message}
        </div>
      )}
    </div>
  );
}