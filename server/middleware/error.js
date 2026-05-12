export const notFound = (req, res) =>
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });

export const errorHandler = (err, req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
