'use client'

import { useRouter } from 'nextjs-toploader/app'

import { Button } from 'devextreme-react/button'

type BackButton = { className?: string; href?: string }

export default function BackButton({ className, href }: BackButton) {
  const router = useRouter()

  function handleClick(href?: string) {
    if (href) {
      router.push(href)
      return
    }

    router.back()
  }

  return (
    <Button className={className} type='danger' stylingMode='contained' text='Go Back' icon='arrowleft' onClick={() => handleClick(href)} />
  )
}
