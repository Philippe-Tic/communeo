import { toast } from 'sonner'

interface ToastOptions {
  title: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading'
  duration?: number
}

export const toaster = {
  create(options: ToastOptions) {
    const { title, description, type = 'info', duration } = options

    switch (type) {
      case 'success':
        return toast.success(title, { description, duration })
      case 'error':
        return toast.error(title, { description, duration })
      case 'warning':
        return toast.warning(title, { description, duration })
      case 'info':
        return toast.info(title, { description, duration })
      case 'loading':
        return toast.loading(title, { description, duration })
      default:
        return toast(title, { description, duration })
    }
  }
}
