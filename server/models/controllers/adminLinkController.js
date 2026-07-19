// controllers/adminLinkController.js
const Link = require('../models/Link'); // adjust path if different

// GET /api/admin/links
// ?page=1&limit=10&search=abc&status=active|blocked|expired|all
exports.getAdminLinks = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
    } = req.query;

    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;

    const query = {};

    // 🔍 search by slug, title, or destination
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { slug: regex },
        { title: regex },
        { destination: regex },
      ];
    }

    // 🟢 status filter (ignore "all" / "ALL STATUS")
    const normalizedStatus = String(status).toLowerCase();
    if (
      normalizedStatus &&
      normalizedStatus !== 'all' &&
      normalizedStatus !== 'all status'
    ) {
      query.status = normalizedStatus; // should be 'active' | 'blocked' | 'expired'
    }

    const skip = (page - 1) * limit;

    const [links, totalLinks] = await Promise.all([
      Link.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Link.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalLinks / limit));

    return res.json({
      links,
      page,
      totalPages,
      totalLinks,
    });
  } catch (err) {
    console.error('Error in getAdminLinks:', err);
    res.status(500).json({ message: 'Failed to fetch links' });
  }
};
