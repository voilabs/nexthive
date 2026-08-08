import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	// Vite options tailored for Tauri development
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		fs: {
			allow: [path.resolve(__dirname, "../..")],
		},
		watch: {
			// Don't let the Rust build churn trigger frontend reloads
			ignored: ["**/src-tauri/**"],
		},
	},
});
