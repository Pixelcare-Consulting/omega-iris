import { z } from 'zod'

export const warehouseFormSchema = z.object({
  code: z.coerce.number(),
  isActive: z.boolean(),
  WarehouseCode: z.string().min(1, { message: 'Code is required' }),
  WarehouseName: z.string().min(1, { message: 'Name is required' }),
  Nettable: z.boolean(),
  EnableBinLocations: z.boolean(),
  DefaultBin: z.coerce.number().nullish(),
  Street: z.string().nullish(),
  Address2: z.string().nullish(),
  Address3: z.string().nullish(),
  StreetNo: z.string().nullish(),
  BuildingFloorRoom: z.string().nullish(),
  Block: z.string().nullish(),
  City: z.string().nullish(),
  ZipCode: z.string().nullish(),
  County: z.string().nullish(),
  CountryCode: z.string().nullish(),
  CountryName: z.string().nullish(),
  StateCode: z.string().nullish(),
  StateName: z.string().nullish(),
  GlobalLocationNumber: z.string().nullish(),
})

export const whBinLocationFormSchema = z.object({
  code: z.coerce.number(),
  WarehouseCode: z.coerce.string(),
  Description: z.string().nullish(),
  BinCode: z.string().min(1, { message: 'BinCode is required' }),
  SL1Code: z.string().min(1, { message: 'Area is required' }),
  SL2Code: z.string().nullish(),
  SL3Code: z.string().nullish(),
  SL4Code: z.string().nullish(),
})

export const syncToSapFormSchema = z.object({
  warehouses: z.array(
    z.object({
      code: z.coerce.number(),
      WarehouseCode: z.string().nullish(),
      WarehouseName: z.string().nullish(),
      Nettable: z.boolean().nullish(),
      EnableBinLocations: z.boolean().nullish(),
      Street: z.string().nullish(),
      Address2: z.string().nullish(),
      Address3: z.string().nullish(),
      StreetNo: z.string().nullish(),
      BuildingFloorRoom: z.string().nullish(),
      Block: z.string().nullish(),
      City: z.string().nullish(),
      ZipCode: z.string().nullish(),
      County: z.string().nullish(),
      CountryCode: z.string().nullish(),
      CountryName: z.string().nullish(),
      StateCode: z.string().nullish(),
      StateName: z.string().nullish(),
      GlobalLocationNumber: z.string().nullish(),
    })
  ),
})

export type WarehouseForm = z.infer<typeof warehouseFormSchema>
export type BinLocationForm = z.infer<typeof whBinLocationFormSchema>
export type SyncToSapForm = z.infer<typeof syncToSapFormSchema>
