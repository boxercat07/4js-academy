const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log an audit event to the database
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Action type (LOGIN, LOGOUT, UPDATE_PROFILE, etc.)
 * @param {object} options - Additional options
 * @param {string} options.resourceType - Type of resource affected (USER, TRACK, etc.)
 * @param {string} options.resourceId - ID of the affected resource
 * @param {object} options.details - Additional context as object (will be stringified)
 * @param {string} options.ipAddress - Client IP address
 * @param {string} options.userAgent - User agent string
 * @param {string} options.status - Status (SUCCESS, FAILED, BLOCKED)
 */
async function auditLog(userId, action, options = {}) {
    try {
        const logEntry = await prisma.auditLog.create({
            data: {
                userId,
                action: action.toUpperCase(),
                resourceType: options.resourceType || null,
                resourceId: options.resourceId || null,
                details: options.details ? JSON.stringify(options.details) : null,
                ipAddress: options.ipAddress || null,
                userAgent: options.userAgent || null,
                status: options.status || 'SUCCESS'
            }
        });
        
        console.log('[AUDIT]', {
            action: action.toUpperCase(),
            userId: userId.substring(0, 8) + '...',
            status: options.status || 'SUCCESS',
            timestamp: logEntry.createdAt.toISOString()
        });
        
        return logEntry;
    } catch (error) {
        console.error('[AUDIT ERROR]', action, error.message);
        // Don't throw - audit logging should not break the app
        return null;
    }
}

/**
 * Get audit logs for a specific user (admin only)
 */
async function getUserAuditHistory(userId, limit = 50) {
    try {
        return await prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    } catch (error) {
        console.error('[AUDIT] Error retrieving history:', error.message);
        return [];
    }
}

/**
 * Get all audit logs (admin only)
 */
async function getAllAuditLogs(days = 30, limit = 500) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        
        return await prisma.auditLog.findMany({
            where: { createdAt: { gte: since } },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    } catch (error) {
        console.error('[AUDIT] Error retrieving logs:', error.message);
        return [];
    }
}

module.exports = {
    auditLog,
    getUserAuditHistory,
    getAllAuditLogs
};
