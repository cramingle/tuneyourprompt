# Deployment Guide for TuneYourPrompt

This guide will help you deploy TuneYourPrompt on an Ubuntu server using Nginx and Cloudflare Tunnel.

## Prerequisites

- Ubuntu server (20.04 LTS or newer)
- Node.js 14+ and npm
- Ollama installed with the Mistral model
- A Cloudflare account

## Step 1: Install Required Software

```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh
```

## Step 2: Install and Pull the Mistral Model

```bash
# Pull the Mistral model
ollama pull mistral
```

## Step 3: Clone and Set Up the Application

```bash
# Create a directory for the application
mkdir -p /var/www/tuneyourprompt
cd /var/www/tuneyourprompt

# Clone the repository (or copy your files)
git clone https://github.com/yourusername/tuneyourprompt.git .

# Install dependencies
npm install

# Create .env file
cat > .env << EOL
PORT=3000
OLLAMA_API_URL=http://localhost:11434/api
EOL
```

## Step 4: Set Up PM2 for Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
pm2 start server.js --name tuneyourprompt

# Set PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(echo $HOME)
pm2 save
```

## Step 5: Configure Nginx

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/tuneyourprompt
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/tuneyourprompt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Set Up Cloudflare Tunnel

Install Cloudflared:

```bash
# Download and install Cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

Authenticate with Cloudflare:

```bash
cloudflared tunnel login
```

Create a tunnel:

```bash
cloudflared tunnel create tuneyourprompt
```

Configure the tunnel:

```bash
# Create a config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOL
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/$(whoami)/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
  - service: http_status:404
EOL
```

Route DNS to your tunnel:

```bash
cloudflared tunnel route dns tuneyourprompt your-domain.com
```

Install the tunnel as a service:

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## Step 7: Verify the Deployment

Visit your domain to ensure the application is working correctly. You should see the TuneYourPrompt interface and be able to interact with it.

## Troubleshooting

### Check Application Logs

```bash
pm2 logs tuneyourprompt
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check Cloudflared Logs

```bash
sudo journalctl -u cloudflared
```

### Restart Services

```bash
# Restart the Node.js application
pm2 restart tuneyourprompt

# Restart Nginx
sudo systemctl restart nginx

# Restart Cloudflared
sudo systemctl restart cloudflared
```

## Security Considerations

- Set up a firewall (UFW) to restrict access
- Configure SSL/TLS with Cloudflare
- Keep all software updated regularly
- Consider implementing rate limiting for the API endpoints 