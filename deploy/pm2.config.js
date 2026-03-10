/**
 * PM2 process config for VMGD LeaveDesk backend.
 * Usage:
 *   pm2 start deploy/pm2.config.js
 *   pm2 save
 *   pm2 startup   ← follow the printed command to auto-start on reboot
 */
module.exports = {
  apps: [
    {
      name: 'leavedesk-api',
      cwd: './backend',
      script: 'src/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',

      // Let the .env file in ./backend supply secrets; override NODE_ENV here
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '127.0.0.1',   // bind only to localhost — nginx is the public face
      },

      // Restart policy
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,

      // Logging — logs/ sits at the repo root: /var/www/leavedesk/logs/
      out_file:   '/var/www/leavedesk/logs/leavedesk-api-out.log',
      error_file: '/var/www/leavedesk/logs/leavedesk-api-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
