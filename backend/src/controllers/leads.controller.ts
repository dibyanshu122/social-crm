import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { getEffectiveUser } from '../utils/team';

// Get all leads (Database-backed with seeding fallback)
export const getLeads = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const email = req.user?.email as string;

  try {
    const { effectiveUserId } = await getEffectiveUser(userId, email);

    let leads = await prisma.lead.findMany({
      where: { userId: effectiveUserId },
      orderBy: { createdAt: 'desc' }
    });

    // Seed initial realistic leads if DB is empty
    if (leads.length === 0) {
      await prisma.lead.createMany({
        data: [
          {
            userId,
            name: 'Rahul Sharma',
            email: 'rahul.sharma@example.com',
            phone: '+91 98765 43210',
            platform: 'facebook',
            formName: 'Summer Promo Instant Form',
            status: 'NEW',
            notes: 'Interested in digital marketing automation package'
          },
          {
            userId,
            name: 'Priya Verma',
            email: 'priya.verma@techcorp.in',
            phone: '+91 98123 45678',
            platform: 'instagram',
            formName: 'Instagram Lead Generation Ad',
            status: 'CONTACTED',
            notes: 'Follow-up call scheduled for tomorrow 2 PM'
          },
          {
            userId,
            name: 'Vikram Patel',
            email: 'vikram@enterprise.com',
            phone: '+91 97654 32109',
            platform: 'google',
            formName: 'Search Ad High Intent Form',
            status: 'CONVERTED',
            notes: 'Signed up for Enterprise Plan ($1,200/mo)'
          }
        ]
      });

      leads = await prisma.lead.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// Create a new Lead
export const createLead = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const { name, email, phone, platform, formName, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required.' });
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        userId,
        name,
        email,
        phone: phone || null,
        platform: platform || 'facebook',
        formName: formName || 'Direct Manual Entry',
        status: 'NEW',
        notes: notes || null
      }
    });

    return res.status(201).json({ message: 'Lead created successfully', lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ error: 'Failed to create lead' });
  }
};

// Update Lead Status
export const updateLeadStatus = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const leadId = req.params.leadId as string;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const existing = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: status.toUpperCase(),
        ...(notes !== undefined && { notes })
      }
    });

    return res.status(200).json({ message: 'Lead updated successfully', lead: updated });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
};

// Export Leads to CSV
export const exportLeadsCSV = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;

  try {
    const leads = await prisma.lead.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    let csvContent = 'ID,Name,Email,Phone,Platform,Form Name,Status,Notes,Created At\n';
    for (const l of leads) {
      const row = [
        l.id,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        l.platform,
        `"${(l.formName || '').replace(/"/g, '""')}"`,
        l.status,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        l.createdAt.toISOString()
      ];
      csvContent += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="crm_leads_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting leads CSV:', error);
    return res.status(500).json({ error: 'Failed to export leads CSV' });
  }
};
