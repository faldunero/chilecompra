module.exports = function handler(req, res) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: { ticketConfigured: !!process.env.CHILECOMPRA_TICKET },
  });
};
