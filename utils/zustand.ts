import { StoreApi, UseBoundStore } from "zustand"
import { shallow } from "zustand/shallow"

type GenericState = Record<string, any>

export const createStoreWithSelectors = <T extends GenericState>(
  store: UseBoundStore<StoreApi<T>>
): (<K extends keyof T>(keys: K[]) => Pick<T, K>) => {
  const useStore: <K extends keyof T>(keys: K[]) => Pick<T, K> = <K extends keyof T>(keys: K[]) => {
    return store((state) => {
      const x: Partial<T> = {}

      if (Array.isArray(keys)) {
        for (const key of keys) {
          x[key] = state[key]
        }
      }

      return x as Pick<T, K>
    }, shallow)
  }

  return useStore
}
