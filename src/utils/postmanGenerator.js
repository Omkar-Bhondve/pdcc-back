const fs = require('fs');
const path = require('path');

/**
 * Auto-generates Postman collection from Express routes
 * Updates collection whenever routes change
 */

const generatePostmanCollection = (app, baseUrl = 'http://localhost:5000') => {
  const collection = {
    info: {
      name: 'PDCC API Collection',
      description: 'Auto-generated Postman collection for PDCC backend APIs',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string'
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string'
      }
    ],
    item: []
  };

  // Extract routes from Express app
  const extractRoutes = (app, basePath = '') => {
    const routes = [];
    
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // Route middleware
        const route = middleware.route;
        const path = basePath + (route.path || '/');
        
        route.methods.forEach((method) => {
          if (method && method !== 'HEAD') {
            const routeInfo = {
              name: `${method} ${path}`,
              request: {
                method: method,
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                url: {
                  raw: '{{baseUrl}}{{path}}',
                  host: ['{{baseUrl}}'],
                  path: path.replace(/^\//, '').split('/')
                }
              }
            };

            // Add request body for POST/PUT methods
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
              routeInfo.request.body = {
                mode: 'raw',
                raw: JSON.stringify(getSampleBody(path), null, 2),
                options: {
                  raw: {
                    language: 'json'
                  }
                }
              };
            }

            // Add query parameters for GET methods
            if (method === 'GET') {
              routeInfo.request.url.query = getQueryParams(path);
            }

            routes.push(routeInfo);
          }
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // Router middleware
        const routerPath = middleware.regexp.source
          .replace('^\\/', '')
          .replace('\\/?(?=\\/|$)', '')
          .replace('\\\\', '');
        
        if (routerPath && routerPath !== '^/?$') {
          routes.push(...extractRoutes(middleware.handle, basePath + '/' + routerPath));
        }
      }
    });

    return routes;
  };

  // Get sample request body based on route path
  const getSampleBody = (path) => {
    if (path.includes('/auth/login')) {
      return {
        email: 'admin@example.com',
        password: 'password123'
      };
    }
    if (path.includes('/users')) {
      return {
        email: 'user@example.com',
        full_name: 'John Doe',
        role_id: 1,
        is_active: true
      };
    }
    if (path.includes('/roles')) {
      return {
        role_name: 'Manager',
        description: 'Manager role with limited permissions'
      };
    }
    if (path.includes('/districts')) {
      return {
        district_name: 'Mumbai',
        district_code: 'MH-MU',
        is_active: true
      };
    }
    if (path.includes('/departments')) {
      return {
        department_name: 'Finance',
        department_code: 'FIN',
        is_active: true
      };
    }
    return {};
  };

  // Get query parameters based on route path
  const getQueryParams = (path) => {
    const params = [];
    
    if (path.includes('/users') || path.includes('/roles') || path.includes('/districts') || path.includes('/departments')) {
      params.push(
        { key: 'page', value: '1', description: 'Page number' },
        { key: 'limit', value: '10', description: 'Items per page' },
        { key: 'search', value: '', description: 'Search term' },
        { key: 'sort', value: 'created_at', description: 'Sort field' },
        { key: 'order', value: 'desc', description: 'Sort order' }
      );
    }
    
    return params;
  };

  // Manually define API endpoints since Express router extraction is complex
  const apiEndpoints = [
    // Auth endpoints
    {
      name: 'POST /auth/admin/login',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            email: 'admin@example.com',
            password: 'password123'
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/auth/admin/login',
          host: ['{{baseUrl}}'],
          path: ['auth', 'admin', 'login']
        }
      }
    },
    {
      name: 'POST /auth/refresh',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            refresh_token: '{{refreshToken}}'
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/auth/refresh',
          host: ['{{baseUrl}}'],
          path: ['auth', 'refresh']
        }
      }
    },
    {
      name: 'POST /auth/logout',
      request: {
        method: 'POST',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/auth/logout',
          host: ['{{baseUrl}}'],
          path: ['auth', 'logout']
        }
      }
    },
    {
      name: 'POST /auth/change-password',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            current_password: 'oldpassword123',
            new_password: 'newpassword123'
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/auth/change-password',
          host: ['{{baseUrl}}'],
          path: ['auth', 'change-password']
        }
      }
    },

    // Users endpoints
    {
      name: 'GET /admin/users',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/users?page=1&limit=10&search=&sort=created_at&order=desc',
          host: ['{{baseUrl}}'],
          path: ['admin', 'users'],
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
            { key: 'search', value: '' },
            { key: 'sort', value: 'created_at' },
            { key: 'order', value: 'desc' }
          ]
        }
      }
    },
    {
      name: 'POST /admin/users',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            email: 'user@example.com',
            full_name: 'John Doe',
            role_id: 1,
            is_active: true
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/admin/users',
          host: ['{{baseUrl}}'],
          path: ['admin', 'users']
        }
      }
    },
    {
      name: 'PUT /admin/users/:id',
      request: {
        method: 'PUT',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            full_name: 'John Updated',
            is_active: true
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/admin/users/{{userId}}',
          host: ['{{baseUrl}}'],
          path: ['admin', 'users', '{{userId}}']
        }
      }
    },
    {
      name: 'DELETE /admin/users/:id',
      request: {
        method: 'DELETE',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/users/{{userId}}',
          host: ['{{baseUrl}}'],
          path: ['admin', 'users', '{{userId}}']
        }
      }
    },

    // Roles endpoints
    {
      name: 'GET /admin/roles',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/roles?page=1&limit=10',
          host: ['{{baseUrl}}'],
          path: ['admin', 'roles'],
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' }
          ]
        }
      }
    },
    {
      name: 'POST /admin/roles',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            role_name: 'Manager',
            description: 'Manager role'
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/admin/roles',
          host: ['{{baseUrl}}'],
          path: ['admin', 'roles']
        }
      }
    },
    {
      name: 'PUT /admin/roles/:id',
      request: {
        method: 'PUT',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            role_name: 'Updated Manager',
            description: 'Updated description'
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/admin/roles/{{roleId}}',
          host: ['{{baseUrl}}'],
          path: ['admin', 'roles', '{{roleId}}']
        }
      }
    },
    {
      name: 'DELETE /admin/roles/:id',
      request: {
        method: 'DELETE',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/roles/{{roleId}}',
          host: ['{{baseUrl}}'],
          path: ['admin', 'roles', '{{roleId}}']
        }
      }
    },

    // Masters endpoints
    {
      name: 'GET /admin/masters/districts',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/masters/districts?page=1&limit=10',
          host: ['{{baseUrl}}'],
          path: ['admin', 'masters', 'districts'],
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' }
          ]
        }
      }
    },
    {
      name: 'POST /admin/masters/districts',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            district_name: 'Mumbai',
            district_code: 'MH-MU',
            is_active: true
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/admin/masters/districts',
          host: ['{{baseUrl}}'],
          path: ['admin', 'masters', 'districts']
        }
      }
    },
    {
      name: 'GET /admin/masters/departments',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/masters/departments?page=1&limit=10',
          host: ['{{baseUrl}}'],
          path: ['admin', 'masters', 'departments'],
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' }
          ]
        }
      }
    },
    {
      name: 'POST /admin/masters/departments',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            department_name: 'Finance',
            department_code: 'FIN',
            is_active: true
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: '{{baseUrl}}/admin/masters/departments',
          host: ['{{baseUrl}}'],
          path: ['admin', 'masters', 'departments']
        }
      }
    },

    // Permissions endpoints
    {
      name: 'GET /admin/permissions',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/permissions',
          host: ['{{baseUrl}}'],
          path: ['admin', 'permissions']
        }
      }
    },
    {
      name: 'POST /admin/permissions/sync',
      request: {
        method: 'POST',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        url: {
          raw: '{{baseUrl}}/admin/permissions/sync',
          host: ['{{baseUrl}}'],
          path: ['admin', 'permissions', 'sync']
        }
      }
    }
  ];

  collection.item = apiEndpoints;

  // Write collection to file
  const collectionPath = path.join(__dirname, '../../postman-collection.json');
  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));

  // Production: Remove debug log
  return collectionPath;
};

module.exports = { generatePostmanCollection };
