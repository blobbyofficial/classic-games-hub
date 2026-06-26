const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const distDir = path.join(root, 'dist');

function copyStatic(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const name of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, name.name);
    const destPath = path.join(destDir, name.name);
    if (name.isDirectory()) {
      copyStatic(srcPath, destPath);
    } else if (name.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyHtml() {
  const rootPages = ['index.html', '404.html'];
  const pageDir = path.join(root, 'pages');

  rootPages.forEach((page) => {
    const src = path.join(root, page);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(distDir, page));
    }
  });

  if (fs.existsSync(pageDir)) {
    const destPageDir = path.join(distDir, 'pages');
    fs.mkdirSync(destPageDir, { recursive: true });

    for (const file of fs.readdirSync(pageDir)) {
      const src = path.join(pageDir, file);
      if (fs.statSync(src).isFile()) {
        const dest = file === '404.html'
          ? path.join(distDir, '404.html')
          : path.join(destPageDir, file);
        fs.copyFileSync(src, dest);
      }
    }
  }
}

function copyGames() {
  const gameSrc = path.join(root, 'games');
  const gameDest = path.join(distDir, 'games');
  copyStatic(gameSrc, gameDest);
}

function buildScripts() {
  return esbuild.build({
    entryPoints: [
      path.join(root, 'assets', 'scripts', 'core', 'site-shell.js'),
      path.join(root, 'assets', 'scripts', 'core', 'site-loader.js'),
      path.join(root, 'assets', 'scripts', 'games', 'arcade-suite.js'),
      path.join(root, 'assets', 'scripts', 'pages', 'homepage.js'),
      path.join(root, 'assets', 'scripts', 'pages', 'arcade-cabinet.js'),
      path.join(root, 'assets', 'scripts', 'games', 'snake.js'),
      path.join(root, 'assets', 'scripts', 'games', 'tetris.js')
    ],
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    outdir: path.join(distDir, 'assets', 'scripts'),
    outbase: path.join(root, 'assets', 'scripts'),
    entryNames: '[dir]/[name]'
  });
}

function buildStyles() {
  const source = path.join(root, 'assets', 'styles');
  const dest = path.join(distDir, 'assets', 'styles');
  copyStatic(source, dest);
}

function copyImages() {
  const src = path.join(root, 'assets', 'images');
  const dest = path.join(distDir, 'assets', 'images');
  copyStatic(src, dest);
}

function main() {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  copyHtml();
  copyGames();
  buildStyles();
  copyImages();
  return buildScripts();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
