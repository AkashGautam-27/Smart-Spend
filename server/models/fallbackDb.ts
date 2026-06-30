import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';

const FALLBACK_DB_PATH = path.resolve(__dirname, '..', 'uploads', 'fallback_db.json');

// Ensure directory exists
const uploadsDir = path.dirname(FALLBACK_DB_PATH);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-memory data store structure
interface DbStore {
  users: any[];
  transactions: any[];
  budgets: any[];
  categories: any[];
}

// Load data from file or initialize
function loadDb(): DbStore {
  try {
    if (fs.existsSync(FALLBACK_DB_PATH)) {
      const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[FallbackDB] Error reading JSON file:', error);
  }
  
  const initialDb: DbStore = {
    users: [],
    transactions: [],
    budgets: [],
    categories: []
  };
  saveDb(initialDb);
  return initialDb;
}

// Save data to file
function saveDb(data: DbStore) {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[FallbackDB] Error writing JSON file:', error);
  }
}

// Helper to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Check if a document matches a Mongoose query
function matchesQuery(doc: any, query: any): boolean {
  if (!query) return true;
  
  for (const key in query) {
    const val = query[key];
    
    if (key === '$or' && Array.isArray(val)) {
      const matchAny = val.some(subQuery => matchesQuery(doc, subQuery));
      if (!matchAny) return false;
      continue;
    }
    
    // Exact matching for _id or id
    if (key === '_id' || key === 'id') {
      const docId = (doc._id || doc.id || '').toString();
      const queryId = (val._id || val.id || val || '').toString();
      if (docId !== queryId) return false;
      continue;
    }
    
    // Regular expression matching
    if (val instanceof RegExp) {
      if (!val.test(doc[key])) return false;
      continue;
    }
    
    if (val && typeof val === 'object' && '$regex' in val) {
      const regexVal = val.$regex;
      const regex = regexVal instanceof RegExp ? regexVal : new RegExp(regexVal);
      if (!regex.test(doc[key])) return false;
      continue;
    }

    // Direct comparison (handling object values as strings if compared with strings, e.g., ObjectId)
    const docVal = doc[key] ? doc[key].toString() : '';
    const queryVal = val ? val.toString() : '';
    if (docVal !== queryVal) return false;
  }
  
  return true;
}

export function makeFallbackModel(collectionName: keyof DbStore) {
  // A helper class that acts like a Mongoose document
  class DocumentInstance {
    [key: string]: any;

    constructor(data: any) {
      Object.assign(this, data);
      if (!this._id && !this.id) {
        this._id = generateId();
        this.id = this._id;
      }
      if (this._id && !this.id) {
        this.id = this._id.toString();
      }
      if (!this.createdAt) {
        this.createdAt = new Date();
      }
      this.updatedAt = new Date();

      if (collectionName === 'users') {
        this.comparePassword = async function (password: string): Promise<boolean> {
          return bcryptjs.compare(password, this.password);
        };
      }
    }

    async save() {
      // Automatic password hashing for new/modified raw passwords in fallback user model
      if (collectionName === 'users' && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
        try {
          const salt = await bcryptjs.genSalt(10);
          this.password = await bcryptjs.hash(this.password, salt);
        } catch (err) {
          console.error('[FallbackDB] Error hashing password:', err);
        }
      }

      const db = loadDb();
      const index = db[collectionName].findIndex(
        item => (item._id || item.id || '').toString() === (this._id || this.id || '').toString()
      );

      // Extract JSON data
      const docData = { ...this };
      // Delete functions from instance data
      for (const key in docData) {
        if (typeof docData[key] === 'function') {
          delete docData[key];
        }
      }

      if (index >= 0) {
        db[collectionName][index] = docData;
      } else {
        db[collectionName].push(docData);
      }

      saveDb(db);
      return this;
    }

    toObject() {
      const obj = { ...this };
      if (obj._id) {
        obj.id = obj._id.toString();
      }
      return obj;
    }

    toJSON() {
      return this.toObject();
    }
  }

  // Chain helper class for query manipulation (sort, limit, skip, select)
  class QueryChain {
    private items: any[];
    private isSingle: boolean;

    constructor(items: any[], isSingle: boolean = false) {
      // Create a shallow copy to prevent direct mutation of state array
      this.items = [...items];
      this.isSingle = isSingle;
    }

    sort(sortSpec: any) {
      if (sortSpec && typeof sortSpec === 'object') {
        const keys = Object.keys(sortSpec);
        this.items.sort((a, b) => {
          for (const key of keys) {
            const dir = sortSpec[key];
            const valA = a[key];
            const valB = b[key];
            if (valA < valB) return dir === -1 ? 1 : -1;
            if (valA > valB) return dir === -1 ? -1 : 1;
          }
          return 0;
        });
      }
      return this;
    }

    skip(num: number) {
      this.items = this.items.slice(num);
      return this;
    }

    limit(num: number) {
      this.items = this.items.slice(0, num);
      return this;
    }

    select(spec: string) {
      // Basic select simulation (e.g. select('-password') or select('name email'))
      if (spec && typeof spec === 'string') {
        const parts = spec.trim().split(/\s+/);
        const exclude = parts.every(p => p.startsWith('-'));
        
        this.items = this.items.map(item => {
          const clone = { ...item };
          if (exclude) {
            parts.forEach(p => {
              const field = p.substring(1);
              delete clone[field];
            });
          } else {
            const finalItem: any = { _id: clone._id, id: clone.id };
            parts.forEach(field => {
              if (field in clone) {
                finalItem[field] = clone[field];
              }
            });
            return finalItem;
          }
          return clone;
        });
      }
      return this;
    }

    populate(spec: any) {
      return this;
    }

    lean() {
      return this;
    }

    // Resolves to DocumentInstance(s)
    async exec() {
      if (this.isSingle) {
        const found = this.items[0];
        return found ? new DocumentInstance(found) : null;
      }
      return this.items.map(item => new DocumentInstance(item));
    }

    // Make the chain thenable so user can await the QueryChain directly
    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      return this.exec().then(onfulfilled, onrejected);
    }
  }

  return class FallbackModel {
    static find(query: any = {}) {
      const db = loadDb();
      const filtered = db[collectionName].filter(item => matchesQuery(item, query));
      return new QueryChain(filtered, false);
    }

    static findOne(query: any = {}) {
      const db = loadDb();
      const found = db[collectionName].find(item => matchesQuery(item, query));
      return new QueryChain(found ? [found] : [], true);
    }

    static findById(id: any) {
      const db = loadDb();
      if (!id) return new QueryChain([], true);
      const stringId = id.toString();
      const found = db[collectionName].find(
        item => (item._id || item.id || '').toString() === stringId
      );
      return new QueryChain(found ? [found] : [], true);
    }

    static async create(data: any) {
      const doc = new DocumentInstance(data);
      await doc.save();
      return doc;
    }

    static async insertMany(array: any[]) {
      const docs = array.map(data => new DocumentInstance(data));
      for (const doc of docs) {
        await doc.save();
      }
      return docs;
    }

    static async countDocuments(query: any = {}) {
      const db = loadDb();
      return db[collectionName].filter(item => matchesQuery(item, query)).length;
    }

    static async deleteOne(query: any = {}) {
      const db = loadDb();
      const index = db[collectionName].findIndex(item => matchesQuery(item, query));
      if (index >= 0) {
        db[collectionName].splice(index, 1);
        saveDb(db);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }

    static async deleteMany(query: any = {}) {
      const db = loadDb();
      const initialLength = db[collectionName].length;
      db[collectionName] = db[collectionName].filter(item => !matchesQuery(item, query));
      saveDb(db);
      return { deletedCount: initialLength - db[collectionName].length };
    }

    static findOneAndDelete(query: any = {}) {
      const db = loadDb();
      const index = db[collectionName].findIndex(item => matchesQuery(item, query));
      let removed = null;
      if (index >= 0) {
        removed = db[collectionName].splice(index, 1)[0];
        saveDb(db);
      }
      return new QueryChain(removed ? [removed] : [], true);
    }

    static findByIdAndDelete(id: any) {
      if (!id) return new QueryChain([], true);
      return this.findOneAndDelete({ _id: id });
    }

    static findOneAndUpdate(query: any, update: any, options: any = {}) {
      const db = loadDb();
      const index = db[collectionName].findIndex(item => matchesQuery(item, query));
      let result = null;
      if (index >= 0) {
        const existing = db[collectionName][index];
        const updated = { ...existing };
        
        // Apply $set or direct update
        const fieldsToUpdate = update.$set || update;
        Object.assign(updated, fieldsToUpdate);
        updated.updatedAt = new Date().toISOString();
        
        db[collectionName][index] = updated;
        saveDb(db);
        result = updated;
      } else if (options.upsert) {
        const newDoc = { ...query };
        const fieldsToUpdate = update.$set || update;
        Object.assign(newDoc, fieldsToUpdate);
        newDoc._id = generateId();
        newDoc.id = newDoc._id;
        newDoc.createdAt = new Date().toISOString();
        newDoc.updatedAt = new Date().toISOString();
        db[collectionName].push(newDoc);
        saveDb(db);
        result = newDoc;
      }
      return new QueryChain(result ? [result] : [], true);
    }

    static findByIdAndUpdate(id: any, update: any, options: any = {}) {
      return this.findOneAndUpdate({ _id: id }, update, options);
    }

    // Custom aggregate engine specifically tailored to our dashboard and monthly queries
    static async aggregate(pipeline: any[]) {
      const db = loadDb();
      const list = db[collectionName];
      
      // Determine match criteria
      let matchUserId: string | null = null;
      let matchType: string | null = null;
      let dateRegex: string | null = null;

      // Extract details from match stage
      const matchStage = pipeline.find(p => p.$match);
      if (matchStage) {
        const m = matchStage.$match;
        if (m.userId) matchUserId = m.userId.toString();
        if (m.type) matchType = m.type;
        if (m.date && m.date.$regex) {
          // Convert string or regex to clean string matching
          dateRegex = m.date.$regex.toString().replace(/^\/\^?|\/?\$/g, '');
        }
      }

      // Filter based on extracted criteria
      let filtered = list;
      if (matchUserId) {
        filtered = filtered.filter(item => (item.userId || '').toString() === matchUserId);
      }
      if (matchType) {
        filtered = filtered.filter(item => item.type === matchType);
      }
      if (dateRegex) {
        const r = new RegExp(dateRegex);
        filtered = filtered.filter(item => r.test(item.date || ''));
      }

      // Check the $group stage to determine aggregation behavior
      const groupStage = pipeline.find(p => p.$group);
      if (groupStage) {
        const g = groupStage.$group;
        const groupKey = g._id;
        
        // 1. Calculate Total Income, Expense, Net Savings (g._id is '$type')
        if (groupKey === '$type') {
          const statsMap: { [key: string]: number } = { income: 0, expense: 0 };
          filtered.forEach(item => {
            if (item.type === 'income' || item.type === 'expense') {
              statsMap[item.type] = (statsMap[item.type] || 0) + (item.amount || 0);
            }
          });
          return Object.entries(statsMap).map(([type, total]) => ({
            _id: type,
            total
          }));
        }

        // 2. Category Expense Breakdown (g._id is '$category')
        if (groupKey === '$category') {
          const categoriesMap: { [key: string]: number } = {};
          filtered.forEach(item => {
            categoriesMap[item.category] = (categoriesMap[item.category] || 0) + (item.amount || 0);
          });
          const results = Object.entries(categoriesMap).map(([cat, total]) => ({
            _id: cat,
            totalAmount: total,
            spend: total // supporting both aliases
          }));
          
          // Apply sorting if any
          const sortStage = pipeline.find(p => p.$sort);
          if (sortStage) {
            const s = sortStage.$sort;
            if (s.totalAmount === -1 || s.spend === -1) {
              results.sort((a, b) => b.totalAmount - a.totalAmount);
            }
          }
          return results;
        }

        // 3. Historical Year-Month (Project then Group by Month and Type)
        if (typeof groupKey === 'object' && groupKey.month === '$yearMonth') {
          const reportMap: { [key: string]: number } = {};
          filtered.forEach(item => {
            const month = (item.date || '').slice(0, 7); // Extract YYYY-MM
            const type = item.type;
            const key = `${month}:${type}`;
            reportMap[key] = (reportMap[key] || 0) + (item.amount || 0);
          });

          const results = Object.entries(reportMap).map(([key, total]) => {
            const [month, type] = key.split(':');
            return {
              _id: { month, type },
              total
            };
          });

          // Sorting by month
          results.sort((a, b) => a._id.month.localeCompare(b._id.month));
          return results;
        }
      }

      return filtered.map(item => new DocumentInstance(item));
    }

    // Support Mongoose model constructor instantiation e.g. new User(data)
    constructor(data: any) {
      return new DocumentInstance(data);
    }
  };
}

// Global flag to track connection fallback status
declare global {
  var isMongoOffline: boolean;
}

global.isMongoOffline = false;

// Check fallback and wrap a Mongoose Model
export function wrapModel(modelName: keyof DbStore, mongooseModel: any) {
  const fallback = makeFallbackModel(modelName);
  
  // Return a proxy that directs requests based on the offline flag
  return new Proxy(mongooseModel, {
    construct(target, args) {
      if (global.isMongoOffline) {
        return Reflect.construct(fallback, args);
      }
      return Reflect.construct(target, args);
    },
    get(target, prop, receiver) {
      if (global.isMongoOffline) {
        // If the prop exists on fallback model, return it
        if (prop in fallback) {
          return (fallback as any)[prop];
        }
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
