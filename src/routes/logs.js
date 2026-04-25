const express = require('express');
const fs = require('fs');
const path = require('path');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Get available log files
router.get('/files', async (req, res) => {
  try {
    const logDir = path.join(__dirname, '../../logs');
    
    if (!fs.existsSync(logDir)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    const files = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified - a.modified);
    
    res.json({
      success: true,
      files
    });
  } catch (error) {
    logger.error('Error fetching log files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log files'
    });
  }
});

// Get log file content
router.get('/view/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { lines = 100, search = '' } = req.query;
    
    // Security: Only allow .log files and prevent directory traversal
    if (!filename.endsWith('.log') || filename.includes('..') || filename.includes('/')) {
      throw ApiError.badRequest('Invalid log file name');
    }
    
    const logFile = path.join(__dirname, '../../logs', filename);
    
    if (!fs.existsSync(logFile)) {
      throw ApiError.notFound('Log file not found');
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim());
    
    // Filter by search term if provided
    let filteredLines = allLines;
    if (search) {
      filteredLines = allLines.filter(line => 
        line.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Get last N lines
    const lineCount = parseInt(lines) || 100;
    const displayLines = filteredLines.slice(-lineCount);
    
    // Parse log lines for better display
    const parsedLines = displayLines.map(line => {
      try {
        // Try to parse as JSON log
        const parsed = JSON.parse(line);
        return {
          timestamp: parsed.timestamp || '',
          level: parsed.level || 'info',
          message: parsed.message || '',
          raw: line
        };
      } catch {
        // Not JSON, return as-is
        return {
          timestamp: '',
          level: 'info',
          message: line,
          raw: line
        };
      }
    });
    
    res.json({
      success: true,
      filename,
      totalLines: allLines.length,
      filteredLines: filteredLines.length,
      displayedLines: parsedLines.length,
      lines: parsedLines
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error viewing log file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read log file'
    });
  }
});

// Download log file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Only allow .log files and prevent directory traversal
    if (!filename.endsWith('.log') || filename.includes('..') || filename.includes('/')) {
      throw ApiError.badRequest('Invalid log file name');
    }
    
    const logFile = path.join(__dirname, '../../logs', filename);
    
    if (!fs.existsSync(logFile)) {
      throw ApiError.notFound('Log file not found');
    }
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(logFile);
    fileStream.pipe(res);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error downloading log file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download log file'
    });
  }
});

// Clear log file (only if it's not today's file)
router.delete('/clear/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Only allow .log files and prevent directory traversal
    if (!filename.endsWith('.log') || filename.includes('..') || filename.includes('/')) {
      throw ApiError.badRequest('Invalid log file name');
    }
    
    // Don't allow clearing today's log file
    const today = new Date().toISOString().split('T')[0];
    if (filename.includes(today)) {
      throw ApiError.badRequest('Cannot clear today\'s log file');
    }
    
    const logFile = path.join(__dirname, '../../logs', filename);
    
    if (!fs.existsSync(logFile)) {
      throw ApiError.notFound('Log file not found');
    }
    
    fs.writeFileSync(logFile, '');
    
    logger.info(`Log file cleared: ${filename}`);
    
    res.json({
      success: true,
      message: `Log file ${filename} cleared successfully`
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error clearing log file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear log file'
    });
  }
});

module.exports = router;
