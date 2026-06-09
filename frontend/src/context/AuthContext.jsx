import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

// Helper to add missing transactions to a user's checking account
const addMissingTransactions = (userData, users, userIndex) => {
  const checkingAccount = userData.accounts.find(a => a.type === 'checking');
  if (!checkingAccount) return false;

  const existingDescriptions = userData.transactions.map(t => t.description);
  const newTransactions = [];

  // List of transactions we want to ensure exist
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
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString() // random past date
      });
    }
  }

  if (newTransactions.length === 0) return false;

  // Add to user's transaction list
  userData.transactions.push(...newTransactions);
  // Update in users array
  users[userIndex] = userData;
  // Save back to localStorage
  localStorage.setItem('bank_users', JSON.stringify(users));
  // Update current user
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
      // Migrate missing transactions for existing user
      const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        const updated = addMissingTransactions(users[userIndex], users, userIndex);
        if (updated) {
          // Reload current user from storage after migration
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
    // After login, migrate missing transactions for this user
    const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      const updated = addMissingTransactions(users[userIndex], users, userIndex);
      if (updated) {
        // Refresh user data after migration
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