module.exports = {
  apps: [{
    name: 'birdeye',
    script: 'index.js',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    // Health monitoring
    health_check_grace_period: 3000,
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Advanced PM2 features
    kill_timeout: 5000,
    listen_timeout: 3000,
    // Environment specific settings
    source_map_support: true,
    instance_var: 'INSTANCE_ID'
  }]
};
