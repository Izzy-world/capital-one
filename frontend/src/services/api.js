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
      ...extraData,
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
    
    // Helper to generate random past dates
    const randomPastDate = (monthsAgoMax) => {
      const date = new Date();
      const monthsBack = Math.random() * monthsAgoMax;
      date.setMonth(date.getMonth() - monthsBack);
      // Random day within month
      date.setDate(Math.floor(Math.random() * 28) + 1);
      return date.toISOString();
    };
    
    // 1. Initial deposit (6 months ago, fixed)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (initialBalance > 0) {
      newUser.transactions.push({
        id: Date.now(),
        accountId: newUser.accounts[0].id,
        type: 'deposit',
        amount: initialBalance,
        description: 'Initial deposit',
        category: 'Income',
        date: sixMonthsAgo.toISOString()
      });
    }
    
    // 2. Generate many realistic past transactions (spending & small deposits)
    const spendingCategories = [
      { cat: 'Groceries', desc: ['Whole Foods', 'Trader Joe\'s', 'Kroger', 'Safeway', 'Aldi'] },
      { cat: 'Dining', desc: ['Starbucks', 'Chipotle', 'McDonald\'s', 'Panera Bread', 'Local Pizzeria'] },
      { cat: 'Shopping', desc: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Home Depot'] },
      { cat: 'Entertainment', desc: ['Netflix', 'Spotify', 'Disney+', 'Hulu', 'Cinema'] },
      { cat: 'Bills', desc: ['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill', 'Rent'] },
      { cat: 'Transport', desc: ['Uber', 'Lyft', 'Gas Station', 'Public Transit', 'Parking'] },
      { cat: 'Health', desc: ['Pharmacy', 'Doctor Visit', 'Gym Membership', 'Vitamins'] },
      { cat: 'Transfer', desc: ['Transfer to savings', 'Transfer to credit card'] }
    ];
    
    // Create 15 random transactions over the last 6 months
    const numTx = 18;
    for (let i = 0; i < numTx; i++) {
      const categoryObj = spendingCategories[Math.floor(Math.random() * spendingCategories.length)];
      const description = categoryObj.desc[Math.floor(Math.random() * categoryObj.desc.length)];
      let amount;
      let type;
      let category = categoryObj.cat;
      
      if (category === 'Transfer') {
        // Transfer to savings (outgoing)
        amount = -(Math.floor(Math.random() * 500) + 50);
        type = 'transfer_out';
      } else if (category === 'Income') {
        amount = Math.floor(Math.random() * 3000) + 500;
        type = 'deposit';
      } else {
        // Regular spending
        amount = -(Math.floor(Math.random() * 200) + 5);
        type = 'withdrawal';
      }
      
      // Ensure total spending doesn't exceed initial balance too much (just for realism)
      // but we don't enforce hard limit.
      newUser.transactions.push({
        id: Date.now() + i + 1000,
        accountId: newUser.accounts[0].id,
        type: type,
        amount: amount,
        description: description,
        category: category,
        date: randomPastDate(5.5) // within last 5.5 months (before initial deposit)
      });
    }
    
    // Add a couple of small deposits (paychecks)
    for (let i = 0; i < 3; i++) {
      newUser.transactions.push({
        id: Date.now() + i + 2000,
        accountId: newUser.accounts[0].id,
        type: 'deposit',
        amount: Math.floor(Math.random() * 2500) + 1500,
        description: 'Direct deposit - Payroll',
        category: 'Income',
        date: randomPastDate(5)
      });
    }
    
    // Sort transactions by date (oldest first for later sorting in dashboard)
    newUser.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
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