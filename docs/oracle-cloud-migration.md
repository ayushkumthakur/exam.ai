# Oracle Cloud Always Free migration

This guide moves Competitive Exam AI to a Linux VM while retaining the existing SQLite database. It is intentionally separate from the current Railway deployment.

## Important safety notes

- Do not delete the Railway project, `web-data` volume, or its backups during migration.
- Obtain a verified SQLite backup from the authenticated Admin → Database backups panel. The backup file is a database snapshot; it does not include the entire `/data` directory or the generated `/data/secret` file.
- Keep the database backup private. It contains account information and student study history.
- If `/data/secret` cannot be transferred, the new app will generate a new secret and existing login sessions/cookies will be invalidated. Users can sign in again with their existing credentials when the database is restored.
- Railway API-key values are not stored in GitHub. Re-enter your provider keys directly in the new VM's private `.env`; never paste them into source code or commit them.
- First test the new host privately and verify login, exam selection, saved answers, mock tests and bookmarks before directing your domain to it.

## 1. Create the VM

In Oracle Cloud Infrastructure, create an Always Free-eligible Linux VM in your tenancy's home region. Availability of free shapes can vary by region. Use a supported Linux image, create/download an SSH keypair, and note the VM's public IP.

Configure the VM's networking rules to allow TCP 22 from your own IP and TCP 80/443 for the website. Do not expose port 3000 publicly; Compose binds it to localhost.

## 2. Install Docker

Connect to the VM using SSH, then install Docker Engine and the Docker Compose plugin using the official instructions for the VM's Linux distribution.

Create the application directory and persistent data directory:

```bash
sudo mkdir -p /opt/competitive-exam-ai/runtime-data
sudo chown -R 1000:1000 /opt/competitive-exam-ai/runtime-data
sudo chmod 700 /opt/competitive-exam-ai/runtime-data
```

## 3. Get the source code

Clone the GitHub repository into the application directory:

```bash
cd /opt/competitive-exam-ai
git clone https://github.com/ayushkumthakur/exam.ai.git .
```

Copy the example environment file, then edit it privately:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Fill in the same AI provider key(s) you already use, without posting them in chat or GitHub.

## 4. Restore the SQLite backup

Copy the downloaded verified `app-....db` snapshot to `/opt/competitive-exam-ai/runtime-data/app.db`. Transfer it over an authenticated file-copy method such as `scp`; do not put it in a public repository or public URL.

Then make sure the container user can read and write the database:

```bash
sudo chown 1000:1000 /opt/competitive-exam-ai/runtime-data/app.db
sudo chmod 600 /opt/competitive-exam-ai/runtime-data/app.db
sudo chown -R 1000:1000 /opt/competitive-exam-ai/runtime-data
```

If you have securely recovered the existing `/data/secret` file, place it at `/opt/competitive-exam-ai/runtime-data/secret` with owner UID 1000 and mode 600. Do not create a guessed or copied value. If that file is unavailable, the app will generate a new secret when it starts.

## 5. Start and verify the app privately

```bash
cd /opt/competitive-exam-ai
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
curl -fsS http://127.0.0.1:3000/api/config
```

Do not point the public domain to the new VM until you have tested the restored database and can log in. To stop the new app without deleting its data, use `docker compose down`; do not delete the `runtime-data/` directory.

## 6. HTTPS

Install Caddy on the VM and configure your domain to proxy to `127.0.0.1:3000`. Point the domain's DNS A record to the VM's public IP and allow inbound TCP 80/443 in both the cloud network rules and VM firewall. Verify HTTPS works before changing any public links.

## 7. Validate before switching users

- Admin account can sign in; if sessions expired, sign in again with the existing credentials.
- Existing student accounts and onboarding records are present.
- Existing answer history, mock-test results, bookmarks, and study-plan completion are present.
- AI features work after provider keys are added privately.
- A new local database backup is created and stored away from the VM.

Only after those checks should you update the public domain/links. Keep Railway running until the new host is verified and a fresh backup from the new host is confirmed.
