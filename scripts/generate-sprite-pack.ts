import * as fs from 'fs';
import * as glob from 'glob';

const spriteOutputFile = 'assets/sprite-pack.json';
const fxOutputFile = 'assets/fx-pack.json';

glob('assets/pokemon/*', (err, matches) => {
  if (err) {
    throw err;
  }
  console.log(`Generating sprite-pack.json: Found ${matches.length} files`);
  const output = {
    sprites: {
      files: matches.map(url => {
        const filename = url.split('/').pop();
        const key = filename && filename.split('.')[0];
        return {
          type: 'spritesheet',
          key,
          url,
          frameConfig: {
            frameWidth: 64,
            frameHeight: 64,
          },
        };
      }),
    },
  };
  fs.writeFileSync(spriteOutputFile, JSON.stringify(output, null, 2));
});

glob('assets/fx/**/*', (err, matches) => {
  if (err) {
    throw err;
  }
  console.log(`Generating fx-pack.json: Found ${matches.length} files`);
  const output = {
    sprites: {
      files: matches.map(url => {
        const filename = url.split('/').pop();
        const key = filename && filename.split('.')[0];
        return {
          type: 'image',
          key,
          url,
        };
      }),
    },
  };
  fs.writeFileSync(fxOutputFile, JSON.stringify(output, null, 2));
});
