import { useEffect } from 'react'

export default function useDebug(callback: () => void, dependencies: any[] = []) {
  useEffect(() => {
    if (callback) callback()
  }, [dependencies])
}
