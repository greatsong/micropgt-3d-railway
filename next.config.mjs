/** @type {import('next').NextConfig} */
const nextConfig = {
    generateBuildId: () => `build-${Date.now()}`,
};

export default nextConfig;
