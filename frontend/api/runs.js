module.exports = function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    // No database in this deployment — return empty list
    return res.status(200).json([]);
};
