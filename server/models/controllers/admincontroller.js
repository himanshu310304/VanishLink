const { auditLogger } = require('../../middleware/auditLogger');
const { blockIP } = require('../../middleware/ipBlocker');

const block_ip = [
  auditLogger('BLOCK_IP', (req) => `IP: ${req.body.ip}`),
  async (req, res) => {
    try {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({ message: 'IP address required' });
      }
      
      blockIP(ip);
      res.json({ success: true, message: `IP ${ip} has been blocked` });
    } catch (err) {
      console.error('Block IP error:', err);
      res.status(500).json({ message: 'Failed to block IP' });
    }
  }
];

module.exports = {
  block_ip
};