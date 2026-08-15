import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { isAdmin, isSuperAdmin } from '../middleware/roleCheck.js';
import { listAuditLogs, exportAuditLogsCsv, deleteAuditLogs } from '../controllers/audit.controller.js';
import { addSseClient } from '../middleware/auditLogger.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, listAuditLogs);

// Live stream of audit logs via Server-Sent Events
router.get('/stream', verifyToken, isAdmin, (req, res) => {
	// CORS headers for SSE with credentials
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	// Mirror app CORS origin if present (dev)
	if (process.env.NODE_ENV !== 'production') {
		res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
		res.setHeader('Access-Control-Allow-Credentials', 'true');
	}

	// Initial comment to establish stream
	res.write(': connected\n\n');

	// Heartbeat every 25s to keep connections alive through proxies
	const hb = setInterval(() => {
		try { res.write(': ping\n\n'); } catch (_) {}
	}, 25000);

	// Register client and clean up on close
	addSseClient(res);
	req.on('close', () => clearInterval(hb));
});

export default router;

// CSV export (superadmin only)
router.get('/export', verifyToken, isSuperAdmin, exportAuditLogsCsv);
router.delete('/', verifyToken, isSuperAdmin, deleteAuditLogs);