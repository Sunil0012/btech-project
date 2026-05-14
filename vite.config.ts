import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseTarget =
    env.VITE_STUDENT_SUPABASE_URL ||
    (env.VITE_STUDENT_SUPABASE_PROJECT_ID
      ? `https://${env.VITE_STUDENT_SUPABASE_PROJECT_ID}.supabase.co`
      : "");

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/supabase-student": {
          target: env.VITE_STUDENT_SUPABASE_URL || (env.VITE_STUDENT_SUPABASE_PROJECT_ID ? `https://${env.VITE_STUDENT_SUPABASE_PROJECT_ID}.supabase.co` : ""),
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/supabase-student/, ""),
        },
        "/supabase-teacher": {
          target: env.VITE_TEACHER_SUPABASE_URL || (env.VITE_TEACHER_SUPABASE_PROJECT_ID ? `https://${env.VITE_TEACHER_SUPABASE_PROJECT_ID}.supabase.co` : ""),
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/supabase-teacher/, ""),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
