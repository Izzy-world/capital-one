const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  USERS: 'bank_users',
  CURRENT_USER: 'bank_current_user',
  TOKEN: 'bank_token'
};

const loadUsers = () => {
  const users = localStorage.getItem(STORAGE_KEYS.USERS);
  return users ? JSON.parse(users) : [];
};

const saveUsers = (users) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const api = {
  register: async (email, password, name, initialBalance = 0, extraData = {}) => {
    await delay(800);
    const users = loadUsers();
    if (users.find(u => u.email === email)) throw new Error('User already exists');
    
    const newUser = {
      id: Date.now(),
      email,
      password,
      name,
      ...extraData,   // fullName, dateOfBirth, phoneNumber, address, employment, etc.
      accounts: [
        { 
          id: Date.now() + 1, 
          type: 'checking', 
          accountNumber: 'CHK' + Math.floor(1000 + Math.random() * 9000), 
          balance: initialBalance, 
          available: initialBalance 
        },
        { 
          id: Date.now() + 2, 
          type: 'savings', 
          accountNumber: 'SAV' + Math.floor(1000 + Math.random() * 9000), 
          balance: 0, 
          available: 0 
        },
        { 
          id: Date.now() + 3, 
          type: 'credit', 
          accountNumber: 'CRD' + Math.floor(1000 + Math.random() * 9000), 
          balance: 0, 
          available: 5000, 
          creditLimit: 5000 
        }
      ],
      transactions: []
    };
    
    // Add initial deposit transaction if initialBalance > 0
    if (initialBalance > 0) {
      newUser.transactions.push({
        id: Date.now(),
        accountId: newUser.accounts[0].id,
        type: 'deposit',
        amount: initialBalance,
        description: 'Initial deposit',
        category: 'Income',
        date: new Date().toISOString()
      });
    }
    
    users.push(newUser);
    saveUsers(users);
    
    const token = 'fake-jwt-' + newUser.id;
    const { password: _, ...userWithoutPassword } = newUser;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));
    return { user: userWithoutPassword, token };
  },

  login: async (email, password) => {
    await delay(800);
    const users = loadUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid credentials');
    const token = 'fake-jwt-' + user.id;
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));
    return { user: userWithoutPassword, token };
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: () => {
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userJson ? JSON.parse(userJson) : null;
  },

  getAccounts: async () => {
    await delay(500);
    const currentUser = api.getCurrentUser();
    if (!currentUser) throw new Error('Not logged in');
    const users = loadUsers();
    const user = users.find(u => u.id === currentUser.id);
    return user ? user.accounts : [];
  },

  deposit: async (accountId, amount) => {
    await delay(600);
    if (amount <= 0) throw new Error('Amount must be positive');
    const users = loadUsers();
    const currentUser = api.getCurrentUser();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) throw new Error('User not found');
    const accountIndex = users[userIndex].accounts.findIndex(a => a.id === accountId);
    if (accountIndex === -1) throw new Error('Account not found');
    
    const newBalance = users[userIndex].accounts[accountIndex].balance + amount;
    users[userIndex].accounts[accountIndex].balance = newBalance;
    users[userIndex].accounts[accountIndex].available = 
      users[userIndex].accounts[accountIndex].type === 'credit' 
        ? users[userIndex].accounts[accountIndex].creditLimit - newBalance 
        : newBalance;
    
    const transaction = {
      id: Date.now(),
      accountId,
      type: 'deposit',
      amount,
      description: 'Deposit',
      category: 'Income',
      date: new Date().toISOString()
    };
    if (!users[userIndex].transactions) users[userIndex].transactions = [];
    users[userIndex].transactions.push(transaction);
    saveUsers(users);
    
    const { password: _, ...updatedUser } = users[userIndex];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    return { success: true, newBalance };
  },

  transfer: async (fromAccountId, toAccountId, amount, description = 'Transfer') => {
    await delay(600);
    if (amount <= 0) throw new Error('Amount must be positive');
    const users = loadUsers();
    const currentUser = api.getCurrentUser();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) throw new Error('User not found');

    const fromAccIndex = users[userIndex].accounts.findIndex(a => a.id === fromAccountId);
    const toAccIndex = users[userIndex].accounts.findIndex(a => a.id === toAccountId);
    if (fromAccIndex === -1 || toAccIndex === -1) throw new Error('Account not found');

    const fromAcc = users[userIndex].accounts[fromAccIndex];
    const toAcc = users[userIndex].accounts[toAccIndex];

    if (fromAcc.balance < amount) throw new Error('Insufficient funds');
    if (fromAcc.type === 'credit') throw new Error('Cannot transfer from credit card');

    fromAcc.balance -= amount;
    fromAcc.available = fromAcc.type === 'credit' ? fromAcc.creditLimit - fromAcc.balance : fromAcc.balance;
    toAcc.balance += amount;
    toAcc.available = toAcc.type === 'credit' ? toAcc.creditLimit - toAcc.balance : toAcc.balance;

    const txOut = {
      id: Date.now(),
      accountId: fromAccountId,
      type: 'transfer_out',
      amount: -amount,
      description: `Transfer to ${toAcc.type}`,
      category: 'Transfer',
      date: new Date().toISOString()
    };
    const txIn = {
      id: Date.now() + 1,
      accountId: toAccountId,
      type: 'transfer_in',
      amount: amount,
      description: `Transfer from ${fromAcc.type}`,
      category: 'Transfer',
      date: new Date().toISOString()
    };
    if (!users[userIndex].transactions) users[userIndex].transactions = [];
    users[userIndex].transactions.push(txOut, txIn);
    saveUsers(users);

    const { password: _, ...updatedUser } = users[userIndex];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    return { success: true, newBalanceFrom: fromAcc.balance, newBalanceTo: toAcc.balance };
  },

  getTransactions: async (accountId) => {
    await delay(400);
    const currentUser = api.getCurrentUser();
    const users = loadUsers();
    const user = users.find(u => u.id === currentUser.id);
    if (!user) return [];
    return (user.transactions || []).filter(t => t.accountId === accountId).sort((a,b) => new Date(b.date) - new Date(a.date));
  },

  getAllTransactions: async () => {
    await delay(400);
    const currentUser = api.getCurrentUser();
    const users = loadUsers();
    const user = users.find(u => u.id === currentUser.id);
    if (!user) return [];
    return (user.transactions || []).sort((a,b) => new Date(b.date) - new Date(a.date));
  }
};