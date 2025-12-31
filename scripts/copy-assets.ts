import * as fs from 'fs';

// Paste this when you want to use this.
// Due to self-referential type definitions and Phaser shenanigans,
// it's not possible to import from the allPokemonNames array directly.
const allPokemonNames: string[] = [];

const overrides: { [k: string]: string } = {
  // Default form of aegislash in-game is sword
  aegislash: 'AEGISLASH_1',
  aegislash_shield: 'AEGISLASH',
  rotom_wash: 'ROTOM_2',
};

const sourceDir = process.env.SOURCE_DIR || 'asset_source';
const pokemonToCopy =
  process.argv[2] === 'all' ? allPokemonNames : [process.argv[2]];
const destDir = 'assets/pokemon';

// Create target directories if they don't exist
for (const size of ['front', 'mini', 'sprite']) {
  const dir = `${destDir}/${size}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const skipped = [];

pokemonToCopy.forEach((pokemonName) => {
  if (pokemonName.endsWith('-2') || pokemonName.endsWith('-3')) {
    return;
  }
  // for `name-1`, slice out the `-1`.
  const targetName = pokemonName.split('-')[0];
  // Assets from the source are in uppercase
  let baseName = targetName.split('_')[0].toUpperCase();
  if (pokemonName in overrides) {
    // If there's a name override for it, use that.
    baseName = overrides[pokemonName];
  } else if (pokemonName.includes('_')) {
    // Otherwise just default to the first alternate form.
    // If there's more than one, skip since we can't tell.
    const hasExtraForms = fs.existsSync(
      `${sourceDir}/front/${baseName.toUpperCase()}_2.png`
    );
    if (hasExtraForms) {
      console.log(`SKIPPING ${pokemonName}, unable to determine form.`);
      skipped.push(pokemonName);
      return;
    }

    // First alternate form
    baseName = `${baseName}_1`;
  }

  const frontImg = `${sourceDir}/front/${baseName}.png`;
  if (fs.existsSync(frontImg)) {
    fs.copyFileSync(frontImg, `${destDir}/front/${targetName}.png`);
  } else {
    console.log(`SKIPPING front image for ${pokemonName}, unable to find`);
    skipped.push(`front/${targetName}`);
  }

  const miniImg = `${sourceDir}/mini/${baseName}.png`;
  if (fs.existsSync(miniImg)) {
    fs.copyFileSync(miniImg, `${destDir}/mini/${targetName}.png`);
  } else {
    console.log(`SKIPPING mini image for ${pokemonName}, unable to find`);
    skipped.push(`mini/${targetName}`);
  }

  const spriteImg = `${sourceDir}/sprite/${baseName}.png`;
  if (fs.existsSync(spriteImg)) {
    fs.copyFileSync(spriteImg, `${destDir}/sprite/${targetName}.png`);
  } else {
    console.log(`SKIPPING sprite image for ${pokemonName}, unable to find`);
    skipped.push(`sprite/${targetName}`);
  }
});
