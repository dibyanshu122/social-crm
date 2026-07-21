import { Router } from 'express';
import { getLeads, createLead, updateLeadStatus, exportLeadsCSV } from '../controllers/leads.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getLeads);
router.post('/', createLead);
router.put('/:leadId/status', updateLeadStatus);
router.get('/export/csv', exportLeadsCSV);

export default router;
