import User from './User.js';
import Account from './Account.js';
import Transaction from './Transaction.js';
import Invoice from './Invoice.js';
import InvoiceItem from './InvoiceItem.js';
import Token from './Token.js';

// User - Account
User.hasMany(Account, { foreignKey: 'user_id' });
Account.belongsTo(User, { foreignKey: 'user_id' });

// User - Transaction
User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

// Account - Transaction
Account.hasMany(Transaction, { foreignKey: 'account_id' });
Transaction.belongsTo(Account, { foreignKey: 'account_id' });

// Invoice - InvoiceItem
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// User - Invoice
User.hasMany(Invoice, { foreignKey: 'user_id' });
Invoice.belongsTo(User, { foreignKey: 'user_id' });

// User - Token
User.hasMany(Token, { foreignKey: 'user_id' });
Token.belongsTo(User, { foreignKey: 'user_id' });

export { User, Account, Transaction, Invoice, InvoiceItem, Token }; 