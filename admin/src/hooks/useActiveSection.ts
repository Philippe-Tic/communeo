import { useState, useEffect, useRef, useCallback } from 'react'

export function useActiveSection(sectionIds: string[]): [string, (id: string) => void] {
  const [active, setActive] = useState<string>(sectionIds[0] || '')
  const isScrollingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const scrollToSection = useCallback((sectionKey: string) => {
    const el = document.getElementById(`section-${sectionKey}`)
    if (!el) return
    isScrollingRef.current = true
    setActive(sectionKey)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false
    }, 1000)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id.replace('section-', ''))
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    )
    sectionIds.forEach(id => {
      const el = document.getElementById(`section-${id}`)
      if (el) observer.observe(el)
    })
    return () => {
      observer.disconnect()
      clearTimeout(timeoutRef.current)
    }
  }, [sectionIds])

  return [active, scrollToSection]
}
