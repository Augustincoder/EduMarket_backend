// ecosystem.config.js
// PM2 process manager configuration

module.exports = {
  apps: [
    {
      name: 'edumarket-backend',
      script: 'server.js',

      // Cluster mode: use all CPU cores in production
      // For MVP: 1 instance. Uncomment 'max' when scaling.
      instances: 1,
      // instances: 'max',  // Uncomment for cluster mode (requires session store)
      exec_mode: 'fork',   // Change to 'cluster' with instances: 'max'

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,     // 3s delay between restarts
      max_restarts: 10,        // Stop if crashes 10 times in a row
      min_uptime: '5s',        // Must be up 5s to count as stable

      // Environment
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Logs (winston also writes to logs/)
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown timeout (ms)
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
