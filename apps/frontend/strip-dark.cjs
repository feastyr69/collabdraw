const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync(__dirname + '/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove any class starting with dark:
  // e.g., dark:bg-zinc-900, dark:text-white, dark:hover:bg-zinc-700
  content = content.replace(/\bdark:[^\s"'`]+/g, '');
  // Also clean up double spaces that might be left behind
  content = content.replace(/ +/g, ' ');
  fs.writeFileSync(file, content);
});

console.log('Removed all dark: classes from tsx files');
