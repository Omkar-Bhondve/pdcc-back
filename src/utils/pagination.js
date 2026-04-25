const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

const getSortParams = (query, allowedFields = []) => {
  const sort = query.sort || 'created_at';
  const order = (query.order || 'DESC').toUpperCase();
  
  if (allowedFields.length > 0 && !allowedFields.includes(sort)) {
    return { sort: 'created_at', order: 'DESC' };
  }
  
  if (!['ASC', 'DESC'].includes(order)) {
    return { sort, order: 'DESC' };
  }
  
  return { sort, order };
};

const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

module.exports = {
  getPaginationParams,
  getSortParams,
  buildPaginationResponse
};
