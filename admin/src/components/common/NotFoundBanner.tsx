interface NotFoundBannerProps {
  message: string
}

export function NotFoundBanner({ message }: NotFoundBannerProps) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
      <p className="text-destructive">{message}</p>
    </div>
  )
}
