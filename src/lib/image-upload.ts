const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 850_000
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gambar tidak dapat dibaca.'))
    }
    image.src = url
  })
}

function renderDataUrl(image: HTMLImageElement, maxDimension: number, quality: number) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browser tidak mendukung pemrosesan gambar.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/webp', quality)
}

export async function compressMenuImage(file: File) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error('Gunakan file JPG, PNG, atau WebP.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Ukuran file maksimal 8 MB.')
  }

  const image = await loadImage(file)
  let dataUrl = renderDataUrl(image, 1200, 0.8)

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    dataUrl = renderDataUrl(image, 900, 0.68)
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Gambar masih terlalu besar setelah dikompresi. Pilih gambar lain.')
  }

  return dataUrl
}
