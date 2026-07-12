/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 é módulo nativo: não deve ser empacotado pelo bundler do server.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
