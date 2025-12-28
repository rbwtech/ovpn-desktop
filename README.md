# RBW-Tech OpenVPN System

A modern, high-performance OpenVPN management ecosystem consisting of a Rust-based backend and a cross-platform Desktop Client.

## Features

- **Centralized Manager**: Built with Rust (Axum & SQLx) for blazing-fast config generation and port forwarding.
- **Desktop Client**: Cross-platform GUI built with Tauri, React, and TypeScript.
- **Smart Tracking**: Real-time monitoring of virtual and public client IPs.
- **Port Forwarding**: Instant iptables rules management via web interface.

## Project Structure

- `/ovpn`: The main API server and management dashboard.
- `/ovpn-desktop`: The desktop application source code (Tauri).

## Tech Stack

- **Backend**: Rust, Axum, MariaDB.
- **Frontend**: HTML5, CSS3 (Minimalist Dark Theme), React.
- **Desktop**: Tauri Framework.

## Installation (Desktop)

1. Download the latest `.msi` installer from the portal.
2. Enter your **API Key** for automatic configuration sync.
3. Click Connect.

## License

MIT License
