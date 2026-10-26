const jwt = require('jsonwebtoken');

// Checks: "Is this user logged in at all?"
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, access denied' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer <token>" → grab just the token part

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attaches { id, role } to the request so later code can use it
    next(); // token is valid, let the request continue
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Checks: "Is this logged-in user one of the allowed roles?"
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }
    next();
  };
};