import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'templates', // Корневая папка для HTML
  build: {
    outDir: '../dist', // Папка для сборки
    emptyOutDir: true, // Очистка папки перед сборкой
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'templates/index.html'),
      },
    },
  },
  server: {
    port: 3000, // Порт для разработки
    hot: true, // Горячая перезагрузка
  },
});