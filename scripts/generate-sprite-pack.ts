import { writeFileSync } from 'fs';
import { glob } from 'glob';

const sizeOverrides: { [k: string]: number } = {
  // FIXME: Weezing Galar looks a bit weird due to this.
  weezing_galar: 80,
  regigigas: 128,
};

const spriteOutputFile = 'assets/sprite-pack.json';
const fxOutputFile = 'assets/fx-pack.json';

glob('assets/pokemon/**/*.png').then((matches) => {
  console.log(`Generating sprite-pack.json: Found ${matches.length} files`);
  const output = {
    sprites: {
      files: matches
        .map((url) => {
          const filename = url.split('/').pop();
          const key = filename && filename.split('.')[0];

          // static mini sprites
          if (url.includes('mini/')) {
            return {
              type: 'spritesheet',
              key: `${key}-mini`,
              url,
              frameConfig: {
                frameWidth: 64,
                frameHeight: 64,
              },
            };
          }

          if (url.includes('sprite/')) {
            const size = (key && sizeOverrides[key]) ?? 64;
            return {
              type: 'spritesheet',
              key,
              url,
              frameConfig: {
                frameWidth: size,
                frameHeight: size,
              },
            };
          }

          if (url.includes('front/')) {
            return {
              type: 'image',
              key: `${key}-front`,
              url,
            };
          }

          console.log('SKIPING unknown file in sprite pack');
        })
        .filter((x) => !!x),
    },
  };
  writeFileSync(spriteOutputFile, JSON.stringify(output, null, 2));
});

glob('assets/fx/**/*.png').then((matches) => {
  console.log(`Generating fx-pack.json: Found ${matches.length} files`);
  const output = {
    sprites: {
      files: matches.map((url) => {
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
  writeFileSync(fxOutputFile, JSON.stringify(output, null, 2));
});
