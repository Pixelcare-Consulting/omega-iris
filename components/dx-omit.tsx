'use client'

import { useEffect } from 'react'

//TODO: this will rerender when doing editing cell in devextreme grid which afftects its performance  and work properly
//TODO: find way or optimize the bypassing

export default function DxOmit({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    const removeDxLicense = () => {
      const banners = document.querySelectorAll('dx-license')

      if (banners.length > 0) {
        banners.forEach((el) => {
          const xButton = el.children[1]
          if (xButton && xButton instanceof HTMLElement) xButton.click()
        })
      }
    }

    //* Run once in case it's already there
    removeDxLicense()

    //* Observe DOM for new elements
    const observer = new MutationObserver(() => {
      removeDxLicense()
    })

    //* observe the body element
    observer.observe(document.body, { childList: true })

    //* Cleanup
    return () => observer.disconnect()
  }, [])

  return <>{children}</>
}
