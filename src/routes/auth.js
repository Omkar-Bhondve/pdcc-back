const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');
const { validateBody } = require('../middleware/validate');
const { loginRateLimiter } = require('../config/rateLimiters');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { customValidators } = require('../utils/validators');

const registerSchema = Joi.object({
  email: customValidators.email,
  password: customValidators.strongPassword,
  full_name: Joi.string().min(2).max(100).required(),
  role_id: Joi.number().integer().positive().optional()
});

const loginSchema = Joi.object({
  email: customValidators.email,
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required()
});

const logoutSchema = Joi.object({
  refresh_token: Joi.string().optional()
});

const forgotPasswordSchema = Joi.object({
  email: customValidators.email
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  new_password: customValidators.strongPassword
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: customValidators.strongPassword
});

router.post('/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, result, 'Registration successful');
  })
);

router.post('/admin/login',
  loginRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return ApiResponse.success(res, result, 'Login successful');
  })
);

router.post('/login',
  loginRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return ApiResponse.success(res, result, 'Login successful');
  })
);

router.post('/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refreshTokens(req.body.refresh_token);
    return ApiResponse.success(res, result, 'Token refreshed successfully');
  })
);

router.post('/logout',
  validateBody(logoutSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.body.refresh_token);
    return ApiResponse.success(res, result, 'Logged out successfully');
  })
);

router.post('/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return ApiResponse.success(res, result);
  })
);

router.post('/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, new_password } = req.body;
    const result = await authService.resetPassword(token, new_password);
    return ApiResponse.success(res, result);
  })
);

router.post('/admin/change-password',
  authenticateToken,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;
    const result = await authService.changePassword(req.user.user_id, current_password, new_password);
    return ApiResponse.success(res, result, 'Password changed successfully');
  })
);

module.exports = router;
