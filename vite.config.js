import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

    // Where Vite looks for the entry HTML — stays at root
      root: ".",

        server: {
            port: 5173,
                // Proxy every /auth /wallet /invest /projects /admin /mpesa call to the NestJS API
                    // so the browser never hits a CORS error during local dev
                        proxy: {
                              "/auth":    { target: "http://localhost:3000", changeOrigin: true },
                                    "/wallet":  { target: "http://localhost:3000", changeOrigin: true },
                                          "/invest":  { target: "http://localhost:3000", changeOrigin: true },
                                                "/projects":{ target: "http://localhost:3000", changeOrigin: true },
                                                      "/admin":   { target: "http://localhost:3000", changeOrigin: true },
                                                            "/mpesa":   { target: "http://localhost:3000", changeOrigin: true },
                                                                },
                                                                  },

                                                                    build: {
                                                                        outDir: "dist",
                                                                            rollupOptions: {
                                                                                  input: "./index.html",
                                                                                      },
                                                                                        },
                                                                                        });