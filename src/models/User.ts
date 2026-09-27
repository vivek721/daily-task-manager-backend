import pool from '../config/database';
import { QueryResult } from 'pg';

export interface User {
  id: string;
  google_id?: string;
  email: string;
  name: string;
  picture?: string;
  username?: string;
  password_hash?: string;
  auth_type: 'google' | 'local';
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface CreateUserInput {
  google_id?: string;
  email: string;
  name: string;
  picture?: string;
  username?: string;
  password_hash?: string;
  auth_type: 'google' | 'local';
}

export class UserModel {
  static async create(userData: CreateUserInput): Promise<User> {
    const { google_id, email, name, picture, username, password_hash, auth_type } = userData;

    const query = `
      INSERT INTO users (google_id, email, name, picture, username, password_hash, auth_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      google_id || null,
      email,
      name,
      picture || null,
      username || null,
      password_hash || null,
      auth_type,
    ];

    try {
      const result: QueryResult<User> = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE google_id = $1';

    try {
      const result: QueryResult<User> = await pool.query(query, [googleId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';

    try {
      const result: QueryResult<User> = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';

    try {
      const result: QueryResult<User> = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async updateLastLogin(id: string): Promise<User | null> {
    const query = `
      UPDATE users 
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result: QueryResult<User> = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  static async update(id: string, updateData: Partial<CreateUserInput>): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    try {
      const result: QueryResult<User> = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async findOrCreate(userData: CreateUserInput): Promise<User> {
    let user: User | null = null;

    if (userData.auth_type === 'google' && userData.google_id) {
      user = await this.findByGoogleId(userData.google_id);
    } else if (userData.auth_type === 'local' && userData.username) {
      user = await this.findByUsername(userData.username);
    }

    if (!user) {
      user = await this.create(userData);
    } else {
      // Update user info in case it changed
      user =
        (await this.update(user.id, {
          name: userData.name,
          picture: userData.picture,
          email: userData.email,
        })) || user;

      // Update last login
      user = (await this.updateLastLogin(user.id)) || user;
    }

    return user;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = $1 AND auth_type = $2';

    try {
      const result: QueryResult<User> = await pool.query(query, [username, 'local']);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async findByEmailAndAuthType(
    email: string,
    authType: 'google' | 'local'
  ): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND auth_type = $2';

    try {
      const result: QueryResult<User> = await pool.query(query, [email, authType]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email and auth type:', error);
      throw error;
    }
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    const query = 'SELECT id FROM users WHERE username = $1';

    try {
      const result: QueryResult = await pool.query(query, [username]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking username existence:', error);
      throw error;
    }
  }

  static async checkEmailExists(
    email: string,
    excludeAuthType?: 'google' | 'local'
  ): Promise<boolean> {
    let query = 'SELECT id FROM users WHERE email = $1';
    const values: unknown[] = [email];

    if (excludeAuthType) {
      query += ' AND auth_type != $2';
      values.push(excludeAuthType);
    }

    try {
      const result: QueryResult = await pool.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }
}
