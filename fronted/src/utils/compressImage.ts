/** 默认上限 2MB，与后端 multer 限制一致 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

function getFileSize(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    uni.getFileInfo({
      filePath,
      success: (r) => resolve(r.size),
      fail: reject,
    })
  })
}

function compressOnce(
  src: string,
  opts: { quality: number; compressedWidth?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality: opts.quality,
      ...(opts.compressedWidth != null ? { compressedWidth: opts.compressedWidth } : {}),
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

/**
 * 将本地图片压到不超过 maxBytes（默认 2MB），供上传前使用。
 * 先降 quality，仍过大则逐步缩小 compressedWidth（微信小程序支持）。
 */
export async function compressImageToMaxSize(
  filePath: string,
  maxBytes: number = AVATAR_MAX_BYTES
): Promise<string> {
  let path = filePath
  let size = await getFileSize(path)
  if (size <= maxBytes) return path

  for (let q = 80; q >= 15; q -= 12) {
    try {
      path = await compressOnce(path, { quality: q })
    } catch {
      return path
    }
    size = await getFileSize(path)
    if (size <= maxBytes) return path
  }

  if (size <= maxBytes) return path

  try {
    const info = await new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => {
      uni.getImageInfo({ src: path, success: resolve, fail: reject })
    })
    let w = info.width
    while (size > maxBytes && w >= 240) {
      w = Math.floor(w * 0.72)
      try {
        path = await compressOnce(path, { quality: 72, compressedWidth: w })
      } catch {
        break
      }
      size = await getFileSize(path)
      if (size <= maxBytes) return path
    }
  } catch {
    /* getImageInfo 失败则返回当前已压缩路径 */
  }

  return path
}
