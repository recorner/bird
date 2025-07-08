# 🔧 GitHub Actions Deployment Setup

## Required GitHub Secrets

To enable automatic deployment when pushing to the main branch, you need to configure the following secrets in your GitHub repository:

### How to Add Secrets
1. Go to your GitHub repository
2. Click on **Settings**
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret** for each secret below

### Required Secrets

#### `HOST`
- **Description**: Your server's IP address or domain name
- **Example**: `192.168.1.100` or `your-server.com`
- **Value**: Your actual server IP/domain

#### `USERNAME`
- **Description**: SSH username for server access
- **Example**: `root` or `ubuntu`
- **Value**: Your server username

#### `SSH_KEY`
- **Description**: Private SSH key for server access
- **How to get**: 
  ```bash
  # On your server, generate SSH key if you don't have one
  ssh-keygen -t rsa -b 4096 -C "github-actions"
  
  # Copy the PRIVATE key (keep this secret!)
  cat ~/.ssh/id_rsa
  ```
- **Value**: The entire private key content (including `-----BEGIN` and `-----END` lines)

#### `PORT` (Optional)
- **Description**: SSH port (default is 22)
- **Example**: `22` or `2222`
- **Value**: Your SSH port number (leave empty if using default port 22)

## Deployment Process

Once secrets are configured, the deployment process is:

1. **Push to main branch** → Triggers GitHub Actions
2. **Validation** → Checks project structure and runs tests
3. **Remote deployment** → Connects to your server via SSH
4. **Update code** → Pulls latest changes from GitHub
5. **Install dependencies** → Runs `npm ci --production`
6. **Restart bot** → Stops old version, starts new version
7. **Health check** → Verifies bot is running correctly
8. **Notification** → Sends Telegram notification with deployment status

## Manual Deployment

You can also deploy manually using:

```bash
# On your server
cd /root/bird
./scripts/auto-deploy.sh deploy
```

## Troubleshooting

### Common Issues

**1. SSH Connection Failed**
- Check that `HOST`, `USERNAME`, and `SSH_KEY` secrets are correct
- Verify SSH access: `ssh username@host`
- Ensure your server allows SSH connections

**2. Permission Denied**
- Make sure the SSH key has correct permissions
- Verify the username has access to `/root/bird` directory
- Check if sudo is required for PM2 commands

**3. Bot Failed to Start**
- Check that `.env` file exists on server with correct values
- Verify all dependencies are installed
- Check PM2 logs: `pm2 logs birdeye`

**4. Deployment Notification Failed**
- Ensure `BOT_TOKEN` and `GROUP_ID` are correct in server's `.env`
- Verify bot is added to the Telegram group
- Check that group ID starts with `-100` for groups

### Testing SSH Connection

Test your SSH connection manually:

```bash
# Replace with your actual values
ssh -i /path/to/private/key username@hostname

# Or if using password authentication
ssh username@hostname
```

### Viewing Deployment Logs

Check GitHub Actions logs:
1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click on the latest workflow run
4. Expand the steps to see detailed logs

## Security Best Practices

1. **Never commit SSH keys** to your repository
2. **Use strong SSH keys** (RSA 4096-bit minimum)
3. **Limit SSH access** to specific IPs if possible
4. **Keep secrets updated** if you change credentials
5. **Monitor deployment logs** for suspicious activity

---

**Your deployment pipeline is ready!** 🚀

Push to main branch and watch the magic happen! ✨
