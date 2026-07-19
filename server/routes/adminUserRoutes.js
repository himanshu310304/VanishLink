// server/routes/adminUserRoutes.js
const express = require('express');
const AdminUser = require('../models/AdminUser');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// Role → features mapping (single source of truth)
const ROLE_DEFINITIONS = [
  {
    id: 'regular',
    label: 'Regular',
    description: 'Safe default for most users.',
    features: [
      'Create Deadman Links',
      'Basic link analytics',
      'Join Watch Parties',
    ],
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Power users with extended capabilities.',
    features: [
      'Everything in Regular',
      'Advanced analytics & geo insights',
      'Link collections & favorites',
      'Instant link shortening',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Full operational and audit access.',
    features: [
      'Everything in Premium',
      'Access Admin Console',
      'Manage links & users',
      'View audit logs & system config',
    ],
  },
];

/**
 * GET /api/admin/users
 * Optional query: ?search=...&role=regular|premium|admin&status=active|banned
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', role, status } = req.query;

    const q = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      q.$or = [{ name: regex }, { email: regex }];
    }

    if (role && ['regular', 'premium', 'admin'].includes(role)) {
      q.role = role;
    }

    if (status && ['active', 'banned'].includes(status)) {
      q.status = status;
    }

    const users = await AdminUser.find(q).sort({ name: 1 });

    res.json({ users });
  } catch (err) {
    console.error('Error in GET /api/admin/users:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users/roles
 * -> role definitions & features
 */
router.get('/roles', (req, res) => {
  res.json({ roles: ROLE_DEFINITIONS });
});

/**
 * POST /api/admin/users
 * Create an admin-visible user (you can use this from other flows too)
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, role = 'regular', status = 'active' } =
      req.body || {};

    if (!name || !email) {
      return res
        .status(400)
        .json({ message: 'name and email are required' });
    }

    const existing = await AdminUser.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await AdminUser.create({
      name,
      email,
      role,
      status,
      lastLoginAt: null,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('admin:user-added', user);
    }

    res.status(201).json(user);
  } catch (err) {
    console.error('Error in POST /api/admin/users:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Body: { role?, status? }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const update = {};

    if (role && ['regular', 'premium', 'admin'].includes(role)) {
      update.role = role;
    }

    if (status && ['active', 'banned'].includes(status)) {
      update.status = status;
    }

    if (Object.keys(update).length === 0) {
      return res
        .status(400)
        .json({ message: 'No valid fields provided to update.' });
    }

    const updated = await AdminUser.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create audit log manually based on the action
    if (req.user) {
      try {
        const AuditLog = require('../models/AuditLog');
        let action = 'UPDATE_USER';
        let target = `${updated.name} (${updated.email})`;
        
        if (status === 'banned') {
          action = 'BAN_USER';
          target = `Banned user: ${updated.name} (${updated.email})`;
        } else if (status === 'active' && req.body.status) {
          action = 'UNBAN_USER';
          target = `Unbanned user: ${updated.name} (${updated.email})`;
        } else if (role) {
          action = 'CHANGE_USER_ROLE';
          target = `Changed role to ${role}: ${updated.name} (${updated.email})`;
        }

        await AuditLog.create({
          action,
          adminId: req.user.sub || req.user._id,
          adminEmail: req.user.email,
          adminName: req.user.name || req.user.email,
          target,
          targetId: updated._id.toString(),
          details: { update, previousRole: role ? 'changed' : 'same', previousStatus: status ? 'changed' : 'same' },
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        });
        console.log(`📝 Audit log created: ${action} for ${updated.email}`);
      } catch (auditErr) {
        console.error('Failed to create audit log:', auditErr.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('admin:user-updated', updated);
    }

    res.json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/admin/users/:id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
