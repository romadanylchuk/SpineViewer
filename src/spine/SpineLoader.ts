import JSZip from 'jszip';

export interface LoadedSpineAssets {
  skeletonUrl: string;
  atlasUrl: string;
  /** map from texture filename (basename) → object URL */
  textureUrls: Map<string, string>;
  isBinary: boolean;
  fileName: string;
}

function ext(name: string): string {
  return name.slice(name.lastIndexOf('.')).toLowerCase();
}

function basename(name: string): string {
  return name.split('/').pop() ?? name;
}

/** Revoke all object URLs from a previously loaded asset set */
export function revokeAssets(assets: LoadedSpineAssets): void {
  URL.revokeObjectURL(assets.skeletonUrl);
  URL.revokeObjectURL(assets.atlasUrl);
  assets.textureUrls.forEach(u => URL.revokeObjectURL(u));
}

/**
 * Load spine assets from a list of File objects.
 * Supports:
 *   - .json + .atlas + images
 *   - .skel + .atlas + images
 *   - .spine (zip archive containing the above)
 */
export async function loadFromFiles(files: File[]): Promise<LoadedSpineAssets> {
  const spineFile = files.find(f => ext(f.name) === '.spine');
  if (spineFile) {
    return loadFromSpineArchive(spineFile);
  }
  return loadFromLooseFiles(files);
}

async function loadFromLooseFiles(files: File[]): Promise<LoadedSpineAssets> {
  const skelFile   = files.find(f => ext(f.name) === '.skel');
  const jsonFile   = files.find(f => ext(f.name) === '.json');
  const atlasFile  = files.find(f => ext(f.name) === '.atlas');
  const imageFiles = files.filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(ext(f.name)));

  const skelOrJson = skelFile ?? jsonFile;
  if (!skelOrJson) throw new Error('No skeleton file found (.json or .skel)');
  if (!atlasFile)  throw new Error('No atlas file found (.atlas)');

  const textureUrls = new Map<string, string>();
  for (const img of imageFiles) {
    textureUrls.set(basename(img.name), URL.createObjectURL(img));
  }

  return {
    skeletonUrl:  URL.createObjectURL(skelOrJson),
    atlasUrl:     URL.createObjectURL(atlasFile),
    textureUrls,
    isBinary:     !!skelFile,
    fileName:     skelOrJson.name,
  };
}

async function loadFromSpineArchive(file: File): Promise<LoadedSpineAssets> {
  const zip = await JSZip.loadAsync(file);

  let skelEntry:  JSZip.JSZipObject | null = null;
  let jsonEntry:  JSZip.JSZipObject | null = null;
  let atlasEntry: JSZip.JSZipObject | null = null;
  const imageEntries: JSZip.JSZipObject[] = [];

  zip.forEach((_path, entry) => {
    if (entry.dir) return;
    const e = ext(entry.name);
    if      (e === '.skel')  skelEntry  = entry;
    else if (e === '.json')  jsonEntry  = entry;
    else if (e === '.atlas') atlasEntry = entry;
    else if (['.png', '.jpg', '.jpeg', '.webp'].includes(e)) imageEntries.push(entry);
  });

  const skelOrJson = skelEntry ?? jsonEntry;
  if (!skelOrJson) throw new Error('No skeleton file found inside .spine archive');
  if (!atlasEntry) throw new Error('No atlas file found inside .spine archive');

  const toBlob = async (entry: JSZip.JSZipObject, mime: string) => {
    const data = await entry.async('uint8array');
    return new Blob([data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer], { type: mime });
  };

  const skelMime  = skelEntry ? 'application/octet-stream' : 'application/json';
  const skeletonUrl = URL.createObjectURL(await toBlob(skelOrJson, skelMime));
  const atlasUrl    = URL.createObjectURL(await toBlob(atlasEntry, 'text/plain'));

  const textureUrls = new Map<string, string>();
  for (const img of imageEntries) {
    const e = ext(img.name);
    const mime = e === '.png' ? 'image/png' : 'image/jpeg';
    const url = URL.createObjectURL(await toBlob(img, mime));
    textureUrls.set(basename(img.name), url);
  }

  return {
    skeletonUrl,
    atlasUrl,
    textureUrls,
    isBinary: !!skelEntry,
    fileName: file.name,
  };
}
