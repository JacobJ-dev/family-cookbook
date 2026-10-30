import { supabase } from './supabase';

// Everything about recipe photos in one place: shrinking them in the browser,
// uploading, deleting, and getting a URL to show them.

const BUCKET = 'recipe-photos';
const MAX_SIDE = 1600; // pixels on the long side, plenty for a recipe page
const JPEG_QUALITY = 0.85; // 0–1: smaller files vs. sharper pictures

// Shown when the browser can't read the file (e.g. HEIC in Chrome or Firefox).
const UNSUPPORTED =
    "This photo's format isn't supported by this browser. Try choosing it from your Photos app, or save it as a JPEG first.";

// Decode the photo, draw a smaller copy on a canvas, and save that as a JPEG.
// Redrawing also drops the file's EXIF data, which can hold GPS coordinates.
export async function resizeToJpeg(file: File): Promise<Blob> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new Error(UNSUPPORTED);
    }

    // Never enlarge a small photo: scale is at most 1.
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // toBlob takes a callback instead of returning a promise, so we wrap it in
    // one to be able to await it. The 'image/jpeg' argument sets the Blob's
    // type, which is what the bucket checks (see the 415 lesson in step 1).
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the photo.'))),
            'image/jpeg',
            JPEG_QUALITY,
        );
    });
}

// Shrink and upload a photo for a recipe. Returns the path to store in
// recipes.photo_path. A new random name every time means files never change
// in place, which is why the bucket needs no update policy.
export async function uploadRecipePhoto(recipeId: string, file: File): Promise<string> {
    const jpeg = await resizeToJpeg(file);
    const path = `${recipeId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, jpeg);
    if (error) throw new Error(error.message);
    return path;
}

// Remove an old photo after it has been replaced. A failure here only leaves
// an unused file behind, so we log it instead of bothering her with it.
export async function deleteRecipePhoto(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.error('Could not delete old photo:', error.message);
}

// The bucket is private, so photos are shown through a signed URL that
// expires (here after an hour). Returns null if the URL couldn't be made.
export async function getPhotoUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (error) {
        console.error('Could not load photo:', error.message);
        return null;
    }
    return data.signedUrl;
}
