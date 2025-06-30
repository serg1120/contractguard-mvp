import bcrypt from 'bcrypt';
import { query } from '../utils/database';

export interface User {
  id?: number;
  email: string;
  password_hash?: string;
  company_name?: string;
  full_name?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel {
  static async create(userData: {
    email: string;
    password: string;
    company_name?: string;
    full_name?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const result = await query(
      `INSERT INTO users (email, password_hash, company_name, full_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, company_name, full_name, created_at`,
      [userData.email, hashedPassword, userData.company_name, userData.full_name]
    );
    
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await query(
      'SELECT id, email, company_name, full_name, created_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  static async update(id: number, updates: Partial<User>): Promise<User | null> {
    const allowedFields = ['company_name', 'full_name'];
    const updateFields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!updateFields) return null;
    
    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key as keyof User]);
    
    const result = await query(
      `UPDATE users SET ${updateFields} WHERE id = $1 
       RETURNING id, email, company_name, full_name`,
      [id, ...values]
    );
    
    return result.rows[0] || null;
  }
}