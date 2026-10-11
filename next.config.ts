import type { NextConfig } from "next";

// Cache Components fica desligado: todas as telas dependem do usuário logado
// e precisam de dados sempre frescos.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
