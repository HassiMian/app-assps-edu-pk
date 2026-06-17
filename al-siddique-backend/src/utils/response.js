const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendError = (res, message = 'Internal server error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, data, total, page, limit, message = 'Data fetched successfully') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

const sendNotFound = (res, message = 'Resource not found') => sendError(res, message, 404);
const sendUnauthorized = (res, message = 'Unauthorized access') => sendError(res, message, 401);
const sendForbidden = (res, message = 'Access forbidden') => sendError(res, message, 403);
const sendBadRequest = (res, message = 'Bad request', errors = null) => sendError(res, message, 400, errors);
const sendConflict = (res, message = 'Resource already exists') => sendError(res, message, 409);

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendPaginated,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
  sendConflict,
};