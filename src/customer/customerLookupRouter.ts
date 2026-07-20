import { Router, Request, Response } from 'express';
import { verifyUnlockSession, lookupCustomer } from './customerLookupService';

const router = Router();

router.get('/officer/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const unlockToken = req.headers['x-unlock-token'] as string;
    if (!unlockToken) {
      res.status(401).json({ error: 'Unlock session token required' });
      return;
    }

    const session = await verifyUnlockSession(unlockToken);
    const rawCustomerId = req.params.customerId;
    const customerId = typeof rawCustomerId === 'string' ? rawCustomerId.trim() : '';

    if (!customerId) {
      res.status(400).json({ error: 'Customer ID required' });
      return;
    }

    const customer = await lookupCustomer(customerId);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({
      CustomerID: customer.CustomerID,
      CustomerName: customer.CustomerName
    });
  } catch (err: any) {
    if (err && err.status && err.message) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('Customer lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
