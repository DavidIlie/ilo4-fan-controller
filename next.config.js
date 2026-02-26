/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ["ssh2", "node-ssh"],
    },
};
