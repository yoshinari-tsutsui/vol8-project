"use client"
import NextImage from 'next/image'
import { useState } from 'react'

interface ImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

export default function Image({ src, alt, className, width = 800, height = 600 }: ImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">画像を読み込めませんでした</span>
      </div>
    )
  }

  // 外部URLの場合はimg要素を使用（ESLint警告を無視）
  if (src.startsWith('http')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    )
  }

  // 内部画像の場合はNext.js Imageを使用
  return (
    <NextImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onLoad={() => setIsLoading(false)}
      onError={() => setHasError(true)}
    />
  )
}