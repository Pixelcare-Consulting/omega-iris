'use client'

import DataGrid, { Column, FilterRow, Pager, Paging } from 'devextreme-react/data-grid'
import ArrayStore from 'devextreme/data/array_store'
import { Button } from 'devextreme-react/button'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import TextBoxField from '@/components/forms/text-box-field'
import NumberBoxField from '@/components/forms/number-box-field'
import DateBoxField from '@/components/forms/date-box-field'
import DateRangeBoxField from '@/components/forms/date-range-box-field'
import TextAreaField from '@/components/forms/text-area-field'
import SelectBoxField from '@/components/forms/select-box-field'
import TagBoxField from '@/components/forms/tag-box-field'
import SwitchField from '@/components/forms/switch-field'

const SAMPLE_DATA1 = [
  {
    ID: 1,
    CompanyName: 'Super Mart of the West',
    Address: '702 SW 8th Street',
    City: 'Bentonville',
    State: 'Arkansas',
    Zipcode: 72716,
    Phone: '(800) 555-2797',
    Fax: '(800) 555-2171',
  },
  {
    ID: 2,
    CompanyName: 'Electronics Depot',
    Address: '2455 Paces Ferry Road NW',
    City: 'Atlanta',
    State: 'Georgia',
    Zipcode: 30339,
    Phone: '(800) 595-3232',
    Fax: '(800) 595-3231',
  },
  {
    ID: 3,
    CompanyName: 'K&S Music',
    Address: '1000 Nicllet Mall',
    City: 'Minneapolis',
    State: 'Minnesota',
    Zipcode: 55403,
    Phone: '(612) 304-6073',
    Fax: '(612) 304-6074',
  },
  {
    ID: 4,
    CompanyName: "Tom's Club",
    Address: '999 Lake Drive',
    City: 'Issaquah',
    State: 'Washington',
    Zipcode: 98027,
    Phone: '(800) 955-2292',
    Fax: '(800) 955-2293',
  },
  {
    ID: 5,
    CompanyName: 'E-Mart',
    Address: '3333 Beverly Rd',
    City: 'Hoffman Estates',
    State: 'Illinois',
    Zipcode: 60179,
    Phone: '(847) 286-2500',
    Fax: '(847) 286-2501',
  },
  {
    ID: 6,
    CompanyName: 'Walters',
    Address: '200 Wilmot Rd',
    City: 'Deerfield',
    State: 'Illinois',
    Zipcode: 60015,
    Phone: '(847) 940-2500',
    Fax: '(847) 940-2501',
  },
  {
    ID: 7,
    CompanyName: 'StereoShack',
    Address: '400 Commerce S',
    City: 'Fort Worth',
    State: 'Texas',
    Zipcode: 76102,
    Phone: '(817) 820-0741',
    Fax: '(817) 820-0742',
  },
  {
    ID: 8,
    CompanyName: 'Circuit Town',
    Address: '2200 Kensington Court',
    City: 'Oak Brook',
    State: 'Illinois',
    Zipcode: 60523,
    Phone: '(800) 955-2929',
    Fax: '(800) 955-9392',
  },
  {
    ID: 9,
    CompanyName: 'Premier Buy',
    Address: '7601 Penn Avenue South',
    City: 'Richfield',
    State: 'Minnesota',
    Zipcode: 55423,
    Phone: '(612) 291-1000',
    Fax: '(612) 291-2001',
  },
  {
    ID: 10,
    CompanyName: 'ElectrixMax',
    Address: '263 Shuman Blvd',
    City: 'Naperville',
    State: 'Illinois',
    Zipcode: 60563,
    Phone: '(630) 438-7800',
    Fax: '(630) 438-7801',
  },
  {
    ID: 11,
    CompanyName: 'Video Emporium',
    Address: '1201 Elm Street',
    City: 'Dallas',
    State: 'Texas',
    Zipcode: 75270,
    Phone: '(214) 854-3000',
    Fax: '(214) 854-3001',
  },
  {
    ID: 12,
    CompanyName: 'Screen Shop',
    Address: '1000 Lowes Blvd',
    City: 'Mooresville',
    State: 'North Carolina',
    Zipcode: 28117,
    Phone: '(800) 445-6937',
    Fax: '(800) 445-6938',
  },
]

const SAMPLE_DATA2 = [
  { id: '1', itemCode: 'ITEM1', itemName: 'Item 1', itemDescription: 'Description 1', unitPrice: 100, quantity: 1 },
  { id: '2', itemCode: 'ITEM2', itemName: 'Item 2', itemDescription: 'Description 2', unitPrice: 200, quantity: 2 },
  { id: '3', itemCode: 'ITEM3', itemName: 'Item 3', itemDescription: 'Description 3', unitPrice: 300, quantity: 3 },
  { id: '4', itemCode: 'ITEM4', itemName: 'Item 4', itemDescription: 'Description 4', unitPrice: 400, quantity: 4 },
  { id: '5', itemCode: 'ITEM5', itemName: 'Item 5', itemDescription: 'Description 5', unitPrice: 500, quantity: 5 },
  { id: '6', itemCode: 'ITEM6', itemName: 'Item 6', itemDescription: 'Description 6', unitPrice: 600, quantity: 6 },
  { id: '7', itemCode: 'ITEM7', itemName: 'Item 7', itemDescription: 'Description 7', unitPrice: 700, quantity: 7 },
  { id: '8', itemCode: 'ITEM8', itemName: 'Item 8', itemDescription: 'Description 8', unitPrice: 800, quantity: 8 },
  { id: '9', itemCode: 'ITEM9', itemName: 'Item 9', itemDescription: 'Description 9', unitPrice: 900, quantity: 9 },
  { id: '10', itemCode: 'ITEM10', itemName: 'Item 10', itemDescription: 'Description 10', unitPrice: 1000, quantity: 10 },
]

const SAMPLE_DATA3 = [
  { id: '1', name: 'React.js', value: 'react', url: 'https://reactjs.org/' },
  { id: '2', name: 'Angular.js', value: 'angular', url: 'https://angular.io/' },
  { id: '3', name: 'Vue.js', value: 'vue', url: 'https://vuejs.org/' },
  { id: '4', name: 'Svelte.js', value: 'svelte', url: 'https://svelte.dev/' },
  { id: '5', name: 'Ember.js', value: 'ember', url: 'https://emberjs.com/' },
  { id: '6', name: 'Meteor.js', value: 'meteor', url: 'https://meteor.com/' },
  { id: '7', name: 'Node.js', value: 'node', url: 'https://nodejs.org/en/' },
  { id: '8', name: 'Express.js', value: 'express', url: 'https://expressjs.com/' },
  { id: '9', name: 'Koa.js', value: 'koa', url: 'https://koajs.com/' },
  { id: '10', name: 'Sails.js', value: 'sails', url: 'https://sailsjs.com/' },
]

const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_COLUMNS = ['CompanyName', 'City', 'State', 'Phone', 'Fax']

const exampleFormSchema = z.object({
  name: z.string().min(1, { message: 'Please enter a name' }),
  age: z.coerce.number().min(1, { message: 'Please enter an age' }).optional(),
  email: z.string().min(1, { message: 'Please enter an email' }).email({ message: 'Please enter a valid email' }),
  d1: z.date({ message: 'Please enter a valid date' }),
  dr1: z.array(z.date({ message: 'Please enter a valid date' })),
  body1: z.string().min(1, { message: 'Please enter a body 1' }),
  body2: z.string().min(1, { message: 'Please enter a body 2' }),
  item1: z.string().min(1, { message: 'Please select an item 1' }),
  item2: z.string().min(1, { message: 'Please select an item 2' }),
  fameworks: z.array(z.string()).min(1, { message: 'Please select at least one framework' }),
  isActive: z.boolean().default(true),
})

export default function DevExtremeExamplePage() {
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      age: 0,
      d1: undefined,
      dr1: [undefined, undefined],
      body1: '',
      body2: '',
      item1: '',
      item2: '',
      fameworks: [],
      isActive: true,
    },
    resolver: zodResolver(exampleFormSchema),
  })

  const handleSubmit = (data: any) => {
    console.log(data)
  }

  useEffect(() => {
    //* simulate loading
    setIsLoading(true)

    //* simulate delay
    setTimeout(() => {
      setIsLoading(false)
    }, 5000)
  }, [])

  return (
    <div className='p-10'>
      <div className='mb-10'>
        <div className='text-center text-5xl font-bold'>DevExtreme</div>
        <p className='text-muted-foreground text-center text-xs'>
          DevExtreme UI components implementation example and form component implementation using react-hook-form and zod.
        </p>
      </div>

      <div className='mb-5 space-y-2'>
        <h2 className='mb-2 flex items-center justify-center gap-3 text-5xl font-bold'>
          <span>DataGrid</span>
          <Button text='Contained' type='default' stylingMode='contained' onClick={() => setShowFilterRow(!showFilterRow)} />
        </h2>

        <div className='mx-auto w-[1080px]'>
          <DataGrid dataSource={SAMPLE_DATA1} keyExpr='ID' defaultColumns={DEFAULT_COLUMNS} showBorders>
            <FilterRow visible={showFilterRow} />

            <Column dataField='CompanyName' />
            <Column dataField='City' />
            <Column dataField='State' />
            <Column dataField='Phone' />
            <Column dataField='Fax' />

            <Pager visible={true} allowedPageSizes={PAGE_SIZES} showPageSizeSelector={true} />
            <Paging defaultPageSize={10} />
          </DataGrid>
        </div>
      </div>

      <div className='mb-5 space-y-2'>
        <h2 className='mb-2 flex items-center justify-center gap-3 text-5xl font-bold'>Form</h2>

        <FormProvider {...form}>
          <form className='mx-auto grid w-[1080px] grid-cols-12 gap-5' onSubmit={form.handleSubmit(handleSubmit)}>
            <div className='col-span-12 mb-5 p-4'>
              <pre>{JSON.stringify(form.watch(), null, 2)}</pre>
            </div>

            <div className='col-span-12 mb-5 p-4'>
              <pre>{JSON.stringify(form.formState.errors, null, 2)}</pre>
            </div>

            <h1 className='col-span-12 text-lg font-bold'>TextBox</h1>

            <div className='col-span-12'>
              <TextBoxField control={form.control} name='name' label='Name' isRequired />
            </div>

            <div className='col-span-12'>
              <TextBoxField control={form.control} name='email' label='Email' isRequired />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>NumberBox</h1>

            <div className='col-span-12'>
              <NumberBoxField control={form.control} name='age' label='Age' isRequired />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>DateBox</h1>

            <div className='col-span-12'>
              <DateBoxField control={form.control} name='d1' type='date' label='Date' isRequired />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>DateRangeBox</h1>

            <div className='col-span-12'>
              <DateRangeBoxField control={form.control} name='dr1' label='Date Range' isRequired />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>Textbox</h1>

            <div className='col-span-12'>
              <TextAreaField control={form.control} name='body1' label='Body 1' isRequired />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>Textbox Auto Resize</h1>

            <div className='col-span-12'>
              <TextAreaField control={form.control} name='body2' label='Body 2' isAutoResize isRequired />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>Selectbox w/ Data</h1>

            <div className='col-span-12'>
              <SelectBoxField
                data={SAMPLE_DATA2}
                isLoading={isLoading}
                control={form.control}
                name='item1'
                label='Item 1'
                valueExpr='id'
                // displayExpr='itemName' //* string displayExpr
                displayExpr={(item) => (item ? `${item?.itemName} (${item?.itemCode})` : '')} //* function displayExpr
                searchExpr={['itemName', 'itemCode']}
                isRequired
              />
            </div>

            <div className='col-span-12'>
              <SelectBoxField
                data={SAMPLE_DATA2}
                isLoading={isLoading}
                control={form.control}
                name='item2'
                label='Item 2'
                valueExpr='id'
                displayExpr='itemName'
                searchExpr='itemName'
                isRequired
                extendedProps={{
                  selectBoxOptions: {
                    itemRender: (params) => {
                      return (
                        <div className='flex flex-col'>
                          <div className='text-sm font-bold'>{params?.itemName}</div>
                          <div className='text-xs text-slate-400'>{params?.itemCode}</div>
                        </div>
                      )
                    },
                  },
                }}
              />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>Tagbox w/ Data</h1>

            <div className='col-span-12'>
              <TagBoxField
                data={SAMPLE_DATA3}
                isLoading={isLoading}
                control={form.control}
                name='fameworks'
                label='Frameworks'
                valueExpr='id'
                // displayExpr='name' //* string displayExpr
                displayExpr={(item) => (item ? `${item?.name} (${item?.value})` : '')} //* function displayExpr
                searchExpr={['name', 'value']}
                isRequired
              />
            </div>

            <h1 className='col-span-12 text-lg font-bold'>Switch</h1>

            <div className='col-span-12'>
              <SwitchField control={form.control} name='isActive' label='Is Active' isRequired description='Is this user active?' />
            </div>

            <div className='col-span-12'>
              <SwitchField
                control={form.control}
                name='isActive'
                label='Is Active'
                layout='centered'
                isRequired
                description='Is this user active?'
              />
            </div>

            <div className='col-span-12'>
              <SwitchField
                control={form.control}
                name='isActive'
                label='Is Active'
                layout='wide'
                isRequired
                description='Is this user active?'
              />
            </div>

            <div className='col-span-12 flex justify-end'>
              <Button className='mt-3' text='Contained' type='default' stylingMode='contained' useSubmitBehavior>
                Submit
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}
