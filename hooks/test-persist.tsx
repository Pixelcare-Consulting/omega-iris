import { createStoreWithSelectors } from '@/utils/zustand'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'

type TestStore = {
  bears: number
  setBears: (bears: number) => void
}

export const testStore = createWithEqualityFn<TestStore>()(
  persist(
    (set) => ({
      bears: 0,
      setBears: (bears) => set({ bears }),
    }),
    {
      name: 'test-store', //* localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  ),
  shallow // or Object.is
)

export const useTestStore = createStoreWithSelectors(testStore)

//* create a new store with a specific key
export const createTestStore = (key: string) =>
  createWithEqualityFn<TestStore>()(
    persist(
      (set) => ({
        bears: 0,
        setBears: (bears) => set({ bears }),
      }),
      {
        name: `test-store:${key}`,
        storage: createJSONStorage(() => localStorage),
      }
    ),
    shallow
  )

//* usage in the client
//     'use client'

// import { useRef } from 'react'
// import { createStoreWithSelectors } from '@/utils/zustand'
// import { createTestStore } from '@/stores/testStore'

// export function useTestStoreClient(key: string) {
//   const storeRef = useRef<ReturnType<typeof createTestStore>>() //* useRef ensures the store is created once

//   if (!storeRef.current) {
//     storeRef.current = createTestStore(key)
//   }

//   return createStoreWithSelectors(storeRef.current)
// }

//     'use client'
// export default function Page({ jobId }: { jobId: string }) {

//   const useJobStore = useTestStoreClient(`job-${jobId}`)

//   const { bears } = useJobStore(['bears'])
//   const setBears = useJobStore(['setBears']).setBears

//   return <></>
// }
