import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

// Helper to remove duplicate transactions (keep the newest one by date)
const deduplicateTransactions = (transactions) => {
  const seen = new Map();
  const unique = [];
  for (const t of transactions) {
    const key = t.description;
    if (!seen.has(key) || new Date(t.date) > new Date(seen.get(key).date)) {
      seen.set(key, t);
      unique.push(t);
    }
  }
  return unique;
};

// Helper to add missing transactions (if still missing after dedup)
const addMissingTransactions = (userData, users, userIndex) => {
  // First, remove any existing duplicates
  userData.transactions = deduplicateTransactions(userData.transactions);
  
  const checkingAccount = userData.accounts.find(a => a.type === 'checking');
  if (!checkingAccount) return false;

  const existingDescriptions = userData.transactions.map(t => t.description);
  const newTransactions = [];

  const requiredTx = [
    { amount: -123000000, description: 'Gold investment', category: 'Investment', type: 'withdrawal' },
    { amount: 285000000, description: 'Gold sales', category: 'Income', type: 'deposit' },
    { amount: 195000000, description: 'Phone sales', category: 'Income', type: 'deposit' },
    { amount: 300000000, description: 'Credit deposit', category: 'Income', type: 'deposit' }
  ];

  for (const tx of requiredTx) {
    if (!existingDescriptions.includes(tx.description)) {
      newTransactions.push({
        id: Date.now() + Math.random(),
        accountId: checkingAccount.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }

  if (newTransactions.length === 0 && userData.transactions.length === deduplicateTransactions(userData.transactions).length) {
    // No duplicates removed and no missing added -> no change
    return false;
  }

  // Add new ones
  userData.transactions.push(...newTransactions);
  // Save back
  users[userIndex] = userData;
  localStorage.setItem('bank_users', JSON.stringify(users));
  const { password: _, ...updatedUser } = userData;
  localStorage.setItem('bank_current_user', JSON.stringify(updatedUser));
  return true;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser) {
      const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        const updated = addMissingTransactions(users[userIndex], users, userIndex);
        if (updated) {
          const freshUser = api.getCurrentUser();
          setUser(freshUser);
          setLoading(false);
          return;
        }
      }
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const register = async (email, password, name, initialBalance) => {
    const { user } = await api.register(email, password, name, initialBalance);
    setUser(user);
  };

  const login = async (email, password) => {
    const { user } = await api.login(email, password);
    setUser(user);
    // After login, also run the migration (dedup + add missing)
    const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      const updated = addMissingTransactions(users[userIndex], users, userIndex);
      if (updated) {
        const freshUser = api.getCurrentUser();
        setUser(freshUser);
      }
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);