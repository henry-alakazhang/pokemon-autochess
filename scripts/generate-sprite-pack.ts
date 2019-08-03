import * as fs from 'fs';
import * as glob from 'glob';

const outputFile = 'assets/sprite-pack.json';

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
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
});
