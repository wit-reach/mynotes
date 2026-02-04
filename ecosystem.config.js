module.exports = {
  apps: [{
    name: 'notes-api',
    cwd: __dirname + '/backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: __dirname + '/storage/logs/backend-error.log',
    out_file: __dirname + '/storage/logs/backend-out.log',
  }],
};
