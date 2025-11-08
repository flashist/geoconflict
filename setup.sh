#!/bin/bash
# Comprehensive setup script for Hetzner server with Docker, user setup, Node Exporter, and OpenTelemetry
# Exit on error
set -e

echo "====================================================="
echo "🚀 STARTING SERVER SETUP"
echo "====================================================="

# Verify required environment variables
if [ -z "$OTEL_EXPORTER_OTLP_ENDPOINT" ] || [ -z "$OTEL_AUTH_HEADER" ]; then
    echo "❌ ERROR: Required environment variables are not set!"
    echo "Please set OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_AUTH_HEADER"
    exit 1
fi

echo "🔄 Updating system..."
apt update && apt upgrade -y

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    echo "Docker is already installed"
else
    echo "🐳 Installing Docker..."
    # Install Docker using official script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable --now docker
    echo "Docker installed successfully"
fi

echo "👤 Setting up openfront user..."
# Create openfront user if it doesn't exist
if id "openfront" &> /dev/null; then
    echo "User openfront already exists"
else
    useradd -m -s /bin/bash openfront
    echo "User openfront created"
fi

# Check if openfront is already in docker group
if groups openfront | grep -q '\bdocker\b'; then
    echo "User openfront is already in the docker group"
else
    # Add openfront to docker group
    usermod -aG docker openfront
    echo "Added openfront to docker group"
fi

# Create .ssh directory for openfront if it doesn't exist
if [ ! -d "/home/openfront/.ssh" ]; then
    mkdir -p /home/openfront/.ssh
    chmod 700 /home/openfront/.ssh
    echo "Created .ssh directory for openfront"
fi

# Copy SSH keys from root if they exist and haven't been copied yet
if [ -f /root/.ssh/authorized_keys ] && [ ! -f /home/openfront/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/openfront/.ssh/
    chmod 600 /home/openfront/.ssh/authorized_keys
    echo "SSH keys copied from root to openfront"
fi

# Set proper ownership for openfront's home directory
chown -R openfront:openfront /home/openfront
echo "Set proper ownership for openfront's home directory"

# Create directory for OpenTelemetry configuration
echo "📊 Setting up Node Exporter and OpenTelemetry Collector..."
OTEL_CONFIG_DIR="/home/openfront/otel"

if [ ! -d "$OTEL_CONFIG_DIR" ]; then
    mkdir -p "$OTEL_CONFIG_DIR"
    echo "Created OpenTelemetry configuration directory"
fi

# Create OpenTelemetry Collector configuration
cat > "$OTEL_CONFIG_DIR/otel-collector-config.yaml" << EOF
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'node'
          scrape_interval: 10s
          static_configs:
            - targets: ['localhost:9100']  # Node Exporter endpoint
          relabel_configs:
            - source_labels: [__address__]
              regex: '.*'
              target_label: openfront.host
              replacement: "\${HOSTNAME}"

processors:
  batch:
    # Batch metrics before sending
    timeout: 10s
    send_batch_size: 1000

exporters:
  otlphttp:
    endpoint: "${OTEL_EXPORTER_OTLP_ENDPOINT}"
    headers:
      Authorization: "${OTEL_AUTH_HEADER}"
    tls:
      insecure: true  # Set to false in production with proper certs

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [otlphttp]
EOF

# Set ownership of all files
chmod 600 "$OTEL_CONFIG_DIR/otel-collector-config.yaml"
chown -R openfront:openfront "$OTEL_CONFIG_DIR"

# Run Node Exporter
echo "🚀 Starting Node Exporter..."
docker pull prom/node-exporter:latest
docker rm -f node-exporter 2> /dev/null || true
docker run -d \
    --name=node-exporter \
    --restart=unless-stopped \
    --net="host" \
    --pid="host" \
    -v "/:/host:ro,rslave" \
    prom/node-exporter:latest \
    --path.rootfs=/host

# Run OpenTelemetry Collector
echo "🚀 Starting OpenTelemetry Collector..."
docker pull otel/opentelemetry-collector-contrib:latest
docker rm -f otel-collector 2> /dev/null || true

docker run -d \
    --name=otel-collector \
    --restart=unless-stopped \
    --network=host \
    --user=0 \
    -v "$OTEL_CONFIG_DIR/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml:ro" \
    otel/opentelemetry-collector-contrib:latest

# Check if containers are running
if docker ps | grep -q node-exporter && docker ps | grep -q otel-collector; then
    echo "✅ Node Exporter and OpenTelemetry Collector started successfully!"
else
    echo "❌ Failed to start containers. Check logs with: docker logs node-exporter or docker logs otel-collector"
    exit 1
fi

# ----------------------------------------------------------
# Swap file (prevents OOM-killing sshd during spikes)
# ----------------------------------------------------------
SWAP_SIZE="${SETUP_SWAP_SIZE:-4G}"
if ! swapon --show | grep -q "/swapfile"; then
    echo "🧠 Creating ${SWAP_SIZE} swap file..."
    fallocate -l "$SWAP_SIZE" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$(( ${SWAP_SIZE%G} * 1024 ))
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    sysctl -w vm.swappiness=20 >/dev/null
    sysctl -w vm.vfs_cache_pressure=50 >/dev/null
    echo "✅ Swap enabled"
else
    echo "Swap file already present"
fi

# ----------------------------------------------------------
# Host-level reverse proxy (Nginx) for 0.0.0.0:80 -> 127.0.0.1:3000
# ----------------------------------------------------------
echo "🌐 Installing and configuring host Nginx reverse proxy..."
apt-get install -y nginx >/dev/null

PUBLIC_HOST_VALUE="${PUBLIC_HOST:-${SERVER_HOST_PROD:-${SERVER_HOST_DEV:-$VPS_IP}}}"
if [ -z "$PUBLIC_HOST_VALUE" ]; then
    PUBLIC_HOST_VALUE="$HOSTNAME"
fi

NGINX_HOST_CONF="/etc/nginx/sites-available/geoconflict"
cat > "$NGINX_HOST_CONF" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${PUBLIC_HOST_VALUE} _;

    # Allow ACME HTTP-01 challenges (Certbot)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf "$NGINX_HOST_CONF" /etc/nginx/sites-enabled/geoconflict
mkdir -p /var/www/certbot
systemctl enable nginx >/dev/null
systemctl restart nginx
echo "✅ Host Nginx is proxying 0.0.0.0:80 -> 127.0.0.1:3000"

echo "====================================================="
echo "🎉 SETUP COMPLETE!"
echo "====================================================="
echo "The openfront user has been set up and has Docker permissions."
echo "Node Exporter is collecting system metrics."
echo "OpenTelemetry Collector is forwarding metrics to your endpoint."
echo ""
echo "📝 Configuration:"
echo "   - Config Directory: $OTEL_CONFIG_DIR"
echo "   - OpenTelemetry Endpoint: $OTEL_EXPORTER_OTLP_ENDPOINT"
echo "====================================================="
