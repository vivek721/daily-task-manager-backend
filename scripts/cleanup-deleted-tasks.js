#!/usr/bin/env node

/**
 * Cleanup script for expired deleted tasks
 * This script should be run periodically (e.g., every hour) to cleanup
 * tasks that have been soft-deleted for more than 1 day
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function cleanupExpiredDeletedTasks() {
  const client = await pool.connect();
  
  try {
    console.log(`[${new Date().toISOString()}] Starting cleanup of expired deleted tasks...`);
    
    // Get count of tasks to be deleted
    const countResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '1 day'
    `);
    
    const tasksToDelete = parseInt(countResult.rows[0].count);
    
    if (tasksToDelete === 0) {
      console.log('No expired deleted tasks found.');
      return;
    }
    
    console.log(`Found ${tasksToDelete} expired deleted tasks to cleanup...`);
    
    // Call the cleanup function
    const result = await client.query('SELECT cleanup_expired_deleted_tasks() as deleted_count');
    const actualDeleted = result.rows[0].deleted_count;
    
    console.log(`Successfully cleaned up ${actualDeleted} expired deleted tasks.`);
    
    // Log cleanup statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_tasks,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted_tasks,
        COUNT(*) as total_tasks
      FROM tasks
    `);
    
    const stats = statsResult.rows[0];
    console.log(`Database stats: ${stats.active_tasks} active, ${stats.soft_deleted_tasks} soft-deleted, ${stats.total_tasks} total tasks`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await cleanupExpiredDeletedTasks();
    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { cleanupExpiredDeletedTasks };